import React, {useCallback, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import type {Redemption, Reward} from '../../api/types';
import {useMyPoints} from '../../queries/customer';
import {useMyVouchers, useRedeemReward, useRewards} from '../../queries/rewards';
import {useAuthStore} from '../../store/auth';
import {space} from '../../theme/tokens';
import {
  Badge,
  Button,
  Card,
  confirm,
  EmptyState,
  ErrorState,
  GradientCard,
  IconBubble,
  Screen,
  SegmentedControl,
  SkeletonList,
  SuccessDialog,
  Text,
} from '../../ui';
import {describeError} from '../../utils/errors';
import {formatDateTime, pluralize} from '../../utils/format';
import {stockLabel, voucherStatus} from '../../utils/labels';

type Tab = 'catalog' | 'vouchers';

function RewardCard({reward, balance, onRedeem, busy}: {reward: Reward; balance: number | undefined; onRedeem: () => void; busy: boolean}) {
  const outOfStock = reward.stock === 0;
  const short = balance === undefined ? 0 : reward.points_cost - balance;
  return (
    <Card style={styles.card}>
      <View style={styles.cardTop}>
        <IconBubble icon="stars" tone="accent" size={48} />
        <View style={styles.flex}>
          <Text variant="subheading">{reward.title}</Text>
          {reward.description ? (
            <Text variant="bodySmall" color="textSecondary">
              {reward.description}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.cardBottom}>
        <View style={styles.flex}>
          <Text variant="heading" color="ink">
            {`${reward.points_cost} pts`}
          </Text>
          <Text variant="caption" color="textSecondary">
            {short > 0 && !outOfStock ? `${pluralize(short, 'more point')} needed` : stockLabel(reward.stock)}
          </Text>
        </View>
        <Button
          title={outOfStock ? 'Sold out' : 'Redeem'}
          variant="accent"
          compact
          icon="stars"
          disabled={outOfStock || short > 0 || balance === undefined}
          loading={busy}
          onPress={onRedeem}
          accessibilityLabel={`Redeem ${reward.title} for ${reward.points_cost} points`}
        />
      </View>
    </Card>
  );
}

function VoucherCard({voucher}: {voucher: Redemption}) {
  const status = voucherStatus(voucher.status);
  const live = voucher.status === 'PENDING';
  return (
    <Card style={styles.card} tone={live ? 'elevated' : 'tonal'}>
      <View style={styles.cardBottom}>
        <View style={styles.flex}>
          <Text variant="subheading">{voucher.reward.title}</Text>
          <Text variant="caption" color="textSecondary">
            {voucher.status === 'USED' && voucher.used_at ? `Used ${formatDateTime(voucher.used_at)}` : `Got ${formatDateTime(voucher.created_at)}`}
          </Text>
        </View>
        <Badge label={status.label} tone={status.tone} />
      </View>
      <View style={styles.codeBox} accessible accessibilityLabel={`Voucher code ${voucher.code.split('').join(' ')}`}>
        <Text variant="plate" color={live ? 'ink' : 'textSecondary'}>
          {voucher.code}
        </Text>
      </View>
      {live ? (
        <Text variant="caption" color="textSecondary">
          Show this code at the counter. Staff will mark it as used.
        </Text>
      ) : null}
    </Card>
  );
}

export function CustomerRewardsScreen() {
  const user = useAuthStore(s => s.user);
  const points = useMyPoints();
  const rewards = useRewards();
  const vouchers = useMyVouchers();
  const redeem = useRedeemReward();
  const [tab, setTab] = useState<Tab>('catalog');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [got, setGot] = useState<Redemption | null>(null);
  const closeGot = useCallback(() => setGot(null), []);

  const balance = points.data?.balance ?? user?.points_balance;

  const onRedeem = async (reward: Reward) => {
    const ok = await confirm({
      title: `Redeem ${reward.title}?`,
      message: `${reward.points_cost} points will be taken from your balance and you get a voucher code to show at the counter.`,
      confirmLabel: 'Redeem',
      icon: 'stars',
    });
    if (!ok) {
      return;
    }
    setError(null);
    setBusyId(reward.id);
    try {
      setGot(await redeem.mutateAsync(reward.id));
    } catch (e) {
      setError(describeError(e).message);
    } finally {
      setBusyId(null);
    }
  };

  const pending = (vouchers.data ?? []).filter(v => v.status === 'PENDING').length;

  return (
    <Screen edges={['top']}>
      <Text variant="title" accessibilityRole="header">
        Rewards
      </Text>
      <GradientCard gradient="night">
        <Text variant="overline" color="textOnInkMuted">
          AVAILABLE TO SPEND
        </Text>
        <Text variant="display" color="accent">
          {balance === undefined ? '…' : String(balance)}
        </Text>
        <Text variant="bodySmall" color="textOnInkMuted">
          {pending ? `${pluralize(pending, 'voucher')} ready to use` : 'Swap points for treats at the station'}
        </Text>
      </GradientCard>

      <SegmentedControl<Tab>
        options={[
          {value: 'catalog', label: 'Catalog'},
          {value: 'vouchers', label: pending ? `My vouchers (${pending})` : 'My vouchers'},
        ]}
        value={tab}
        onChange={setTab}
      />
      {error ? <ErrorState compact title="Not redeemed" message={error} /> : null}

      {tab === 'catalog' ? (
        rewards.data === undefined ? (
          rewards.isError ? (
            <ErrorState message={describeError(rewards.error).message} onRetry={() => rewards.refetch()} />
          ) : (
            <SkeletonList rows={3} />
          )
        ) : rewards.data.length === 0 ? (
          <EmptyState icon="stars" title="No rewards yet" message="The station has not added any rewards. Check back soon." />
        ) : (
          rewards.data.map(r => (
            <RewardCard key={r.id} reward={r} balance={balance} busy={busyId === r.id} onRedeem={() => onRedeem(r)} />
          ))
        )
      ) : vouchers.data === undefined ? (
        vouchers.isError ? (
          <ErrorState message={describeError(vouchers.error).message} onRetry={() => vouchers.refetch()} />
        ) : (
          <SkeletonList rows={3} />
        )
      ) : vouchers.data.length === 0 ? (
        <EmptyState icon="qr" title="No vouchers yet" message="Redeem a reward from the catalog and its code shows up here." />
      ) : (
        vouchers.data.map(v => <VoucherCard key={v.id} voucher={v} />)
      )}

      <SuccessDialog
        visible={!!got}
        title="Reward redeemed"
        message={got ? `Your code is ${got.code}. Show it at the counter to claim ${got.reward.title}.` : ''}
        autoCloseMs={8000}
        onClose={() => {
          closeGot();
          setTab('vouchers');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  card: {gap: space.md},
  cardTop: {flexDirection: 'row', gap: space.md, alignItems: 'flex-start'},
  cardBottom: {flexDirection: 'row', alignItems: 'center', gap: space.md},
  codeBox: {alignItems: 'center', paddingVertical: space.md},
});
