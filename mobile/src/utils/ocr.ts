import {Platform} from 'react-native';

/**
 * Extract a likely Indian vehicle plate from OCR text.
 * Supports formats like KL 07 AB 1234, MH12DE1433, etc.
 */
export function extractPlateFromText(raw: string): string | null {
  if (!raw) return null;
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9\n ]/g, ' ');
  const compactLines = cleaned
    .split(/\n+/)
    .map(l => l.replace(/\s+/g, ''))
    .filter(Boolean);

  const patterns = [
    /[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{3,4}/,
    /[A-Z]{2}\d{2}[A-Z]{2}\d{4}/,
  ];

  for (const line of compactLines) {
    for (const p of patterns) {
      const m = line.match(p);
      if (m) return m[0];
    }
  }

  const joined = compactLines.join('');
  for (const p of patterns) {
    const m = joined.match(p);
    if (m) return m[0];
  }
  return null;
}

export function normalizePlate(plate: string): string {
  return plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

/** ML Kit on Android needs a proper file/content URI. */
export function normalizeImageUri(uri: string): string {
  if (!uri) return uri;
  if (Platform.OS === 'android') {
    if (uri.startsWith('file://') || uri.startsWith('content://')) return uri;
    if (uri.startsWith('/')) return `file://${uri}`;
  }
  return uri;
}

async function recognizeText(uri: string): Promise<string> {
  const imageURL = normalizeImageUri(uri);
  try {
    // Lazy require so the app still boots if native module isn't linked yet.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const TextRecognition = require('@react-native-ml-kit/text-recognition').default;
    const result = await TextRecognition.recognize(imageURL);
    return result?.text ?? '';
  } catch (e) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('OCR recognize failed', e);
    }
    return '';
  }
}

export async function recognizePlateFromImage(
  uri: string,
): Promise<{text: string; plate: string | null}> {
  const text = await recognizeText(uri);
  return {text, plate: extractPlateFromText(text)};
}

const MONTH =
  /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/i;
const TIME = /\b\d{1,2}:\d{2}\s*(am|pm)?\b/i;
const PHONEISH = /(\+91|••••|phone|mobile)/i;
const BANKISH = /\b(bank|a\/c|account|xxxx|\d{4}\b)/i;

/**
 * Pull a payment amount from GPay / PhonePe / UPI / card success screens.
 * Handles photo-of-screen OCR quirks: ₹ often becomes *, ¥, R$, or is dropped,
 * and the amount is usually on its own line above "Completed".
 */
export function extractAmountFromText(raw: string): string | null {
  if (!raw) return null;

  // Normalize currency glyphs OCR commonly invents for ₹
  const text = raw
    .replace(/\u20B9/g, '₹')
    .replace(/₹/g, ' INR ')
    .replace(/[*¥€£]+\s*(?=\d)/g, ' INR ')
    .replace(/\bR\s*[Ss$]\.?\s*(?=\d)/g, ' INR ')
    .replace(/\bINR\b/gi, 'INR');

  const lowerAll = text.toLowerCase();
  const isPaymentReceipt =
    /(paid|payment|amount|total|sent|debited|successful|success|received|completed|pay again|upi|gpay|google pay|phonepe|paytm|bhim|transaction)/i.test(
      lowerAll,
    );

  type Candidate = {value: number; score: number};
  const candidates: Candidate[] = [];

  const push = (numStr: string, score: number) => {
    const cleaned = String(numStr).replace(/,/g, '');
    const value = Number(cleaned);
    if (!Number.isFinite(value) || value < 1 || value > 100000) return;
    candidates.push({value, score});
  };

  const amountToken =
    '([0-9]{1,3}(?:,[0-9]{3})+(?:\\.[0-9]{1,2})?|[0-9]+(?:\\.[0-9]{1,2})?)';
  const currencyBefore = new RegExp(`(?:INR)\\s*${amountToken}`, 'gi');
  const currencyAfter = new RegExp(`${amountToken}\\s*(?:INR)`, 'gi');
  const bareAmount = new RegExp(`^\\s*${amountToken}\\s*$`);

  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();
    const prev = (lines[i - 1] || '').toLowerCase();
    const next = (lines[i + 1] || '').toLowerCase();
    const nearby = `${prev} ${lower} ${next}`;

    let lineScore = 0;
    if (
      /(paid|payment|amount|total|sent|debited|successful|success|received|completed)/.test(
        lower,
      )
    ) {
      lineScore += 8;
    }
    if (/inr/i.test(line)) lineScore += 5;
    if (/(gpay|google pay|phonepe|paytm|upi|bhim)/i.test(lower)) lineScore += 2;
    if (/(card|debit|credit|visa|mastercard|rupay)/i.test(lower)) lineScore += 2;
    // Amount sits alone above "Completed" / "Pay again" on GPay
    if (/(completed|paid|successful|pay again)/i.test(next)) lineScore += 10;
    if (/(completed|paid|successful)/i.test(prev)) lineScore += 4;
    if (isPaymentReceipt && bareAmount.test(line)) lineScore += 9;

    // Demote date / phone / bank-tail lines
    if (MONTH.test(line) || TIME.test(line)) lineScore -= 12;
    if (PHONEISH.test(nearby) && !/inr/i.test(line)) lineScore -= 8;
    if (BANKISH.test(nearby) && bareAmount.test(line) && Number(line.replace(/,/g, '')) < 10000) {
      // last-4 of card/account often 4 digits — demote small bare numbers near Bank
      if (/^\d{4}$/.test(line.replace(/,/g, ''))) lineScore -= 10;
    }

    for (const m of line.matchAll(new RegExp(currencyBefore.source, 'gi'))) {
      push(m[1], lineScore + 12);
    }
    for (const m of line.matchAll(new RegExp(currencyAfter.source, 'gi'))) {
      push(m[1], lineScore + 12);
    }

    // Bare / mostly-numeric lines on receipts (₹ misread → just "300")
    if (isPaymentReceipt || lineScore >= 8) {
      const alone = line.match(bareAmount);
      if (alone) {
        push(alone[1], Math.max(lineScore, isPaymentReceipt ? 10 : 0) + 3);
      } else {
        for (const m of line.matchAll(new RegExp(`\\b${amountToken}\\b`, 'g'))) {
          push(m[1], lineScore + 2);
        }
      }
    }
  }

  // Whole-document currency fallback
  for (const m of text.matchAll(new RegExp(currencyBefore.source, 'gi'))) {
    push(m[1], 7);
  }

  if (!candidates.length) return null;

  // Prefer typical petrol fill amounts when scores tie
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aTypical = a.value >= 50 && a.value <= 20000 ? 1 : 0;
    const bTypical = b.value >= 50 && b.value <= 20000 ? 1 : 0;
    if (bTypical !== aTypical) return bTypical - aTypical;
    return b.value - a.value;
  });

  const best = candidates[0];
  if (best.score < 5 && !isPaymentReceipt) return null;

  return Number.isInteger(best.value)
    ? String(best.value)
    : best.value.toFixed(2).replace(/\.00$/, '');
}

export function detectPaymentModeFromText(
  raw: string,
): 'UPI' | 'CARD' | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (/(gpay|google pay|phonepe|paytm|upi|bhim|qr|pay again|federal bank|completed)/i.test(lower)) {
    // GPay success screens often say Completed + bank, without the word UPI
    if (/(visa|mastercard|rupay|debit card|credit card|\bpos\b)/i.test(lower)) {
      return 'CARD';
    }
    return 'UPI';
  }
  if (/(visa|mastercard|rupay|debit card|credit card|\bcard\b|pos)/i.test(lower)) {
    return 'CARD';
  }
  return null;
}

export async function recognizePaymentFromImage(uri: string): Promise<{
  text: string;
  amount: string | null;
  paymentMode: 'UPI' | 'CARD' | null;
}> {
  const text = await recognizeText(uri);
  if (__DEV__ && text) {
    // eslint-disable-next-line no-console
    console.log('Payment OCR text:', text);
  }
  return {
    text,
    amount: extractAmountFromText(text),
    paymentMode: detectPaymentModeFromText(text),
  };
}
