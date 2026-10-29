import React, {useEffect, useState} from 'react';
import {Modal, StyleSheet, View} from 'react-native';
import NetInfo, {NetInfoState} from '@react-native-community/netinfo';
import {SafeAreaView} from 'react-native-safe-area-context';

import {Icon} from '../components/Icon';
import type {Role} from '../api/types';
import {radius, space} from '../theme/tokens';
import {useTheme} from '../theme/useTheme';
import {Badge} from './Badge';
import {Button} from './Button';
import {Text} from './Text';

/**
 * No network at all, or (outside debug builds) a network that cannot reach the
 * internet. Debug builds skip the internet check because the dev server is on
 * the LAN and works without it.
 */
export function isOffline(state: Pick<NetInfoState, 'isConnected' | 'isInternetReachable'>, dev = __DEV__): boolean {
  if (state.isConnected === false) {
    return true;
  }
  return !dev && state.isInternetReachable === false;
}

/**
 * Staff screens where a fill is already in progress. Saving there without signal
 * stores the fill on the phone to upload later, so covering them would lose a sale.
 */
const STAFF_OFFLINE_SCREENS = ['Fill', 'ProofCamera', 'FillSuccess'];

/** Everyone gets the offline screen, except staff in the middle of a fill. */
export function blocksWhenOffline(role: Role | null | undefined, screen?: string): boolean {
  return !(role === 'STAFF' && screen !== undefined && STAFF_OFFLINE_SCREENS.includes(screen));
}

/** Waits this long before covering the screen, so a blip of lost signal does not flash it. */
const SHOW_AFTER_MS = 1500;

type Props = {
  role: Role | null | undefined;
  /** Name of the screen on show, from the navigator. */
  screen?: string;
};

/** Mount once near the root. Covers the app with OfflineScreen while there is no connection. */
export function OfflineGate({role, screen}: Props) {
  const [offline, setOffline] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => NetInfo.addEventListener(state => setOffline(isOffline(state))), []);

  useEffect(() => {
    if (!offline) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [offline]);

  return (
    <Modal visible={visible && blocksWhenOffline(role, screen)} animationType="fade" statusBarTranslucent onRequestClose={() => undefined}>
      <OfflineScreen staff={role === 'STAFF'} />
    </Modal>
  );
}

/** "You're offline": what happened, that it fixes itself, and a Retry that checks again now. */
export function OfflineScreen({staff = false}: {staff?: boolean}) {
  const t = useTheme();
  const [checking, setChecking] = useState(false);

  const retry = async () => {
    setChecking(true);
    try {
      await NetInfo.refresh();
    } finally {
      setChecking(false);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, {backgroundColor: t.bg}]}>
      <View style={styles.body}>
        <View style={[styles.mark, {backgroundColor: t.accentSoft, borderColor: t.accent}]}>
          <Icon name="cloud-off" size={56} color={t.accentText} />
        </View>
        <Badge label="NO CONNECTION" tone="warning" icon="cell-tower" />
        <Text variant="title" style={styles.center} accessibilityRole="header">
          You're offline
        </Text>
        <Text variant="body" color="textSecondary" style={styles.center}>
          Check your mobile data or Wi-Fi. Fillo will carry on by itself as soon as the connection is back.
        </Text>
        {staff ? (
          <Text variant="bodySmall" color="textSecondary" style={styles.center}>
            Fills already saved on this phone are safe and will upload by themselves.
          </Text>
        ) : null}
      </View>
      <View style={styles.action}>
        <Button title={checking ? 'Checking…' : 'Try again'} icon="sync" large loading={checking} onPress={retry} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, padding: space.xl},
  body: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg},
  mark: {width: 112, height: 112, borderRadius: radius.lg, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm},
  center: {textAlign: 'center', maxWidth: 340},
  action: {width: '100%', maxWidth: 480, alignSelf: 'center'},
});
