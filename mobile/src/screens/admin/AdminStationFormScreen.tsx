import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';

import type {AdminSettingsStackParamList} from '../../navigation/types';
import {useSaveStation, useStations} from '../../queries/rewards';
import {space} from '../../theme/tokens';
import {AppHeader, Button, ErrorState, Input, Screen, showToast, Skeleton, Toggle} from '../../ui';
import {describeError} from '../../utils/errors';

export function AdminStationFormScreen() {
  const route = useRoute<RouteProp<AdminSettingsStackParamList, 'StationForm'>>();
  const navigation = useNavigation();
  const stationId = route.params?.stationId;
  const isNew = stationId === undefined;

  const list = useStations();
  const station = list.data?.find(s => s.id === stationId);
  const save = useSaveStation(stationId);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filled = useRef(false);

  useEffect(() => {
    if (station && !filled.current) {
      filled.current = true;
      setName(station.name);
      setAddress(station.address);
      setCity(station.city);
      setActive(station.is_active);
    }
  }, [station]);

  const waiting = !isNew && !station;

  const onSave = async () => {
    if (name.trim().length < 2) {
      setError('Enter the station name.');
      return;
    }
    setError(null);
    try {
      await save.mutateAsync({name: name.trim(), address: address.trim(), city: city.trim(), is_active: active});
      showToast('success', 'Saved', isNew ? 'Station added.' : 'Station updated.');
      navigation.goBack();
    } catch (e) {
      setError(describeError(e).message);
    }
  };

  return (
    <Screen
      header={<AppHeader title={isNew ? 'Add station' : 'Edit station'} onBack={() => navigation.goBack()} />}
      footer={waiting ? undefined : <Button title={isNew ? 'ADD STATION' : 'SAVE CHANGES'} icon="check" large onPress={onSave} loading={save.isPending} />}>
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
          <Input label="Station name" value={name} onChangeText={v => { setError(null); setName(v); }} autoCapitalize="words" placeholder="e.g. Fillo Central" autoFocus={isNew} />
          <Input label="Address (optional)" value={address} onChangeText={setAddress} autoCapitalize="words" />
          <Input label="City (optional)" value={city} onChangeText={setCity} autoCapitalize="words" />
          <Toggle label="Open" description="Closed stations are hidden from customers and cannot be picked for staff." value={active} onChange={setActive} />
          {error ? <ErrorState compact title="Not saved" message={error} /> : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({gap: {gap: space.md}});
