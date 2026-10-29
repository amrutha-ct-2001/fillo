/** Words for the Saved screen. Never promises points that have not been added yet. */
export function savedHeadline(offline: boolean): string {
  return offline ? 'Saved on this phone' : 'Fill saved';
}

export function savedPointsLine(offline: boolean, pointsEarned: number, balance: number, pointsUsed = 0): string {
  if (offline) {
    return 'Points will be added after sync';
  }
  const earned = pointsEarned > 0 ? `+${pointsEarned} points earned` : 'No points earned on this fill';
  const used = pointsUsed > 0 ? ` · ${pointsUsed} points used` : '';
  return `${earned}${used} · balance ${balance}`;
}

export function savedOfflineNote(): string {
  return 'No signal. This fill is stored safely and will upload by itself when the phone is online.';
}
