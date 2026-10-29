import React, {useCallback, useState} from 'react';
import {FlatList, StyleSheet, View} from 'react-native';
import {RouteProp, useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {transactionApi} from '../../api/client';
import type {Transaction, User, Vehicle} from '../../api/types';
import {HsrpPlate} from '../../components/HsrpPlate';
import type {StaffStackParamList} from '../../navigation/types';
import {space} from '../../theme/tokens';
import {AppHeader, Card, EmptyState, ErrorState, FadeIn, GroupedItem, IconBubble, ListRow, Screen, SkeletonList, Text} from '../../ui';
import {describeError} from '../../utils/errors';
import {formatDateTime, formatInr, maskPhone, pluralize} from '../../utils/format';
import {paymentLabel, pointsUsedSuffix} from '../../utils/labels';

type Detail = {customer: User; balance: number; vehicles: Vehicle[]; transactions: Transaction[]};

export function StaffCustomerHistoryScreen() {
  const route = useRoute<RouteProp<StaffStackParamList, 'CustomerHistory'>>();
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList>>();
  const {customerId, name: seedName, phone: seedPhone} = route.params;

  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {data} = await transactionApi.customerDetail(customerId);
      setDetail({
        customer: data.customer,
        balance: data.balance,
        vehicles: data.vehicles || [],
        transactions: data.transactions || [],
      });
    } catch (e) {
      // A failed load is an error with Retry, never an empty history.
      setError(describeError(e).message);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const name = detail?.customer.name || seedName || 'Customer';
  const phone = detail?.customer.phone || seedPhone;
  const header = (
    <Card style={styles.identity}>
      <View style={styles.identityTop}>
        <IconBubble icon="person" size={48} />
        <View style={styles.flex}>
          <Text variant="subheading" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="bodySmall" color="textSecondary" numberOfLines={1}>
            {phone ? maskPhone(phone) : ''}
          </Text>
        </View>
        {detail ? (
          <View style={styles.balance} accessible accessibilityLabel={`${detail.balance} points`}>
            <Text variant="heading" color="ink">
              {String(detail.balance)}
            </Text>
            <Text variant="caption" color="textSecondary">
              points
            </Text>
          </View>
        ) : null}
      </View>
      {detail && detail.vehicles.length > 0 ? (
        <View style={styles.plates}>
          {detail.vehicles.map(v => (
            <HsrpPlate key={v.id} plate={v.plate_number} size="sm" />
          ))}
        </View>
      ) : null}
    </Card>
  );

  let body: React.ReactNode;
  if (loading && !detail) {
    body = (
      <View style={styles.padded}>
        {header}
        <SkeletonList rows={4} />
      </View>
    );
  } else if (error && !detail) {
    body = (
      <View style={styles.padded}>
        {header}
        <ErrorState message={error} onRetry={load} />
      </View>
    );
  } else {
    const txs = detail?.transactions ?? [];
    body = (
      <FlatList
        data={txs}
        keyExtractor={tx => String(tx.id)}
        contentContainerStyle={styles.padded}
        refreshing={loading}
        onRefresh={load}
        ListHeaderComponent={
          <View style={styles.gap}>
            {header}
            {error ? <ErrorState compact message={error} onRetry={load} title="Could not refresh" /> : null}
            <Text variant="heading">{`Fill history · ${pluralize(txs.length, 'fill')}`}</Text>
          </View>
        }
        renderItem={({item, index}) => (
          <FadeIn index={index}>
            <GroupedItem index={index} count={txs.length}>
              <ListRow
                first={index === 0}
                icon="fill"
                title={formatInr(item.amount)}
                subtitle={`${item.vehicle.plate_number} · ${formatDateTime(item.created_at)} · ${paymentLabel(item.payment_mode)}${item.fuel_type ? ` · ${item.fuel_type}` : ''}${pointsUsedSuffix(item.points_redeemed)}`}
                badge={item.points_earned ? `+${item.points_earned} pts` : undefined}
                badgeTone="success"
              />
            </GroupedItem>
          </FadeIn>
        )}
        ListEmptyComponent={<EmptyState icon="history" title="No fills yet" message="This customer has not filled here before." />}
      />
    );
  }

  return (
    <Screen scroll={false} padded={false} header={<AppHeader title="Customer history" onBack={() => navigation.goBack()} />}>
      {body}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  gap: {gap: space.md},
  padded: {padding: space.lg, gap: space.md},
  identity: {gap: space.md, marginBottom: space.sm},
  identityTop: {flexDirection: 'row', alignItems: 'center', gap: space.md},
  balance: {alignItems: 'flex-end'},
  plates: {flexDirection: 'row', flexWrap: 'wrap', gap: space.sm},
});
