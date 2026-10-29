import React from 'react';
import {StyleSheet, View} from 'react-native';

import {Icon, IconName} from '../components/Icon';
import {Palette, radius} from '../theme/tokens';
import {useTheme} from '../theme/useTheme';

export type BubbleTone = 'brand' | 'accent' | 'success' | 'danger' | 'neutral' | 'onInk';

const TONES: Record<BubbleTone, {bg: keyof Palette; fg: keyof Palette}> = {
  brand: {bg: 'surfaceAlt', fg: 'ink'},
  accent: {bg: 'accentSoft', fg: 'accentText'},
  success: {bg: 'successSoft', fg: 'success'},
  danger: {bg: 'dangerSoft', fg: 'danger'},
  neutral: {bg: 'surfaceAlt', fg: 'textSecondary'},
  onInk: {bg: 'inkSoft', fg: 'accent'},
};

/** Round tinted icon, used at the start of rows, tiles and empty states. */
export function IconBubble({icon, tone = 'brand', size = 40}: {icon: IconName; tone?: BubbleTone; size?: number}) {
  const t = useTheme();
  const {bg, fg} = TONES[tone];
  return (
    <View style={[styles.base, {width: size, height: size, backgroundColor: t[bg]}]}>
      <Icon name={icon} size={Math.round(size * 0.5)} color={t[fg]} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center'},
});
