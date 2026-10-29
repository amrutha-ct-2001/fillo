import React from 'react';
import {StyleSheet, View} from 'react-native';

import {Icon} from '../components/Icon';
import {radius, space} from '../theme/tokens';
import {useTheme} from '../theme/useTheme';
import {Button} from './Button';
import {Text} from './Text';

type Props = {
  message: string;
  title?: string;
  onRetry?: () => void;
  /** Smaller, for a banner inside a screen rather than a whole-screen failure. */
  compact?: boolean;
};

/** A failure must never look like "empty". Always offer Retry when a retry makes sense. */
export function ErrorState({message, title = 'Something went wrong', onRetry, compact}: Props) {
  const t = useTheme();
  return (
    <View
      style={[styles.wrap, compact && styles.compact, compact && {backgroundColor: t.dangerSoft}]}
      accessibilityRole="alert">
      <Icon name="cloud-off" size={compact ? 24 : 40} color={t.danger} />
      <View style={styles.copy}>
        <Text variant="subheading" color="danger" style={compact ? undefined : styles.center}>
          {title}
        </Text>
        <Text variant="body" color="textSecondary" style={compact ? undefined : styles.center}>
          {message}
        </Text>
      </View>
      {onRetry ? <Button title="Try again" icon="sync" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {alignItems: 'center', gap: space.md, padding: space.xl},
  compact: {flexDirection: 'column', alignItems: 'stretch', padding: space.lg, borderRadius: radius.lg},
  copy: {gap: space.xs},
  center: {textAlign: 'center'},
});
