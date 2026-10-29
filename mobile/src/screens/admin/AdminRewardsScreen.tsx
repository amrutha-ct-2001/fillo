import React, {useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import type {Redemption, VoucherStatus} from '../../api/types';
import type {AdminRewardsStackParamList} from '../../navigation/types';
import {useAllVouchers, useCancelVoucher, useRewards} from '../../queries/rewards';
import {space} from '../../theme/tokens';
import {Button, Chip, confirm, ListRow, ListScreen, SegmentedControl, showToast} from '../../ui';
import {describeError} from '../../utils/errors';
import {formatDateTime, formatPhone} from '../../utils/format';
import {stockLabel, voucherStatus} from '../../utils/labels';

type Tab = 'catalog' | 'vouchers';
type Nav = NativeStackNavigationProp<AdminRewardsStackParamList>;

const FILTERS: Array<{value: VoucherStatus | 'ALL'; label: string}> = [
  {value: 'PENDING', label: 'Ready to use'},
  {value: 'USED', label: 'Used'},
  {value: 'CANCELLED', label: 'Cancelled'},
  {value: 'ALL', label: 'All'},
];

function Switcher({tab, onChange}: {tab: Tab; onChange: (t: Tab) => void}) {
  return (
    <SegmentedControl<Tab>
      options={[
        {value: 'catalog', label: 'Catalog'},
        {value: 'vouchers', label: 'Vouchers'},
      ]}
      value={tab}
      onChange={onChange}
    />
  );
}

function Catalog({switcher}: {switcher: React.ReactNode}) {
  const navigation = useNavigation<Nav>();
  const query = useRewards();
  return (
    <ListScreen
      title="Rewards"
      subtitle="What customers can buy with points"
      query={query}
      keyExtractor={r => String(r.id)}
      empty={{icon: 'stars', title: 'No rewards yet', message: 'Add a reward such as a free car wash or a fuel voucher.'}}
      header={
        <View style={styles.header}>
          {switcher}
          <Button title="Add reward" icon="plus" onPress={() => navigation.navigate('RewardForm')} />
        </View>
      }
      renderItem={(item, index) => (
        <ListRow
          first={index === 0}
          icon="stars"
          iconTone={item.is_active ? 'accent' : 'neutral'}
          title={item.title}
          subtitle={`${item.points_cost} pts · ${stockLabel(item.stock)}`}
          badge={item.is_active ? undefined : 'Hidden'}
          badgeTone="danger"
          onPress={() => navigation.navigate('RewardForm', {rewardId: item.id})}
        />
      )}
    />
  );
}

function Vouchers({switcher}: {switcher: React.ReactNode}) {
  const [filter, setFilter] = useState<VoucherStatus | 'ALL'>('PENDING');
  const query = useAllVouchers(filter);
  const cancel = useCancelVoucher();

  const onCancel = async (v: Redemption) => {
    const ok = await confirm({
      title: 'Cancel voucher',
      message: `${v.code} for ${v.customer_name || formatPhone(v.customer_phone)} will stop working and ${v.points_spent} points go back to the customer.`,
      confirmLabel: 'Cancel voucher',
      cancelLabel: 'Keep',
      destructive: true,
      icon: 'stars',
    });
    if (!ok) {
      return;
    }
    try {
      await cancel.mutateAsync(v.id);
      showToast('success', 'Voucher cancelled', `${v.points_spent} points refunded.`);
    } catch (e) {
      showToast('error', 'Not cancelled', describeError(e).message);
    }
  };

  return (
    <ListScreen
      title="Rewards"
      subtitle="Vouchers customers have redeemed"
      query={query}
      keyExtractor={v => String(v.id)}
      empty={{icon: 'qr', title: 'No vouchers here', message: 'Vouchers appear when customers redeem rewards.'}}
      header={
        <View style={styles.header}>
          {switcher}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {FILTERS.map(f => (
              <Chip key={f.value} label={f.label} selected={filter === f.value} onPress={() => setFilter(f.value)} />
            ))}
          </ScrollView>
        </View>
      }
      renderItem={(item, index) => {
        const status = voucherStatus(item.status);
        return (
          <ListRow
            first={index === 0}
            icon="qr"
            iconTone={item.status === 'PENDING' ? 'accent' : 'neutral'}
            title={`${item.code} · ${item.reward.title}`}
            subtitle={`${item.customer_name || formatPhone(item.customer_phone)} · ${formatDateTime(item.created_at)}${item.status === 'PENDING' ? ' · tap to cancel' : ''}`}
            badge={status.label}
            badgeTone={status.tone}
            onPress={item.status === 'PENDING' ? () => onCancel(item) : undefined}
          />
        );
      }}
    />
  );
}

export function AdminRewardsScreen() {
  const [tab, setTab] = useState<Tab>('catalog');
  const switcher = <Switcher tab={tab} onChange={setTab} />;
  return tab === 'catalog' ? <Catalog switcher={switcher} /> : <Vouchers switcher={switcher} />;
}

const styles = StyleSheet.create({
  header: {gap: space.md, marginTop: space.sm},
  chips: {gap: space.sm},
});
