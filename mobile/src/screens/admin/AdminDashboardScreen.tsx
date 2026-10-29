import React from 'react';
import {RefreshControl, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {useDashboard} from '../../queries/admin';
import {space} from '../../theme/tokens';
import {useTheme} from '../../theme/useTheme';
import {Card, ErrorState, GradientCard, ListRow, Skeleton, SkeletonList, StatTile, Text} from '../../ui';
import {describeError} from '../../utils/errors';
import {formatDateTime, formatInr, pluralize} from '../../utils/format';
import {paymentLabel} from '../../utils/labels';

const staffLabel = (row: {name?: string; username?: string; phone?: string}) =>
  row.name?.trim() || row.username || row.phone || 'Staff';

function HeroFigure({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.flex}>
      <Text variant="heading" color="accent">
        {value}
      </Text>
      <Text variant="caption" color="textOnInkMuted">
        {label}
      </Text>
    </View>
  );
}

function Section({title, empty, children}: {title: string; empty?: string; children: React.ReactNode[] | React.ReactNode}) {
  const items = React.Children.toArray(children);
  return (
    <View style={styles.section}>
      <Text variant="heading">{title}</Text>
      {items.length === 0 ? (
        <Text variant="body" color="textSecondary">
          {empty}
        </Text>
      ) : (
        <Card>{items}</Card>
      )}
    </View>
  );
}

export function AdminDashboardScreen() {
  const t = useTheme();
  const query = useDashboard();
  const d = query.data;

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: t.bg}]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={query.isRefetching} tintColor={t.ink} onRefresh={() => {
          query.refetch();
        }} />}>
        <Text variant="title" accessibilityRole="header">
          Dashboard
        </Text>
        <Text variant="body" color="textSecondary">
          Pump fills and rewards
        </Text>

        {query.isError && !d ? (
          <ErrorState message={describeError(query.error).message} onRetry={() => query.refetch()} />
        ) : !d ? (
          <View style={styles.section}>
            {[0, 1, 2].map(i => (
              <View key={i} style={styles.row}>
                <Skeleton width="auto" height={88} style={styles.flex} />
                <Skeleton width="auto" height={88} style={styles.flex} />
              </View>
            ))}
            <Skeleton width={120} height={14} />
            <SkeletonList rows={3} />
          </View>
        ) : (
          <>
            {query.isError ? <ErrorState compact title="Could not refresh" message={describeError(query.error).message} onRetry={() => query.refetch()} /> : null}
            <GradientCard>
              <Text variant="overline" color="textOnInkMuted">
                SALES TODAY
              </Text>
              <Text variant="display" color="textOnInk" numberOfLines={1} adjustsFontSizeToFit>
                {formatInr(d.today.amount)}
              </Text>
              <View style={styles.heroRow}>
                <HeroFigure label="Fills today" value={String(d.today.fills)} />
                <HeroFigure label="Points given" value={String(d.today.points_issued)} />
                <HeroFigure label="Points used" value={String(d.today.points_redeemed)} />
              </View>
            </GradientCard>
            <View style={styles.row}>
              <StatTile icon="customers" label="Customers" value={String(d.customer_count)} />
              <StatTile icon="staff" tone="accent" label="Active staff" value={String(d.staff_count ?? 0)} />
            </View>
            <View style={styles.row}>
              <StatTile icon="gas-station" tone="success" label="Stations" value={String(d.station_count ?? 0)} />
              <StatTile icon="stars" tone="danger" label="Vouchers to use" value={String(d.pending_vouchers ?? 0)} />
            </View>

            <Section title="Stations today" empty="No fills at a station yet today.">
              {(d.by_station ?? []).map((s, i) => (
                <ListRow key={s.station_id} first={i === 0} icon="gas-station" title={s.name} subtitle={pluralize(s.fills, 'fill')} trailing={formatInr(s.total_amount)} />
              ))}
            </Section>

            <Section title="Staff today" empty="No fills logged today.">
              {(d.by_staff ?? []).map((s, i) => (
                <ListRow key={s.staff_id} first={i === 0} title={staffLabel(s)} subtitle={s.username ? `@${s.username}` : undefined} trailing={`${s.fills} · ${formatInr(s.total_amount)}`} />
              ))}
            </Section>
            <Section title="Payments today" empty="No payments yet.">
              {(d.by_payment ?? []).map((p, i) => (
                <ListRow key={p.payment_mode} first={i === 0} title={paymentLabel(p.payment_mode)} subtitle={pluralize(p.fills, 'fill')} trailing={formatInr(p.total_amount)} />
              ))}
            </Section>
            <Section title="Top customers" empty="No customer activity yet.">
              {d.top_customers.map((c, i) => (
                <ListRow key={c.customer_id} first={i === 0} title={c.customer__name || c.customer__phone} subtitle={pluralize(c.fills, 'fill')} trailing={formatInr(c.total_amount)} />
              ))}
            </Section>
            <Section title="Recent fills" empty="No fills yet.">
              {(d.recent_fills ?? []).map((tx, i) => (
                <ListRow
                  key={tx.id}
                  first={i === 0}
                  title={tx.vehicle?.plate_number || 'Plate'}
                  subtitle={`${tx.customer?.name || tx.customer?.phone || 'Customer'} · ${paymentLabel(tx.payment_mode)} · by ${tx.staff?.name?.trim() || tx.staff?.username || 'Staff'} · ${formatDateTime(tx.created_at)}`}
                  trailing={formatInr(tx.amount)}
                />
              ))}
            </Section>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  container: {padding: space.lg, gap: space.md, paddingBottom: space.xxl},
  row: {flexDirection: 'row', gap: space.md},
  heroRow: {flexDirection: 'row', gap: space.md, marginTop: space.md},
  flex: {flex: 1},
  section: {gap: space.sm},
});
