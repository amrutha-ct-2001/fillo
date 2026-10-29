import React, {useCallback, useEffect, useState} from 'react';
import {Modal, Pressable, StyleSheet, View} from 'react-native';

import {Icon} from '../components/Icon';
import {radius, space} from '../theme/tokens';
import {useTheme} from '../theme/useTheme';
import {Button} from './Button';
import {ConfirmOptions, setConfirmPresenter} from './confirm';
import {Text} from './Text';

type Pending = {options: ConfirmOptions; resolve: (ok: boolean) => void};

/**
 * Mount once near the root. Makes `confirm()` show this in-app dialog instead of
 * the system alert, so it matches the app and never needs an attached Activity.
 */
export function ConfirmHost() {
  const t = useTheme();
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    setConfirmPresenter(
      options =>
        new Promise<boolean>(resolve => {
          setPending(prev => {
            prev?.resolve(false); // a newer question replaces an unanswered one
            return {options, resolve};
          });
        }),
    );
    return () => setConfirmPresenter(null);
  }, []);

  const answer = useCallback(
    (ok: boolean) => {
      pending?.resolve(ok);
      setPending(null);
    },
    [pending],
  );

  const o = pending?.options;
  const tone = o?.destructive ? {bg: t.dangerSoft, fg: t.danger} : {bg: t.surfaceAlt, fg: t.ink};

  return (
    <Modal visible={!!pending} transparent animationType="fade" onRequestClose={() => answer(false)} statusBarTranslucent>
      <Pressable style={[styles.scrim, {backgroundColor: t.scrim}]} onPress={() => answer(false)} accessibilityLabel="Cancel">
        <Pressable style={[styles.card, {backgroundColor: t.surface, borderColor: t.border}]} accessibilityRole="alert" onPress={() => undefined}>
          {o?.icon ? (
            <View style={[styles.mark, {backgroundColor: tone.bg}]}>
              <Icon name={o.icon} size={32} color={tone.fg} />
            </View>
          ) : null}
          <Text variant="title" style={styles.center}>
            {o?.title}
          </Text>
          {o?.message ? (
            <Text variant="body" color="textSecondary" style={styles.center}>
              {o.message}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <View style={styles.flex}>
              <Button title={o?.cancelLabel ?? 'Cancel'} variant="secondary" onPress={() => answer(false)} />
            </View>
            <View style={styles.flex}>
              <Button title={o?.confirmLabel ?? 'Confirm'} variant={o?.destructive ? 'danger' : 'primary'} onPress={() => answer(true)} />
            </View>
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
  mark: {width: 64, height: 64, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs},
  center: {textAlign: 'center'},
  actions: {alignSelf: 'stretch', flexDirection: 'row', gap: space.md, marginTop: space.sm},
  flex: {flex: 1},
});
