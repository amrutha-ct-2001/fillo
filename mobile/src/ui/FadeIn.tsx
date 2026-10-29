import React, {useEffect, useRef} from 'react';
import {Animated} from 'react-native';

import {useReduceMotion} from '../hooks/useReduceMotion';

type Props = {
  children: React.ReactNode;
  /** Position in a list; later rows start a little later. Capped so long lists never feel slow. */
  index?: number;
};

const STEP_MS = 40;
const MAX_STEPS = 8;

/** Fades and lifts its child in once, when it first appears (still if the user reduced motion). */
export function FadeIn({children, index = 0}: Props) {
  const reduceMotion = useReduceMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 220,
      delay: Math.min(index, MAX_STEPS) * STEP_MS,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [progress, index]);

  if (reduceMotion) {
    return <>{children}</>;
  }
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 0],
  });
  return <Animated.View style={{opacity: progress, transform: [{translateY}]}}>{children}</Animated.View>;
}
