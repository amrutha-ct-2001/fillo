import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {adjustmentQuestion, parseAdjustment} from '../../admin/validation';
import type {AdminCustomersStackParamList} from '../../navigation/types';
import {useAdjustPoints, useCustomerDetail} from '../../queries/admin';
import {space} from '../../theme/tokens';
import {AppHeader, Badge, Button, Card, confirm, ErrorState, Input, ListRow, Screen, showToast, Skeleton, SkeletonList, Text} from '../../ui';
import {describeError} from '../../utils/errors';
import {formatDateTime, formatInr, formatPhone, formatPlate} from '../../utils/format';
import {ledgerLabel, paymentLabel, pointsUsedSuffix, vehicleTypeLabel} from '../../utils/labels';

export function AdminCustomerDetailScreen() {
  const route = useRoute<RouteProp<AdminCustomersStackParamList, 'CustomerDetail'>>();
  const navigation = useNavigation<NativeStackNavigationProp<AdminCustomersStackParamList>>();
  const {customerId, name: seedName, phone: seedPhone} = route.params;
  const query = useCustomerDetail(customerId);
  const adjust = useAdjustPoints(customerId);
  const [delta, setDelta] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const d = query.data;
  const name = d?.customer.name || seedName || 'Customer';
  const phone = d?.customer.phone || seedPhone;

  const apply = async () => {
    setFormError(null);
    const parsed = parseAdjustment(delta);
    if (!parsed.ok) {
      setFormError(parsed.message);
      return;
    }
    const ok = await confirm({
      title: 'Change points',
      message: adjustmentQuestion(parsed.value, name),
      confirmLabel: parsed.value > 0 ? 'Add points' : 'Remove points',
      destructive: parsed.value < 0,
      icon: 'stars',
    });
    if (!ok) {
      return;
    }
    try {
      await adjust.mutateAsync({delta: parsed.value, note: note.trim()});
      setDelta('');
      setNote('');
      showToast('success', 'Points updated', adjustmentQuestion(parsed.value, name).replace(/\?$/, '.').replace(/^Add/, 'Added').replace(/^Remove/, 'Removed'));
    } catch (e) {
      setFormError(describeError(e).message);
    }
  };

  return (
    <Screen header={<AppHeader title={name} subtitle={phone ? formatPhone(phone) : undefined} onBack={() => navigation.goBack()} />}>
      {query.isError && !d ? (
        <ErrorState message={describeError(query.error).message} onRetry={() => query.refetch()} />
      ) : !d ? (
        <View style={styles.gap}>
          <Skeleton height={72} />
          <Skeleton height={200} />
          <Skeleton width={120} height={14} />
          <SkeletonList rows={3} />
        </View>
      ) : (
        <>
          <Card style={styles.balance}>
            <View>
              <Text variant="label" color="textSecondary">
                POINTS BALANCE
              </Text>
              <Text variant="heading">{`${d.balance} pts`}</Text>
            </View>
            {d.customer.is_active === false ? <Badge label="Inactive" tone="danger" /> : null}
          </Card>

          <Card style={styles.gap}>
            <Text variant="subheading">Change points</Text>
            <Input
              label="Points to add or remove"
              value={delta}
              onChangeText={v => {
                setFormError(null);
                setDelta(v);
              }}
              keyboardType="numbers-and-punctuation"
              placeholder="50 adds, -20 removes"
              error={formError ?? undefined}
            />
            <Input label="Reason (shown in the customer's history)" value={note} onChangeText={setNote} placeholder="e.g. Welcome bonus" />
            <Button title="Apply change" icon="points" onPress={apply} loading={adjust.isPending} disabled={!delta.trim()} />
          </Card>

          <View style={styles.gap}>
            <Text variant="label" color="textSecondary">
              VEHICLES
            </Text>
            {d.vehicles.length === 0 ? (
              <Text variant="body" color="textSecondary">
                No vehicles linked.
              </Text>
            ) : (
              <Card>
                {d.vehicles.map((v, i) => (
                  <ListRow key={v.id} first={i === 0} title={formatPlate(v.plate_number)} subtitle={vehicleTypeLabel(v.vehicle_type)} />
                ))}
              </Card>
            )}
          </View>

          <View style={styles.gap}>
            <Text variant="label" color="textSecondary">
              FILL HISTORY
            </Text>
            {d.transactions.length === 0 ? (
              <Text variant="body" color="textSecondary">
                No fills yet.
              </Text>
            ) : (
              <Card>
                {d.transactions.map((t, i) => (
                  <ListRow
                    key={t.id}
                    first={i === 0}
                    title={t.vehicle?.plate_number || 'Plate'}
                    subtitle={`${formatDateTime(t.created_at)} · ${paymentLabel(t.payment_mode)}${pointsUsedSuffix(t.points_redeemed)}`}
                    trailing={formatInr(t.amount)}
                    badge={t.points_earned ? `+${t.points_earned} pts` : undefined}
                    badgeTone="success"
                  />
                ))}
              </Card>
            )}
          </View>

          {d.ledger.length > 0 ? (
            <View style={styles.gap}>
              <Text variant="label" color="textSecondary">
                POINTS HISTORY
              </Text>
              <Card>
                {d.ledger.slice(0, 15).map((l, i) => (
                  <ListRow key={l.id} first={i === 0} title={ledgerLabel(l.type)} subtitle={l.note || formatDateTime(l.created_at)} trailing={`${l.delta >= 0 ? '+' : ''}${l.delta}`} />
                ))}
              </Card>
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: {gap: space.md},
  balance: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
});
