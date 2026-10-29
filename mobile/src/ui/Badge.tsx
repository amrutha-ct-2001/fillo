import React from 'react';
import {StyleSheet, View} from 'react-native';

import {Icon, IconName} from '../components/Icon';
import {Palette, radius, space} from '../theme/tokens';
import {useTheme} from '../theme/useTheme';
import {Text} from './Text';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

type Props = {
  label: string;
  tone?: BadgeTone;
  /** Status is never colour-only: pass an icon or rely on the word itself. */
  icon?: IconName;
};

const TONES: Record<BadgeTone, {bg: keyof Palette; fg: keyof Palette}> = {
  neutral: {bg: 'surfaceAlt', fg: 'textPrimary'},
  brand: {bg: 'surfaceAlt', fg: 'ink'},
  success: {bg: 'successSoft', fg: 'success'},
  warning: {bg: 'accentSoft', fg: 'accentText'},
  danger: {bg: 'dangerSoft', fg: 'danger'},
};

export function Badge({label, tone = 'neutral', icon}: Props) {
  const t = useTheme();
  const {bg, fg} = TONES[tone];
  return (
    <View style={[styles.base, {backgroundColor: t[bg]}]}>
      {icon ? <Icon name={icon} size={14} color={t[fg]} /> : null}
      <Text variant="caption" color={fg}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.xs,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
});
