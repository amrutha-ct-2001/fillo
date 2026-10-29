import React from 'react';
import {ActivityIndicator, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';

import {Icon, IconName} from '../components/Icon';
import {radius, shadow, target} from '../theme/tokens';
import {useTheme} from '../theme/useTheme';
import {Text} from './Text';
import {Touchable} from './Touchable';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
  /** Taller button. Use for the one main action on a screen. */
  large?: boolean;
  /** Smaller pill for actions inside a card. */
  compact?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * Pill button. Disabled buttons switch to a grey fill (never low opacity) so
 * they read as "not available" in direct sunlight.
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  large,
  compact,
  loading,
  disabled,
  icon,
  style,
  accessibilityLabel,
}: Props) {
  const t = useTheme();
  const off = !!disabled || !!loading;

  const face = {
    primary: {bg: t.ink, fg: t.textOnInk, border: t.ink},
    accent: {bg: t.accent, fg: t.textOnAccent, border: t.accent},
    secondary: {bg: t.surface, fg: t.ink, border: t.border},
    ghost: {bg: t.surfaceAlt, fg: t.ink, border: t.surfaceAlt},
    danger: {bg: t.danger, fg: t.textOnDanger, border: t.danger},
  }[variant];

  const bg = disabled ? t.disabledFill : face.bg;
  const fg = disabled ? t.disabledText : face.fg;
  const border = disabled ? t.disabledFill : face.border;
  const height = compact ? 40 : large ? target.buttonLarge : target.button;
  const lifted = !disabled && (variant === 'primary' || variant === 'accent') && !compact;

  return (
    <Touchable
      disabled={off}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{disabled: off, busy: !!loading}}
      style={[
        styles.base,
        lifted && shadow.card,
        {backgroundColor: bg, borderColor: border, minHeight: height, paddingHorizontal: compact ? 16 : 20},
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={compact ? 18 : 22} color={fg} /> : null}
          <Text variant={compact ? 'label' : 'button'} style={[styles.label, {color: fg}]} numberOfLines={2}>
            {title}
          </Text>
        </View>
      )}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1.5,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 6},
  label: {flexShrink: 1, textAlign: 'center'},
});
