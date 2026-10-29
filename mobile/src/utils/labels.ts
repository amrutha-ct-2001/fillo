import type {LedgerEntry, Role, Transaction, Vehicle, VoucherStatus} from '../api/types';
import type {BadgeTone} from '../ui/Badge';

/** Friendly names for internal values. Never show the raw enum to a user. */
const ROLE: Record<Role, string> = {ADMIN: 'Admin', STAFF: 'Pump staff', CUSTOMER: 'Customer'};
const PAYMENT: Record<Transaction['payment_mode'], string> = {CASH: 'Cash', UPI: 'UPI', CARD: 'Card'};
const VEHICLE: Record<Vehicle['vehicle_type'], string> = {BIKE: 'Bike', CAR: 'Car', OTHER: 'Other'};
const LEDGER: Record<LedgerEntry['type'], string> = {
  EARN: 'Points earned',
  REDEEM: 'Points used',
  ADJUST: 'Points adjusted',
};

function pick<T extends string>(map: Record<T, string>, key: string | null | undefined): string {
  return (key && (map as Record<string, string>)[key]) || (key ? key.charAt(0) + key.slice(1).toLowerCase() : '');
}

export const roleLabel = (r: string | null | undefined) => pick(ROLE, r);
export const paymentLabel = (m: string | null | undefined) => pick(PAYMENT, m);
export const vehicleTypeLabel = (t: string | null | undefined) => pick(VEHICLE, t);
export const ledgerLabel = (t: string | null | undefined) => pick(LEDGER, t);

const VOUCHER: Record<VoucherStatus, {label: string; tone: BadgeTone}> = {
  PENDING: {label: 'Ready to use', tone: 'warning'},
  USED: {label: 'Used', tone: 'success'},
  CANCELLED: {label: 'Cancelled', tone: 'danger'},
};

export const voucherStatus = (s: VoucherStatus) => VOUCHER[s] ?? {label: pick({}, s), tone: 'neutral' as const};

/** "Unlimited" or "12 left" for a reward's stock. */
export const stockLabel = (stock: number | null | undefined) =>
  stock === null || stock === undefined ? 'Unlimited' : stock === 0 ? 'Out of stock' : `${stock} left`;

/** Tail for a fill row's subtitle, e.g. ` · 10 pts used`; empty when no points were used. */
export const pointsUsedSuffix = (points: number | null | undefined) => (points ? ` · ${points} pts used` : '');
