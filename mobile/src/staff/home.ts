import type {Transaction} from '../api/types';

/** `Ramesh Kumar` becomes `Ramesh K.`; falls back to the username, then "Staff". */
export function displayStaffName(name?: string, username?: string | null): string {
  const raw = (name || '').trim();
  if (raw) {
    const parts = raw.split(/\s+/);
    return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[1][0]}.`;
  }
  return (username || '').trim() || 'Staff';
}

export function greeting(hour: number): string {
  if (hour < 12) {
    return 'Good morning';
  }
  return hour < 17 ? 'Good afternoon' : 'Good evening';
}

export function isSameDay(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  );
}

export function todayStats(recent: Pick<Transaction, 'amount' | 'created_at'>[], now: Date = new Date()) {
  const todays = recent.filter(t => isSameDay(t.created_at, now));
  return {count: todays.length, total: todays.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)};
}

export type SyncBanner =
  | {kind: 'none'}
  | {kind: 'offline'; waiting: number}
  | {kind: 'waiting'; waiting: number};

/**
 * What the home screen should say about connectivity. "Offline" is shown even
 * when nothing is waiting, so staff know a fill will be stored on the phone.
 */
export function syncBanner(offline: boolean, waiting: number): SyncBanner {
  if (offline) {
    return {kind: 'offline', waiting};
  }
  return waiting > 0 ? {kind: 'waiting', waiting} : {kind: 'none'};
}
