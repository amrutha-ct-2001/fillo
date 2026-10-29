import {useEffect, useState} from 'react';
import {AccessibilityInfo} from 'react-native';

/** True when the person asked the phone for less motion; animations then stay still. */
export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(r => !cancelled && setReduce(r))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return reduce;
}
