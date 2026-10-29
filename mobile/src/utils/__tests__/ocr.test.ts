import {
  detectPaymentModeFromText,
  extractAmountFromText,
  extractPlateFromText,
  normalizePlate,
} from '../ocr';

describe('plate OCR helpers', () => {
  it('normalizes plates', () => {
    expect(normalizePlate('kl 07 ab 1234')).toBe('KL07AB1234');
  });

  it('extracts Indian plate from OCR text', () => {
    expect(extractPlateFromText('KL 07 AB 1234\nPETROL')).toBe('KL07AB1234');
    expect(extractPlateFromText('MH12DE1433')).toBe('MH12DE1433');
  });
});

describe('payment amount OCR helpers', () => {
  it('extracts GPay-style paid amount', () => {
    expect(
      extractAmountFromText('Payment successful\nPaid ₹500.00\nto Petrol Pump'),
    ).toBe('500');
  });

  it('extracts PhonePe / comma amount', () => {
    expect(extractAmountFromText('Successful\n₹2,000\nUPI')).toBe('2000');
  });

  it('extracts card amount label', () => {
    expect(
      extractAmountFromText('Transaction Approved\nAmount: Rs 1250.00\nVISA'),
    ).toBe('1250');
  });

  it('reads GPay photo-of-screen layout (amount above Completed)', () => {
    const text = [
      'To musfira shirin29',
      '+91 ••••• •5208',
      '₹300',
      'Completed',
      '28 Sept 2026, 1:04 pm',
      'Pay again',
      'Federal Bank 8172',
    ].join('\n');
    expect(extractAmountFromText(text)).toBe('300');
  });

  it('reads amount when ₹ glyph is lost and only 300 remains', () => {
    const text = [
      'To musfira shirin29',
      '300',
      'Completed',
      '28 Sept 2026, 1:04 pm',
      'Pay again',
      'Federal Bank 8172',
    ].join('\n');
    expect(extractAmountFromText(text)).toBe('300');
  });

  it('reads amount when ₹ is misread as *', () => {
    expect(extractAmountFromText('To user\n*300\nCompleted\nPay again')).toBe(
      '300',
    );
  });

  it('detects payment mode hints', () => {
    expect(detectPaymentModeFromText('Paid via GPay UPI')).toBe('UPI');
    expect(detectPaymentModeFromText('Visa debit card approved')).toBe('CARD');
    expect(
      detectPaymentModeFromText('Completed\nPay again\nFederal Bank 8172'),
    ).toBe('UPI');
  });
});
