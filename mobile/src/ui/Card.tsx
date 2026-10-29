import React from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';

import {radius, shadow, space} from '../theme/tokens';
import {useTheme} from '../theme/useTheme';

type Props = {
  children: React.ReactNode;
  /** `elevated` (default) is a white card with a soft shadow; `tonal` is a flat tinted fill; `outlined` has a hairline border. */
  tone?: 'elevated' | 'outlined' | 'tonal';
  style?: StyleProp<ViewStyle>;
};

export function Card({children, tone = 'elevated', style}: Props) {
  const t = useTheme();
  const look =
    tone === 'tonal'
      ? {backgroundColor: t.surfaceAlt}
      : tone === 'outlined'
        ? {backgroundColor: t.surface, borderColor: t.border, borderWidth: 1}
        : {backgroundColor: t.surface, ...shadow.card};
  return <View style={[styles.base, look, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {borderRadius: radius.lg, padding: space.lg},
});
