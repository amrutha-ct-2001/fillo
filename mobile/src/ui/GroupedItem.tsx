import React from 'react';
import {StyleSheet, View} from 'react-native';

import {radius, space} from '../theme/tokens';
import {useTheme} from '../theme/useTheme';

/**
 * One item of a FlatList drawn as part of a single rounded card: the first
 * item rounds the top corners, the last rounds the bottom ones.
 */
export function GroupedItem({index, count, children}: {index: number; count: number; children: React.ReactNode}) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.base,
        {backgroundColor: t.surface},
        index === 0 && styles.top,
        index === count - 1 && styles.bottom,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {paddingHorizontal: space.lg},
  top: {borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingTop: space.xs},
  bottom: {borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg, paddingBottom: space.xs},
});
