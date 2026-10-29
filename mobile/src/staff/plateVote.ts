/**
 * Live reading produces a noisy plate every frame ("KL07AB1234", "KL07A81234",
 * ...). A plate is accepted only after the same text is seen enough times
 * inside a short window, so one bad frame never fills the screen.
 */
export type Vote = {plate: string; at: number};

export type VoteOptions = {
  /** How many matching reads are needed. */
  needed?: number;
  /** Reads older than this (ms) are forgotten. */
  windowMs?: number;
};

export type VoteResult = {
  votes: Vote[];
  /** The agreed plate, once it has enough votes. */
  winner: string | null;
};

export function addVote(
  votes: Vote[],
  plate: string,
  at: number,
  {needed = 2, windowMs = 2500}: VoteOptions = {},
): VoteResult {
  const fresh = votes.filter(v => at - v.at <= windowMs);
  fresh.push({plate, at});

  const counts = new Map<string, number>();
  for (const v of fresh) {
    counts.set(v.plate, (counts.get(v.plate) ?? 0) + 1);
  }
  let winner: string | null = null;
  let best = 0;
  counts.forEach((count, p) => {
    if (count >= needed && count > best) {
      winner = p;
      best = count;
    }
  });
  return {votes: fresh, winner};
}
