import React, {useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import type {AdminCustomersStackParamList} from '../../navigation/types';
import {useCustomers} from '../../queries/admin';
import {Input, ListRow, ListScreen} from '../../ui';
import {maskPhone} from '../../utils/format';
import {useDebounced} from '../../utils/useDebounced';

export function AdminCustomersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminCustomersStackParamList>>();
  const [text, setText] = useState('');
  const q = useDebounced(text.trim());
  const query = useCustomers(q);

  return (
    <ListScreen
      title="Customers"
      subtitle="Tap a customer to see details"
      query={query}
      keyExtractor={c => String(c.id)}
      empty={{icon: q ? 'search' : 'customers', title: q ? 'No customer found' : 'No customers yet', message: q ? 'Check the phone number or name.' : 'Customers appear after their first fill.'}}
      header={<Input label="Search" placeholder="Phone or name" value={text} onChangeText={setText} returnKeyType="search" />}
      renderItem={(item, index) => (
        <ListRow
          first={index === 0}
          title={item.name || 'Customer'}
          subtitle={maskPhone(item.phone)}
          trailing={`${item.points_balance ?? 0} pts`}
          onPress={() => navigation.navigate('CustomerDetail', {customerId: item.id, name: item.name, phone: item.phone})}
        />
      )}
    />
  );
}
