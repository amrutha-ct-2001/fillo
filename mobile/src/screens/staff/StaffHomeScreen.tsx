import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Alert, FlatList, RefreshControl, StyleSheet, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import NetInfo from '@react-native-community/netinfo';

import {transactionApi} from '../../api/client';
import type {Transaction} from '../../api/types';
import {FilloLogo} from '../../components/FilloLogo';
import type {StaffStackParamList} from '../../navigation/types';
import {displayStaffName, greeting, syncBanner, todayStats} from '../../staff/home';
import {useAuthStore} from '../../store/auth';
import {radius, space} from '../../theme/tokens';
import {useTheme} from '../../theme/useTheme';
import {
  Badge,
  Button,
  Card,
  confirm,
  EmptyState,
  ErrorState,
  FadeIn,
  GradientCard,
  GroupedItem,
  IconButton,
  ListRow,
  Screen,
  showToast,
  Skeleton,
  SkeletonList,
  Text,
  Touchable,
} from '../../ui';
import {describeError} from '../../utils/errors';
import {formatInr, maskPhone, pluralize} from '../../utils/format';
import {paymentLabel, pointsUsedSuffix} from '../../utils/labels';
import {discardFailedFills, getFailedFills, getOfflineQueue, retryFailedFill} from '../../utils/offlineQueue';
import {syncOfflineQueue} from '../../utils/sync';

export function StaffHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList>>();
  const t = useTheme();
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [waiting, setWaiting] = useState(0);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // False until the first load finishes, so "No fills yet" and ₹0 never flash before data arrives.
  const [loaded, setLoaded] = useState(false);

  const countWaiting = useCallback(async () => {
    const [queue, failed] = await Promise.all([getOfflineQueue(), getFailedFills()]);
    setWaiting(queue.length + failed.length);
    return queue.length;
  }, []);

  const load = useCallback(async () => {
    const net = await NetInfo.fetch().catch(() => null);
    setOffline(net ? !(net.isConnected && net.isInternetReachable !== false) : false);
    try {
      const queued = await countWaiting();
      if (queued && net?.isConnected) {
        await syncOfflineQueue();
        await countWaiting();
      }
      const {data} = await transactionApi.recent();
      setRecent(data);
      setError(null);
    } catch (e) {
      // Keep the last list on screen; the banner below says what went wrong.
      setError(describeError(e).message);
      await countWaiting().catch(() => undefined);
    } finally {
      setLoaded(true);
    }
  }, [countWaiting]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      setOffline(!(state.isConnected && state.isInternetReachable !== false));
      if (state.isConnected) {
        syncOfflineQueue()
          .then(load)
          .catch(() => undefined);
      }
    });
    return () => unsub();
  }, [load]);

  const onUploadPress = async () => {
    if (syncing || waiting === 0) {
      return;
    }
    setSyncing(true);
    try {
      const synced = await syncOfflineQueue();
      await load();
      if (synced > 0) {
        showToast('success', 'Uploaded', `${pluralize(synced, 'fill')} uploaded.`);
        return;
      }
      const failed = await getFailedFills();
      if (failed.length) {
        // The server rejected these; they are kept so no sale is lost silently.
        const lines = failed.map(f => `• ${f.item.payload.plate_number} ₹${f.item.payload.amount}: ${f.reason}`).join('\n');
        Alert.alert(
          `${pluralize(failed.length, 'fill')} rejected`,
          `${lines}\n\nRetry after fixing the cause, or discard only these rejected fills.`,
          [
            {text: 'Keep', style: 'cancel'},
            {
              text: 'Retry',
              onPress: async () => {
                for (const f of failed) {
                  await retryFailedFill(f.item.id);
                }
                await syncOfflineQueue().catch(() => undefined);
                await load();
              },
            },
            {
              text: 'Discard rejected',
              style: 'destructive',
              onPress: async () => {
                await discardFailedFills();
                await load();
              },
            },
          ],
        );
        return;
      }
      const left = (await getOfflineQueue()).length;
      if (left > 0) {
        showToast('info', 'Still waiting', `${pluralize(left, 'fill')} will upload by itself when the signal is back.`);
      }
    } finally {
      setSyncing(false);
    }
  };

  const onLogout = async () => {
    if (await confirm({title: 'Log out', message: 'Sign out of Fillo?', confirmLabel: 'Log out', destructive: true, icon: 'logout'})) {
      logout();
    }
  };

  const stats = useMemo(() => todayStats(recent), [recent]);
  const banner = syncBanner(offline, waiting);

  const header = (
    <View style={styles.gap}>
      <View style={styles.topRow}>
        <FilloLogo height={44} compact={false} />
        <IconButton icon="logout" label="Log out" onPress={onLogout} />
      </View>

      <GradientCard>
        <View style={styles.identity}>
          <View style={styles.flex}>
            <Text variant="bodySmall" color="textOnInkMuted">
              {greeting(new Date().getHours())}
            </Text>
            <Text variant="heading" color="textOnInk" numberOfLines={1}>
              {displayStaffName(user?.name, user?.username)}
            </Text>
          </View>
          <Badge label={user?.station_name || 'Pump staff'} tone="warning" icon={user?.station_name ? 'gas-station' : undefined} />
        </View>
        {loaded ? (
          <View style={styles.heroStats} accessible accessibilityLabel={`My fills today ${formatInr(stats.total)}, ${pluralize(stats.count, 'fill')}`}>
            <View style={styles.flex}>
              <Text variant="overline" color="textOnInkMuted">
                MY FILLS TODAY
              </Text>
              <Text variant="title" color="accent" numberOfLines={1} adjustsFontSizeToFit>
                {formatInr(stats.total)}
              </Text>
            </View>
            <Text variant="subheading" color="textOnInk">
              {pluralize(stats.count, 'fill')}
            </Text>
          </View>
        ) : (
          <Skeleton height={56} />
        )}
      </GradientCard>

      {banner.kind === 'offline' ? (
        <Card tone="tonal" style={[styles.banner, {backgroundColor: t.accentSoft}]} >
          <Text variant="subheading" color="accentText">
            No signal
          </Text>
          <Text variant="body" color="accentText">
            You can keep filling. Fills are saved on this phone and upload by themselves when the signal returns.
            {banner.waiting > 0 ? ` ${pluralize(banner.waiting, 'fill')} waiting.` : ''}
          </Text>
        </Card>
      ) : null}
      {banner.kind === 'waiting' ? (
        <Touchable
          onPress={onUploadPress}
          disabled={syncing}
          accessibilityLabel="Upload waiting fills"
          style={[styles.banner, styles.waiting, {backgroundColor: t.accentSoft, borderColor: t.accent}]}>
          <Text variant="subheading" color="accentText">
            {syncing ? 'Uploading…' : `${pluralize(banner.waiting, 'fill')} waiting to upload`}
          </Text>
          <Text variant="bodySmall" color="accentText">
            Tap to upload now, or check fills the server rejected.
          </Text>
        </Touchable>
      ) : null}

      <Button title="NEW FILL" icon="scanner" variant="accent" large onPress={() => navigation.navigate('ScanPlate')} />
      <View style={styles.row}>
        <Button title="Type plate" icon="plate" variant="secondary" style={styles.flex} onPress={() => navigation.navigate('FindCustomer')} />
        <Button title="By phone" accessibilityLabel="Find customer by phone" icon="phone" variant="secondary" style={styles.flex} onPress={() => navigation.navigate('FindCustomer', {mode: 'phone'})} />
      </View>
      <Button title="Verify reward voucher" icon="stars" variant="ghost" onPress={() => navigation.navigate('VerifyVoucher')} />

      {error && recent.length > 0 ? <ErrorState compact title="Could not refresh" message={error} onRetry={load} /> : null}
      <Text variant="heading" style={styles.sectionTitle}>
        My recent fills
      </Text>
    </View>
  );

  return (
    <Screen scroll={false} padded={false}>
      <FlatList
        data={recent}
        keyExtractor={item => String(item.id)}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={t.ink}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        renderItem={({item, index}) => {
          const plate = item.vehicle?.plate_number || (item as {plate_number?: string}).plate_number || '';
          return (
            <FadeIn index={index}>
              <GroupedItem index={index} count={recent.length}>
              <ListRow
                first={index === 0}
                icon="fill"
                title={plate}
                subtitle={`${item.customer.name || 'Customer'} · ${maskPhone(item.customer.phone)} · ${paymentLabel(item.payment_mode)}${pointsUsedSuffix(item.points_redeemed)}`}
                trailing={formatInr(item.amount)}
                badge={item.points_earned ? `+${item.points_earned} pts` : undefined}
                badgeTone="success"
                onPress={() =>
                  navigation.navigate('CustomerHistory', {
                    customerId: item.customer.id,
                    name: item.customer.name,
                    phone: item.customer.phone,
                  })
                }
              />
              </GroupedItem>
            </FadeIn>
          );
        }}
        ListEmptyComponent={
          !loaded ? (
            <SkeletonList rows={4} />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : (
            <EmptyState icon="fill" title="No fills yet" message="Tap NEW FILL to start." />
          )
        }
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  gap: {gap: space.md},
  list: {padding: space.lg, paddingBottom: space.xxl},
  topRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  identity: {flexDirection: 'row', alignItems: 'center', gap: space.md},
  heroStats: {flexDirection: 'row', alignItems: 'flex-end', gap: space.md, marginTop: space.md},
  sectionTitle: {marginTop: space.sm},
  row: {flexDirection: 'row', gap: space.sm},
  banner: {gap: space.xs},
  waiting: {borderWidth: 2, borderRadius: radius.lg, padding: space.lg},
});
