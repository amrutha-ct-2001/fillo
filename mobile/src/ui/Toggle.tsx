import React from 'react';
import {StyleSheet, View} from 'react-native';

import {radius, space, target} from '../theme/tokens';
import {useTheme} from '../theme/useTheme';
import {Text} from './Text';
import {Touchable} from './Touchable';

type Props = {
  value: boolean;
  onChange: (next: boolean) => void;
  label: string;
  /** Second line explaining what the switch does. */
  description?: string;
  disabled?: boolean;
};

/** Whole row is the 48px+ target. State is shown with text (ON/OFF) as well as colour. */
export function Toggle({value, onChange, label, description, disabled}: Props) {
  const t = useTheme();
  return (
    <Touchable
      disabled={disabled}
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{checked: value, disabled}}
      style={[styles.row, {borderColor: t.border, backgroundColor: t.surface}]}>
      <View style={styles.copy}>
        <Text variant="body" color={disabled ? 'disabledText' : 'textPrimary'}>
          {label}
        </Text>
        {description ? (
          <Text variant="bodySmall" color="textSecondary">
            {description}
          </Text>
        ) : null}
      </View>
      <View
        style={[
          styles.pill,
          {backgroundColor: value ? t.ink : t.disabledFill, borderColor: value ? t.ink : t.borderStrong},
        ]}>
        <Text variant="caption" style={{color: value ? t.textOnInk : t.textPrimary}}>
          {value ? 'ON' : 'OFF'}
        </Text>
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: target.min + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  copy: {flex: 1, gap: 2},
  pill: {
    minWidth: 52,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
