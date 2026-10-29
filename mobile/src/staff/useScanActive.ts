import {useCallback, useEffect, useState} from 'react';
import {AppState} from 'react-native';
import {useIsFocused} from '@react-navigation/native';

export const SCAN_IDLE_MS = 60000;

/**
 * The camera should run only while the screen is showing, the app is in the
 * foreground, and someone has done something in the last minute. Everything
 * else just burns battery and heats the phone at the pump.
 */
export function useScanActive(idleMs: number = SCAN_IDLE_MS) {
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [idle, setIdle] = useState(false);
  // Bumped by `resume`, so the idle timer restarts even if nothing else changed.
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    const sub = AppState.addEventListener('change', s => setForeground(s === 'active'));
    return () => sub.remove();
  }, []);

  const running = focused && foreground;

  useEffect(() => {
    if (!running) {
      return undefined;
    }
    setIdle(false);
    const timer = setTimeout(() => setIdle(true), idleMs);
    return () => clearTimeout(timer);
  }, [running, idleMs, epoch]);

  const resume = useCallback(() => {
    setIdle(false);
    setEpoch(e => e + 1);
  }, []);

  return {active: running && !idle, idle: running && idle, resume};
}
