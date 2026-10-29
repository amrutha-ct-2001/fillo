import React from 'react';
import {StyleSheet, View} from 'react-native';

import {IconName} from '../components/Icon';
import {space} from '../theme/tokens';
import {Button} from './Button';
import {IconBubble} from './IconBubble';
import {Text} from './Text';

type Props = {
  title: string;
  message?: string;
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
};

/** "Nothing here yet". Only for a successful, empty result; a failure uses ErrorState. */
export function EmptyState({title, message, icon = 'info', actionLabel, onAction}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.mark}>
        <IconBubble icon={icon} tone="accent" size={80} />
      </View>
      <Text variant="heading" style={styles.center}>
        {title}
      </Text>
      {message ? (
        <Text variant="body" color="textSecondary" style={styles.center}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} variant="secondary" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {alignItems: 'center', gap: space.md, padding: space.xl},
  mark: {marginBottom: space.xs},
  center: {textAlign: 'center', maxWidth: 320},
});
