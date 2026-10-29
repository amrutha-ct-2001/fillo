import React from 'react';
import {StyleProp, View, ViewStyle} from 'react-native';
import ContentLoader, {Rect} from 'react-content-loader/native';

import {useReduceMotion} from '../hooks/useReduceMotion';
import {radius} from '../theme/tokens';
import {useTheme} from '../theme/useTheme';

type Props = {
  width?: ViewStyle['width'];
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/** Grey placeholder block with a light shimmer sweeping across (still if the user reduced motion). */
export function Skeleton({width = '100%', height = 16, style}: Props) {
  const t = useTheme();
  const reduceMotion = useReduceMotion();

  return (
    <View style={[{width, height}, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <ContentLoader width="100%" height={height} speed={1.2} animate={!reduceMotion} backgroundColor={t.disabledFill} foregroundColor={t.surface}>
        <Rect x="0" y="0" rx={radius.sm} ry={radius.sm} width="100%" height={height} />
      </ContentLoader>
    </View>
  );
}
