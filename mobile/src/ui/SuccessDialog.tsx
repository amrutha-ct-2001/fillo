import React, {useEffect} from 'react';
import {Modal, Pressable, StyleSheet, View} from 'react-native';

import {Icon} from '../components/Icon';
import {radius, space} from '../theme/tokens';
import {useTheme} from '../theme/useTheme';
import {haptics} from '../utils/haptics';
import {Button} from './Button';
import {Text} from './Text';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  onClose: () => void;
  /** Closes by itself after this long; Done or a tap outside closes it sooner. */
  autoCloseMs?: number;
};

/** Confirms that something was saved, in the app's own look instead of the system alert. */
export function SuccessDialog({visible, title, message, onClose, autoCloseMs = 2500}: Props) {
  const t = useTheme();

  useEffect(() => {
    if (!visible) {
      return;
    }
    haptics.success();
    const timer = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(timer);
  }, [visible, autoCloseMs, onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[styles.scrim, {backgroundColor: t.scrim}]} onPress={onClose} accessibilityLabel="Close">
        <Pressable
          style={[styles.card, {backgroundColor: t.surface, borderColor: t.border}]}
          accessibilityRole="alert"
          onPress={() => undefined}>
          <View style={[styles.mark, {backgroundColor: t.successSoft}]}>
            <Icon name="check-circle" size={44} color={t.success} />
          </View>
          <Text variant="title" style={styles.center}>
            {title}
          </Text>
          {message ? (
            <Text variant="body" color="textSecondary" style={styles.center}>
              {message}
            </Text>
          ) : null}
          <View style={styles.action}>
            <Button title="Done" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl},
  card: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: space.md,
    padding: space.xl,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  mark: {width: 72, height: 72, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs},
  center: {textAlign: 'center'},
  action: {alignSelf: 'stretch', marginTop: space.sm},
});
