import React from 'react';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import type {AdminStaffStackParamList} from '../../navigation/types';
import {useStaffList} from '../../queries/admin';
import {Button, ListRow, ListScreen} from '../../ui';

export function AdminStaffScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminStaffStackParamList>>();
  const query = useStaffList();

  return (
    <ListScreen
      title="Staff"
      subtitle="Tap a person to edit"
      query={query}
      keyExtractor={s => String(s.id)}
      empty={{icon: 'staff', title: 'No staff yet', message: 'Add the first pump staff member to start.'}}
      header={<Button title="Add staff" icon="plus" onPress={() => navigation.navigate('StaffForm')} />}
      renderItem={(item, index) => (
        <ListRow
          first={index === 0}
          title={item.name?.trim() || item.username || 'Staff'}
          subtitle={item.username ? `@${item.username}` : undefined}
          badge={item.is_active ? 'Active' : 'Inactive'}
          badgeTone={item.is_active ? 'success' : 'danger'}
          onPress={() => navigation.navigate('StaffForm', {staffId: item.id})}
        />
      )}
    />
  );
}
