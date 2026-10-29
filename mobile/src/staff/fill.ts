import type {PointsSettings} from '../api/types';
import {describeError} from '../utils/errors';
import {formatInr, tenDigits} from '../utils/format';
import {normalizePlate} from '../utils/ocr';

export type PaymentMode = 'CASH' | 'UPI' | 'CARD';

/** Cash is the default: most fills are cash and it needs no photo. */
export const DEFAULT_PAYMENT_MODE: PaymentMode = 'CASH';
export const AMOUNT_CHIPS = [100, 200, 500, 1000, 1500, 2000];
export const MAX_AMOUNT = 100000;

/** A proof photo makes sense only for a digital payment. */
export const proofAllowed = (mode: PaymentMode) => mode !== 'CASH';

export type RedeemState = {
  /** Staff may switch redeem on. */
  available: boolean;
  /** Points that will be used (0 unless redeem is on and available). */
  points: number;
  /** Most points that could be used on this amount (0 when redeem is not possible). */
  maxPoints: number;
  /** Rupees those points are worth. */
  maxDiscount: number;
  /** Rupees taken off. */
  discount: number;
  /** What the customer actually pays. */
  payable: number;
};

export type FillTotals = RedeemState & {
  amount: number;
  /** Points the customer will earn. */
  earn: number;
  /** Of those, how many can already be used on this fill (instant redeem). */
  earnUsable: number;
};

type Inputs = {
  amount: string;
  pointsBalance: number;
  settings: PointsSettings | null;
  redeem: boolean;
};

/**
 * The server earns points on the full amount before any redemption
 * (transactions/views.py calls calculate_earn_points(amount)), so the preview
 * does the same; otherwise it would promise fewer points than the customer gets.
 * With instant redeem on (the default) those points can be used on this same
 * fill, so they count towards redeem.
 */
export function computeTotals({amount, pointsBalance, settings, redeem}: Inputs): FillTotals {
  const amountNum = Math.max(0, Number(amount) || 0);
  const rate = settings?.redeem_rate ? Number(settings.redeem_rate) : 0;
  const minRedeem = settings?.min_redeem_points ?? 10;

  const unit = Math.max(settings?.earn_rupees_unit || 100, 1);
  const per = settings?.earn_points_per_rupees || 1;
  const earn = Math.floor(amountNum / unit) * per;
  const earnUsable = settings?.instant_redeem === false ? 0 : earn;
  const usable = pointsBalance + earnUsable;

  const eligible = rate > 0 && usable >= minRedeem;
  const maxPoints = eligible ? Math.min(usable, Math.floor(amountNum / rate)) : 0;
  const available = eligible && amountNum > 0 && maxPoints >= minRedeem;
  const points = redeem && available ? maxPoints : 0;
  const discount = points * rate;

  return {
    amount: amountNum,
    available,
    maxPoints: available ? maxPoints : 0,
    maxDiscount: available ? maxPoints * rate : 0,
    points,
    discount,
    payable: Math.max(0, amountNum - discount),
    earn,
    earnUsable,
  };
}

/** Under the Use points toggle, e.g. `8 + 2 from this fill · 10 points = ₹10 off this fill`. */
export function redeemDescription(pointsBalance: number, t: FillTotals): string {
  const off = `${t.maxPoints} points = ${formatInr(t.maxDiscount)} off this fill`;
  return t.earnUsable > 0 ? `${pointsBalance} + ${t.earnUsable} from this fill · ${off}` : off;
}

export type FillForm = {
  plate: string;
  amount: string;
  /** Needed only when the plate is not registered yet. */
  phone?: string;
  isNewVehicle: boolean;
};

/** First problem in plain words, or null when the form can be saved. */
export function validateFill(f: FillForm): string | null {
  if (normalizePlate(f.plate).length < 4) {
    return 'Enter the vehicle plate number.';
  }
  const amount = Number(f.amount);
  if (!f.amount || !Number.isFinite(amount) || amount <= 0) {
    return 'Enter the amount.';
  }
  if (amount > MAX_AMOUNT) {
    return `Amount looks too large. The limit is ₹${MAX_AMOUNT.toLocaleString('en-IN')}.`;
  }
  if (f.isNewVehicle && tenDigits(f.phone).length !== 10) {
    return 'This is a new vehicle. Enter the customer’s 10-digit mobile number.';
  }
  return null;
}

/** Text for the big Save button, e.g. `SAVE ₹500 CASH`. */
export function saveLabel(amount: string, mode: PaymentMode): string {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) {
    return 'ENTER AMOUNT';
  }
  return `SAVE ₹${n.toLocaleString('en-IN')} ${mode}`;
}

/** Message for a failed save. Staff keep everything they typed. */
export function saveErrorMessage(e: unknown): string {
  return describeError(e).message;
}
