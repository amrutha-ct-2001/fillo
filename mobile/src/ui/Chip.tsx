import React from 'react';
import {StyleSheet} from 'react-native';

import {Icon, IconName} from '../components/Icon';
import {radius, space, target} from '../theme/tokens';
import {useTheme} from '../theme/useTheme';
import {Text} from './Text';
import {Touchable} from './Touchable';

type Props = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
};

/** Selectable pill, for picking one item from a short list (a station, a filter). */
export function Chip({label, selected, onPress, icon}: Props) {
  const t = useTheme();
  const fg = selected ? t.textOnInk : t.textPrimary;
  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{selected: !!selected}}
      accessibilityLabel={label}
      style={[
        styles.base,
        selected ? {backgroundColor: t.ink, borderColor: t.ink} : {backgroundColor: t.surface, borderColor: t.borderStrong},
      ]}>
      {icon || selected ? <Icon name={selected ? 'check' : (icon as IconName)} size={16} color={fg} /> : null}
      <Text variant="label" style={{color: fg}}>
        {label}
      </Text>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: target.min - 4,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
