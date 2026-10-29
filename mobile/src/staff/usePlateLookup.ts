import {useCallback, useEffect, useRef, useState} from 'react';

import {lookupPlate, MIN_PLATE_LENGTH, PlateLookup} from './lookup';
import {normalizePlate} from '../utils/ocr';

type State = {
  /** `idle` until a plate long enough to look up has been typed. */
  status: 'idle' | 'loading' | PlateLookup['status'];
  result: PlateLookup | null;
};

const IDLE: State = {status: 'idle', result: null};

/**
 * Debounced plate lookup. Every change cancels the older request's result, and
 * `loading` is set right away so Save can be blocked before the debounce ends.
 */
export function usePlateLookup(plate: string, delayMs = 450) {
  const [state, setState] = useState<State>(IDLE);
  const generation = useRef(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const gen = ++generation.current;
    if (normalizePlate(plate).length < MIN_PLATE_LENGTH) {
      setState(IDLE);
      return;
    }
    setState({status: 'loading', result: null});
    const timer = setTimeout(async () => {
      const result = await lookupPlate(plate);
      if (gen === generation.current) {
        setState({status: result.status, result});
      }
    }, delayMs);
    return () => clearTimeout(timer);
  }, [plate, delayMs, tick]);

  /** Try the same plate again after an error. */
  const retry = useCallback(() => setTick(t => t + 1), []);

  return {...state, retry};
}
