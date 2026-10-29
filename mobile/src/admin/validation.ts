import type {PointsSettings} from '../api/types';

export type Checked<T> = {ok: true; value: T} | {ok: false; message: string};

/** Points adjustment typed by an admin: a whole number, not zero, e.g. `50` or `-20`. */
export function parseAdjustment(raw: string): Checked<number> {
  const text = raw.trim().replace(/^\+/, '');
  if (!/^-?\d+$/.test(text)) {
    return {ok: false, message: 'Enter a whole number, like 50 or -20.'};
  }
  const n = Number(text);
  if (n === 0) {
    return {ok: false, message: 'Enter a number other than 0.'};
  }
  if (Math.abs(n) > 100000) {
    return {ok: false, message: 'That is too many points for one adjustment.'};
  }
  return {ok: true, value: n};
}

/** `Add 50 points to Ramesh?` / `Remove 20 points from Ramesh?` */
export function adjustmentQuestion(delta: number, who: string): string {
  const n = Math.abs(delta);
  const points = `${n} point${n === 1 ? '' : 's'}`;
  return delta > 0 ? `Add ${points} to ${who}?` : `Remove ${points} from ${who}?`;
}

export function digits4(text: string): string {
  return text.replace(/\D/g, '').slice(0, 4);
}

type StaffForm = {username: string; pin: string; isNew: boolean};

export function validateStaff({username, pin, isNew}: StaffForm): string | null {
  if (!username.trim()) {
    return 'Enter a username.';
  }
  if (/\s/.test(username.trim())) {
    return 'The username cannot have spaces.';
  }
  if (isNew && pin.length !== 4) {
    return 'Enter a 4-digit PIN.';
  }
  if (!isNew && pin && pin.length !== 4) {
    return 'The new PIN must be exactly 4 digits, or leave it blank to keep the old one.';
  }
  return null;
}

type RewardForm = {title: string; cost: string; stock: string};

/** Reward typed by an admin. Blank stock means unlimited. */
export function validateReward({title, cost, stock}: RewardForm): Checked<{title: string; points_cost: number; stock: number | null}> {
  if (title.trim().length < 2) {
    return {ok: false, message: 'Enter the reward name.'};
  }
  const points = Number(cost);
  if (!Number.isInteger(points) || points < 1) {
    return {ok: false, message: 'The cost must be a whole number of points, 1 or more.'};
  }
  const stockText = stock.trim();
  if (stockText !== '' && !/^\d+$/.test(stockText)) {
    return {ok: false, message: 'Stock must be a whole number, or blank for unlimited.'};
  }
  return {ok: true, value: {title: title.trim(), points_cost: points, stock: stockText === '' ? null : Number(stockText)}};
}

export type SettingsForm ={earnPoints: string; earnUnit: string; redeemRate: string; minRedeem: string; instantRedeem: boolean};

export function settingsToForm(s: PointsSettings): SettingsForm {
  return {
    earnPoints: String(s.earn_points_per_rupees),
    earnUnit: String(s.earn_rupees_unit),
    redeemRate: s.redeem_rate != null ? String(s.redeem_rate) : '',
    minRedeem: String(s.min_redeem_points ?? 10),
    instantRedeem: s.instant_redeem ?? true,
  };
}

export function validateSettings(f: SettingsForm): Checked<Partial<PointsSettings>> {
  const earnPoints = Number(f.earnPoints);
  const earnUnit = Number(f.earnUnit);
  if (!Number.isInteger(earnPoints) || earnPoints < 1) {
    return {ok: false, message: 'Points earned must be a whole number, 1 or more.'};
  }
  if (!Number.isInteger(earnUnit) || earnUnit < 1) {
    return {ok: false, message: 'The rupee amount for earning must be a whole number, 1 or more.'};
  }
  const rateText = f.redeemRate.trim();
  if (rateText !== '' && !(Number(rateText) > 0)) {
    return {ok: false, message: 'The redeem rate must be more than 0, or blank to switch redeeming off.'};
  }
  const minRedeem = Number(f.minRedeem) || 0;
  if (rateText !== '' && minRedeem < 1) {
    return {ok: false, message: 'Set a minimum of at least 1 point while redeeming is on.'};
  }
  return {
    ok: true,
    value: {
      earn_points_per_rupees: earnPoints,
      earn_rupees_unit: earnUnit,
      min_redeem_points: minRedeem || 10,
      redeem_rate: rateText === '' ? null : rateText,
      instant_redeem: f.instantRedeem,
    },
  };
}

export function settingsExample(f: SettingsForm): string {
  const per = Number(f.earnPoints) || 1;
  return `Example: ${per} point${per === 1 ? '' : 's'} for every ₹${Number(f.earnUnit) || 100}`;
}
