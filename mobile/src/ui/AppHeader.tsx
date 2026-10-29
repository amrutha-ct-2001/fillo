import React from 'react';
import {StyleSheet, View} from 'react-native';

import {Icon} from '../components/Icon';
import {radius, shadow, space, target} from '../theme/tokens';
import {useTheme} from '../theme/useTheme';
import {Text} from './Text';
import {Touchable} from './Touchable';

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  /** Optional element on the right (a status Badge, an action). */
  right?: React.ReactNode;
};

/** Top bar on the screen background: round back button, title, optional right slot. */
export function AppHeader({title, subtitle, onBack, right}: Props) {
  const t = useTheme();
  return (
    <View style={[styles.bar, {backgroundColor: t.bg}]}>
      {onBack ? (
        <Touchable onPress={onBack} accessibilityLabel="Go back" style={[styles.back, {backgroundColor: t.surface}, shadow.card]}>
          <Icon name="chevron-left" size={26} color={t.ink} />
        </Touchable>
      ) : null}
      <View style={styles.titles}>
        <Text variant="subheading" numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    gap: space.md,
  },
  back: {
    width: target.min,
    height: target.min,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: {flex: 1},
  right: {minWidth: target.min, alignItems: 'flex-end'},
});
