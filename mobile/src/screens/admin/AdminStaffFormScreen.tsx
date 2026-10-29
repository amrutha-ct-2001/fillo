import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {digits4, validateStaff} from '../../admin/validation';
import type {AdminStaffStackParamList} from '../../navigation/types';
import {useCreateStaff, useSetStaffActive, useStaffList, useUpdateStaff} from '../../queries/admin';
import {useStations} from '../../queries/rewards';
import {space} from '../../theme/tokens';
import {AppHeader, Badge, Button, Chip, confirm, ErrorState, Input, Screen, showToast, Skeleton, Text} from '../../ui';
import {describeError} from '../../utils/errors';

export function AdminStaffFormScreen() {
  const route = useRoute<RouteProp<AdminStaffStackParamList, 'StaffForm'>>();
  const navigation = useNavigation<NativeStackNavigationProp<AdminStaffStackParamList>>();
  const staffId = route.params?.staffId;
  const isNew = staffId === undefined;

  const list = useStaffList();
  const person = list.data?.find(s => s.id === staffId);
  const create = useCreateStaff();
  const update = useUpdateStaff(staffId ?? 0);
  const setActive = useSetStaffActive(staffId ?? 0);

  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [stationId, setStationId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const filled = useRef(false);
  const stations = useStations();
  // Closed stations can't be picked, but a person already at one still shows it.
  const stationChoices = (stations.data ?? []).filter(s => s.is_active || s.id === stationId);

  // Fill the form once, when the person arrives (not on every refetch, which would erase typing).
  useEffect(() => {
    if (person && !filled.current) {
      filled.current = true;
      setUsername(person.username || '');
      setName(person.name || '');
      setStationId(person.station_id ?? null);
    }
  }, [person]);

  const waiting = !isNew && !person;
  const busy = create.isPending || update.isPending || setActive.isPending;

  const save = async () => {
    const problem = validateStaff({username, pin, isNew});
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    try {
      if (isNew) {
        await create.mutateAsync({username: username.trim(), name: name.trim(), pin, station_id: stationId});
      } else {
        await update.mutateAsync({username: username.trim(), name: name.trim(), station_id: stationId, ...(pin.length === 4 ? {pin} : null)});
      }
      showToast('success', 'Saved', isNew ? 'Staff member added.' : pin ? 'Details and PIN updated.' : 'Details updated.');
      navigation.goBack();
    } catch (e) {
      setError(describeError(e).message);
    }
  };

  const toggleActive = async () => {
    if (!person) {
      return;
    }
    if (person.is_active) {
      const ok = await confirm({
        title: 'Deactivate staff',
        message: `${person.name?.trim() || person.username} will not be able to sign in until you activate them again.`,
        confirmLabel: 'Deactivate',
        destructive: true,
        icon: 'staff',
      });
      if (!ok) {
        return;
      }
    }
    try {
      await setActive.mutateAsync(!person.is_active);
    } catch (e) {
      setError(describeError(e).message);
    }
  };

  return (
    <Screen
      header={
        <AppHeader
          title={isNew ? 'Add staff' : 'Edit staff'}
          onBack={() => navigation.goBack()}
          right={person ? <Badge label={person.is_active ? 'Active' : 'Inactive'} tone={person.is_active ? 'success' : 'danger'} /> : undefined}
        />
      }
      footer={waiting ? undefined : <Button title={isNew ? 'SAVE STAFF' : 'SAVE CHANGES'} icon="check" large onPress={save} loading={create.isPending || update.isPending} />}>
      {waiting ? (
        list.isError ? (
          <ErrorState message={describeError(list.error).message} onRetry={() => list.refetch()} />
        ) : (
          <View style={styles.gap}>
            <Skeleton height={64} />
            <Skeleton height={64} />
          </View>
        )
      ) : (
        <View style={styles.gap}>
          <Input label="Username" value={username} onChangeText={v => { setError(null); setUsername(v); }} autoCapitalize="none" placeholder="e.g. ravi" autoFocus={isNew} />
          <Input label="Name" value={name} onChangeText={setName} autoCapitalize="words" placeholder="Shown on the home screen" />
          {stationChoices.length ? (
            <View style={styles.stations}>
              <Text variant="label" color="textSecondary">
                Works at
              </Text>
              <View style={styles.chips} accessibilityRole="radiogroup">
                <Chip label="No station" selected={stationId === null} onPress={() => setStationId(null)} />
                {stationChoices.map(s => (
                  <Chip key={s.id} label={s.name} icon="gas-station" selected={stationId === s.id} onPress={() => setStationId(s.id)} />
                ))}
              </View>
            </View>
          ) : null}
          <Input
            label={isNew ? 'PIN (4 digits)' : 'New PIN (leave blank to keep the old one)'}
            value={pin}
            onChangeText={v => { setError(null); setPin(digits4(v)); }}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            placeholder="••••"
          />
          {error ? <ErrorState compact title="Not saved" message={error} /> : null}
          {person ? (
            <Button title={person.is_active ? 'Deactivate' : 'Activate'} variant={person.is_active ? 'danger' : 'secondary'} loading={setActive.isPending} disabled={busy && !setActive.isPending} onPress={toggleActive} />
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: {gap: space.md},
  stations: {gap: space.xs},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: space.sm},
});
