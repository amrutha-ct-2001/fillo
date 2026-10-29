import React from 'react';
import {StyleSheet, View} from 'react-native';

import {radius, shadow, space} from '../theme/tokens';
import {useTheme} from '../theme/useTheme';
import {Text} from './Text';
import {Touchable} from './Touchable';

type Props<T extends string> = {
  options: Array<{value: T; label: string}>;
  value: T;
  onChange: (value: T) => void;
};

/** Pill switcher between two to four views of the same screen. */
export function SegmentedControl<T extends string>({options, value, onChange}: Props<T>) {
  const t = useTheme();
  return (
    <View style={[styles.track, {backgroundColor: t.surfaceAlt}]} accessibilityRole="tablist">
      {options.map(o => {
        const on = o.value === value;
        return (
          <Touchable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{selected: on}}
            accessibilityLabel={o.label}
            style={[styles.segment, on && [{backgroundColor: t.surface}, shadow.card]]}>
            <Text variant="label" color={on ? 'ink' : 'textSecondary'}>
              {o.label}
            </Text>
          </Touchable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {flexDirection: 'row', borderRadius: radius.pill, padding: space.xs},
  segment: {flex: 1, minHeight: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center'},
});
