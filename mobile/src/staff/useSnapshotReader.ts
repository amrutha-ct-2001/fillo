import {useEffect, useRef} from 'react';

import {addVote, Vote} from './plateVote';

type Options = {
  /** Reading runs only while true. */
  active: boolean;
  /** Gap between one finished read and the next snapshot. */
  intervalMs?: number;
  /** Take a still and return its URI (null if the camera is not ready). */
  take: () => Promise<string | null>;
  /** Read a plate from the still (null if none was found). */
  read: (uri: string) => Promise<string | null>;
  /** Called once with the agreed plate; reading then stops until `active` is toggled. */
  onPlate: (plate: string, uri: string) => void;
  /** Matching reads needed, and how long (ms) they stay valid. */
  needed?: number;
  windowMs?: number;
  now?: () => number;
};

/**
 * "Tier 2" plate reader: snapshot, read, vote, repeat. It needs no frame-processor
 * plugin, so it works wherever the camera preview works. One snapshot is in
 * flight at a time, so a slow phone simply reads less often instead of piling up work.
 */
export function useSnapshotReader({
  active,
  intervalMs = 600,
  take,
  read,
  onPlate,
  needed = 2,
  windowMs = 4000,
  now = Date.now,
}: Options) {
  // Latest callbacks, so the loop never restarts just because a parent re-rendered.
  const fns = useRef({take, read, onPlate, now});
  fns.current = {take, read, onPlate, now};
  const votes = useRef<Vote[]>([]);

  useEffect(() => {
    if (!active) {
      votes.current = [];
      return undefined;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const cycle = async () => {
      if (cancelled) {
        return;
      }
      try {
        const uri = await fns.current.take();
        if (!cancelled && uri) {
          const plate = await fns.current.read(uri);
          if (!cancelled && plate) {
            const result = addVote(votes.current, plate, fns.current.now(), {needed, windowMs});
            votes.current = result.votes;
            if (result.winner) {
              fns.current.onPlate(result.winner, uri);
              return;
            }
          }
        }
      } catch {
        // A failed snapshot or read is just a missed frame; try again.
      }
      if (!cancelled) {
        timer = setTimeout(cycle, intervalMs);
      }
    };

    timer = setTimeout(cycle, 0);
    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [active, intervalMs, needed, windowMs]);
}
