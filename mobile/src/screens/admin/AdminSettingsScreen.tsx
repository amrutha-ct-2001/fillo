import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {settingsExample, SettingsForm, settingsToForm, validateSettings} from '../../admin/validation';
import type {AdminSettingsStackParamList} from '../../navigation/types';
import {useSettings, useUpdateSettings} from '../../queries/admin';
import {space} from '../../theme/tokens';
import {useAuthStore} from '../../store/auth';
import {Button, Card, confirm, ErrorState, Input, ListRow, Screen, Skeleton, SuccessDialog, Text, Toggle} from '../../ui';
import {describeError} from '../../utils/errors';
import {formatDateTime} from '../../utils/format';

export function AdminSettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminSettingsStackParamList>>();
  const query = useSettings();
  const update = useUpdateSettings();
  const logout = useAuthStore(st => st.logout);
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const closeSaved = useCallback(() => setSaved(false), []);

  // Fill the form when the real settings arrive; never show made-up defaults.
  useEffect(() => {
    if (query.data && form === null) {
      setForm(settingsToForm(query.data));
    }
  }, [query.data, form]);

  const set = (key: keyof SettingsForm) => (v: string | boolean) => {
    setError(null);
    setForm(f => (f ? {...f, [key]: v} : f));
  };

  const dirty = !!form && !!query.data && JSON.stringify(form) !== JSON.stringify(settingsToForm(query.data));

  const save = async () => {
    if (!form) {
      return;
    }
    const checked = validateSettings(form);
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    try {
      const result = await update.mutateAsync(checked.value);
      setForm(settingsToForm(result));
      setSaved(true);
    } catch (e) {
      setError(describeError(e).message);
    }
  };

  const onLogout = async () => {
    if (await confirm({title: 'Log out', message: 'Sign out of Fillo?', confirmLabel: 'Log out', destructive: true, icon: 'logout'})) {
      logout();
    }
  };

  return (
    <Screen
      edges={['top']}
      footer={form ? <Button title="SAVE SETTINGS" icon="settings" large onPress={save} loading={update.isPending} disabled={!dirty} /> : undefined}>
      <Text variant="title" accessibilityRole="header">
        Settings
      </Text>
      <Card>
        <ListRow
          first
          icon="gas-station"
          title="Stations"
          subtitle="Add outlets and see who works where"
          onPress={() => navigation.navigate('Stations')}
        />
      </Card>
      <Text variant="heading">Loyalty rules</Text>
      {!form ? (
        query.isError ? (
          <ErrorState message={describeError(query.error).message} onRetry={() => query.refetch()} />
        ) : (
          <View style={styles.gap}>
            <Skeleton height={64} />
            <Skeleton height={64} />
            <Skeleton height={64} />
          </View>
        )
      ) : (
        <View style={styles.gap}>
          <Text variant="subheading">Earning points</Text>
          <Input label="Points earned" value={form.earnPoints} onChangeText={set('earnPoints')} keyboardType="number-pad" />
          <Input label="For every this many rupees" prefix="₹" value={form.earnUnit} onChangeText={set('earnUnit')} keyboardType="number-pad" hint={settingsExample(form)} />
          <Text variant="subheading">Using points</Text>
          <Input
            label="Value of 1 point (leave blank to switch off)"
            prefix="₹"
            value={form.redeemRate}
            onChangeText={set('redeemRate')}
            keyboardType="decimal-pad"
            placeholder="Not set"
          />
          <Input
            label="Fewest points a customer can use"
            value={form.minRedeem}
            onChangeText={v => set('minRedeem')(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            hint="Staff can offer points on a fill only when the customer has at least this many."
          />
          <Toggle
            label="Use this fill's points right away"
            description="Customers can use the points they earn on a fill on that same fill. Off: they wait for the next visit."
            value={form.instantRedeem}
            onChange={set('instantRedeem')}
            disabled={form.redeemRate.trim() === ''}
          />
          {error ? <ErrorState compact title="Not saved" message={error} /> : null}
          {query.data?.updated_at ? (
            <Text variant="caption" color="textSecondary">
              {`Last updated ${formatDateTime(query.data.updated_at)}`}
            </Text>
          ) : null}
        </View>
      )}
      <Button title="Log out" icon="logout" variant="secondary" onPress={onLogout} />
      <SuccessDialog
        visible={saved}
        title="Settings saved"
        message="New fills use these points rules from now on."
        onClose={closeSaved}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({gap: {gap: space.md}});
