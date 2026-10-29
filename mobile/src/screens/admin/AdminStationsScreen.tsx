import React from 'react';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import type {AdminSettingsStackParamList} from '../../navigation/types';
import {useStations} from '../../queries/rewards';
import {AppHeader, Button, ListRow, ListScreen} from '../../ui';
import {pluralize} from '../../utils/format';

export function AdminStationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminSettingsStackParamList>>();
  const query = useStations();

  return (
    <ListScreen
      topBar={<AppHeader title="Stations" onBack={() => navigation.goBack()} />}
      title="Your stations"
      subtitle="Staff work at one station; fills record where they happened"
      query={query}
      keyExtractor={s => String(s.id)}
      empty={{icon: 'gas-station', title: 'No stations yet', message: 'Add your first fuel station.'}}
      header={<Button title="Add station" icon="plus" onPress={() => navigation.navigate('StationForm')} />}
      renderItem={(item, index) => (
        <ListRow
          first={index === 0}
          icon="gas-station"
          iconTone={item.is_active ? 'brand' : 'neutral'}
          title={item.name}
          subtitle={[item.city, pluralize(item.staff_count ?? 0, 'staff member')].filter(Boolean).join(' · ')}
          badge={item.is_active ? undefined : 'Closed'}
          badgeTone="danger"
          onPress={() => navigation.navigate('StationForm', {stationId: item.id})}
        />
      )}
    />
  );
}
