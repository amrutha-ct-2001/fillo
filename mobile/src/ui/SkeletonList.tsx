import React from 'react';
import {StyleSheet, View} from 'react-native';

import {space, target} from '../theme/tokens';
import {useTheme} from '../theme/useTheme';
import {Skeleton} from './Skeleton';

type Props = {
  /** How many placeholder rows. */
  rows?: number;
};

/**
 * Placeholder rows shaped like ListRow (title + badge, subtitle, amount), so the
 * screen keeps its layout while data loads instead of jumping when it arrives.
 */
export function SkeletonList({rows = 4}: Props) {
  const t = useTheme();
  return (
    <View accessible accessibilityLabel="Loading">
      {Array.from({length: rows}, (_, i) => (
        <View key={i} style={[styles.row, i > 0 && {borderTopWidth: 1, borderTopColor: t.border}]}>
          <View style={styles.main}>
            <View style={styles.titleRow}>
              <Skeleton width="42%" height={16} />
              <Skeleton width={52} height={20} />
            </View>
            <Skeleton width={i % 2 ? '58%' : '72%'} height={12} />
          </View>
          <Skeleton width={56} height={16} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: target.min + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
  },
  main: {flex: 1, gap: space.sm},
  titleRow: {flexDirection: 'row', alignItems: 'center', gap: space.sm},
});
