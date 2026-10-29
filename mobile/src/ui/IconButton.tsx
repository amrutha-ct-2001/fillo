import React from 'react';
import {StyleProp, StyleSheet, ViewStyle} from 'react-native';

import {Icon, IconName} from '../components/Icon';
import {radius, target} from '../theme/tokens';
import {useTheme} from '../theme/useTheme';
import {Touchable} from './Touchable';

type Props = {
  icon: IconName;
  /** Required: an icon alone says nothing to a screen reader. */
  label: string;
  onPress?: () => void;
  size?: number;
  tone?: 'plain' | 'filled';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({icon, label, onPress, size = 24, tone = 'plain', disabled, style}: Props) {
  const t = useTheme();
  return (
    <Touchable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      style={[
        styles.base,
        tone === 'filled' && {backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border},
        style,
      ]}>
      <Icon name={icon} size={size} color={disabled ? t.disabledText : t.textPrimary} />
    </Touchable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: target.min,
    height: target.min,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
