/**
 * Hand-off for the payment photo: the proof camera screen drops the picture here
 * and the Fill screen picks it up when it is shown again. (Passing it back as a
 * navigation param would need the whole Fill route params re-sent.)
 */
let pending: string | null = null;

export function setPendingProof(uri: string | null) {
  pending = uri;
}

/** Returns the waiting photo once, then forgets it. */
export function takePendingProof(): string | null {
  const uri = pending;
  pending = null;
  return uri;
}
