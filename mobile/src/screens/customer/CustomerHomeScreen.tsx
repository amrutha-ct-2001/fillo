import React from 'react';
import {RefreshControl, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';

import {FilloLogo} from '../../components/FilloLogo';
import {useMyPoints} from '../../queries/customer';
import {useStations} from '../../queries/rewards';
import {useAuthStore} from '../../store/auth';
import {radius, space} from '../../theme/tokens';
import {useTheme} from '../../theme/useTheme';
import {Card, ErrorState, GradientCard, ListRow, Skeleton, SkeletonList, Text} from '../../ui';
import {describeError} from '../../utils/errors';
import {formatDateTime, formatPhone} from '../../utils/format';
import {ledgerLabel} from '../../utils/labels';

export function CustomerHomeScreen() {
  const t = useTheme();
  const user = useAuthStore(s => s.user);
  const query = useMyPoints();
  const stations = useStations();
  const data = query.data;
  const balance = data?.balance ?? user?.points_balance;
  const settings = data?.settings;

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: t.bg}]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={query.isRefetching} tintColor={t.ink} onRefresh={() => {
              query.refetch();
              stations.refetch();
            }} />}>
        <FilloLogo height={40} compact={false} />

        {query.isError && !data ? (
          <ErrorState compact title="Could not load your points" message={describeError(query.error).message} onRetry={() => query.refetch()} />
        ) : null}

        <GradientCard accessible accessibilityLabel={`Points balance ${balance ?? 'loading'}`}>
          <Text variant="subheading" color="textOnInk" accessibilityRole="header">
            {`Hi ${user?.name?.trim() || user?.username || 'there'}`}
          </Text>
          <Text variant="overline" color="textOnInkMuted" style={styles.overline}>
            YOUR POINTS
          </Text>
          {balance === undefined ? (
            <Skeleton width={120} height={50} />
          ) : (
            <Text variant="display" color="accent">
              {String(balance)}
            </Text>
          )}
          {settings ? (
            <Text variant="bodySmall" color="textOnInkMuted">
              {`Earn ${settings.earn_points_per_rupees} point${settings.earn_points_per_rupees === 1 ? '' : 's'} for every ₹${settings.earn_rupees_unit}`}
              {settings.redeem_rate ? ` · 1 point = ₹${settings.redeem_rate}` : ' · using points is coming soon'}
            </Text>
          ) : null}
        </GradientCard>

        <Card style={styles.qrCard}>
          <View style={styles.qrText}>
            <Text variant="subheading">Show at the pump</Text>
            <Text variant="bodySmall" color="textSecondary">
              Staff scan this or type your number to add points.
            </Text>
            <Text variant="label" color="ink">
              {formatPhone(user?.phone)}
            </Text>
          </View>
          <View style={[styles.qrBox, {backgroundColor: t.surfaceAlt}]}>
            <QRCode value={`fillo:phone:${user?.phone}`} size={96} backgroundColor="transparent" color={t.ink} />
          </View>
        </Card>

        {stations.data && stations.data.length ? (
          <>
            <Text variant="heading">Our stations</Text>
            <Card>
              {stations.data.slice(0, 4).map((s, i) => (
                <ListRow key={s.id} first={i === 0} icon="gas-station" title={s.name} subtitle={[s.address, s.city].filter(Boolean).join(', ')} />
              ))}
            </Card>
          </>
        ) : null}

        <Text variant="heading">Recent activity</Text>
        {data ? (
          data.ledger.length === 0 ? (
            <Text variant="body" color="textSecondary">
              No points yet. They appear after your first fill.
            </Text>
          ) : (
            <Card>
              {data.ledger.slice(0, 8).map((entry, index) => (
                <ListRow
                  key={entry.id}
                  first={index === 0}
                  icon={entry.delta >= 0 ? 'stars' : 'wallet'}
                  iconTone={entry.delta >= 0 ? 'success' : 'brand'}
                  title={ledgerLabel(entry.type)}
                  subtitle={entry.note || formatDateTime(entry.created_at)}
                  trailing={`${entry.delta >= 0 ? '+' : ''}${entry.delta}`}
                />
              ))}
            </Card>
          )
        ) : query.isPending ? (
          <SkeletonList rows={3} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  container: {padding: space.lg, gap: space.lg, paddingBottom: space.xxl},
  overline: {marginTop: space.sm},
  qrCard: {flexDirection: 'row', alignItems: 'center', gap: space.lg},
  qrText: {flex: 1, gap: space.xs},
  qrBox: {padding: space.md, borderRadius: radius.md},
});
