import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import {rewardApi} from '../../api/client';
import type {Redemption} from '../../api/types';
import {space} from '../../theme/tokens';
import {AppHeader, Badge, Button, Card, ErrorState, IconBubble, Input, Screen, showToast, Text} from '../../ui';
import {describeError} from '../../utils/errors';
import {formatDateTime, formatPhone} from '../../utils/format';
import {voucherStatus} from '../../utils/labels';

/** Voucher codes are 6 letters/digits, typed in capitals. */
export const cleanVoucherCode = (v: string) => v.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 12);

export function VerifyVoucherScreen() {
  const navigation = useNavigation();
  const [code, setCode] = useState('');
  const [voucher, setVoucher] = useState<Redemption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [using, setUsing] = useState(false);

  const check = async () => {
    setError(null);
    setVoucher(null);
    setChecking(true);
    try {
      setVoucher((await rewardApi.checkVoucher(code)).data);
    } catch (e) {
      setError(describeError(e).message);
    } finally {
      setChecking(false);
    }
  };

  const markUsed = async () => {
    if (!voucher) {
      return;
    }
    setError(null);
    setUsing(true);
    try {
      const done = (await rewardApi.useVoucher(voucher.code)).data;
      setVoucher(done);
      showToast('success', 'Voucher used', `Give the customer: ${done.reward.title}.`);
    } catch (e) {
      setError(describeError(e).message);
    } finally {
      setUsing(false);
    }
  };

  const status = voucher ? voucherStatus(voucher.status) : null;
  const usable = voucher?.status === 'PENDING';

  return (
    <Screen
      header={<AppHeader title="Verify voucher" subtitle="Code from the customer's app" onBack={() => navigation.goBack()} />}
      footer={
        usable ? (
          <Button title="MARK AS USED" icon="check" variant="accent" large loading={using} onPress={markUsed} />
        ) : (
          <Button title="CHECK CODE" icon="search" large loading={checking} disabled={code.length < 4} onPress={check} />
        )
      }>
      <Input
        label="Voucher code"
        value={code}
        onChangeText={v => {
          setError(null);
          setVoucher(null);
          setCode(cleanVoucherCode(v));
        }}
        autoCapitalize="characters"
        placeholder="e.g. K7M2QX"
        autoFocus
        returnKeyType="search"
        onSubmitEditing={() => code.length >= 4 && check()}
        style={styles.code}
      />
      {error ? <ErrorState compact title="Could not check" message={error} /> : null}

      {voucher && status ? (
        <Card style={styles.card}>
          <View style={styles.row}>
            <IconBubble icon="stars" tone={usable ? 'accent' : 'neutral'} size={52} />
            <View style={styles.flex}>
              <Text variant="heading">{voucher.reward.title}</Text>
              <Text variant="bodySmall" color="textSecondary">
                {`${voucher.points_spent} points`}
              </Text>
            </View>
          </View>
          <Badge label={status.label} tone={status.tone} icon={usable ? 'verified' : 'info'} />
          <Text variant="body">{voucher.customer_name || 'Customer'}</Text>
          <Text variant="bodySmall" color="textSecondary">
            {formatPhone(voucher.customer_phone)}
          </Text>
          <Text variant="caption" color="textSecondary">
            {voucher.status === 'USED' && voucher.used_at
              ? `Used ${formatDateTime(voucher.used_at)}${voucher.verified_by_name ? ` · by ${voucher.verified_by_name}` : ''}`
              : `Redeemed ${formatDateTime(voucher.created_at)}`}
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  card: {gap: space.sm},
  row: {flexDirection: 'row', alignItems: 'center', gap: space.md},
  code: {letterSpacing: 4},
});
