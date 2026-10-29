import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import type {User, Vehicle} from '../../api/types';
import {HsrpPlate} from '../../components/HsrpPlate';
import {Icon} from '../../components/Icon';
import type {StaffStackParamList} from '../../navigation/types';
import {lookupPhone, lookupPlate} from '../../staff/lookup';
import {radius, space} from '../../theme/tokens';
import {useTheme} from '../../theme/useTheme';
import {AppHeader, Button, Card, ErrorState, Input, Screen, Text, Touchable} from '../../ui';
import {maskPhone} from '../../utils/format';
import {vehicleTypeLabel} from '../../utils/labels';

type Mode = 'plate' | 'phone';
type Found = {customer: User; vehicles: Vehicle[]};

export function FindCustomerScreen() {
  const route = useRoute<RouteProp<StaffStackParamList, 'FindCustomer'>>();
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList>>();
  const t = useTheme();
  const [mode, setMode] = useState<Mode>(route.params?.mode ?? 'plate');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  /** A failed request: shown with Retry, never mistaken for "not found". */
  const [failure, setFailure] = useState<string | undefined>();
  const [found, setFound] = useState<Found | null>(null);

  const reset = () => {
    setError(undefined);
    setFailure(undefined);
    setFound(null);
  };

  const openVehicle = (customer: User, v: Vehicle) =>
    navigation.replace('Fill', {
      plate: v.plate_number,
      vehicleId: v.id,
      customerId: customer.id,
      phone: customer.phone,
      name: customer.name,
      pointsBalance: customer.points_balance ?? 0,
      isNew: false,
    });

  const search = async () => {
    reset();
    setLoading(true);
    try {
      if (mode === 'phone') {
        const r = await lookupPhone(value);
        if (r.status === 'invalid') {
          setError('Enter the 10-digit mobile number.');
        } else if (r.status === 'error') {
          setFailure(r.error.message);
        } else if (r.status === 'new') {
          setError('No customer has this number. Search by plate to register a new vehicle.');
        } else if (r.vehicles.length === 0) {
          setError('This customer has no vehicle yet. Search by plate to add one.');
        } else if (r.vehicles.length === 1) {
          openVehicle(r.customer, r.vehicles[0]);
        } else {
          // More than one vehicle: let staff choose which one is at the pump.
          setFound({customer: r.customer, vehicles: r.vehicles});
        }
        return;
      }
      const r = await lookupPlate(value);
      if (r.status === 'invalid') {
        setError('Enter the full plate number.');
      } else if (r.status === 'error') {
        setFailure(r.error.message);
      } else if (r.status === 'found') {
        openVehicle(r.vehicle.customer, r.vehicle);
      } else {
        navigation.replace('Fill', {plate: r.plate, isNew: true});
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setValue('');
    reset();
  };

  return (
    <Screen
      header={<AppHeader title="Find customer" onBack={() => navigation.goBack()} />}
      footer={<Button title="FIND" icon="search" large loading={loading} onPress={search} disabled={value.length === 0} />}>
      <View style={styles.modes}>
        {(['plate', 'phone'] as Mode[]).map(m => {
          const on = mode === m;
          return (
            <Touchable
              key={m}
              onPress={() => switchMode(m)}
              accessibilityLabel={m === 'plate' ? 'Search by plate' : 'Search by phone'}
              accessibilityState={{selected: on}}
              style={[styles.mode, {backgroundColor: on ? t.ink : t.surface, borderColor: on ? t.ink : t.borderStrong}]}>
              <Icon name={m === 'plate' ? 'plate' : 'phone'} size={20} color={on ? t.textOnInk : t.textPrimary} />
              <Text variant="label" style={{color: on ? t.textOnInk : t.textPrimary}}>
                {m === 'plate' ? 'PLATE' : 'PHONE'}
              </Text>
            </Touchable>
          );
        })}
      </View>

      <Input
        label={mode === 'phone' ? 'Customer mobile' : 'Plate number'}
        prefix={mode === 'phone' ? '+91' : undefined}
        value={value}
        onChangeText={v => {
          reset();
          setValue(mode === 'phone' ? v.replace(/\D/g, '').slice(0, 10) : v.toUpperCase());
        }}
        keyboardType={mode === 'phone' ? 'phone-pad' : 'default'}
        autoCapitalize={mode === 'phone' ? 'none' : 'characters'}
        maxLength={mode === 'phone' ? 10 : 12}
        placeholder={mode === 'phone' ? 'Enter mobile number' : 'KL07AB1234'}
        autoFocus
        returnKeyType="search"
        onSubmitEditing={search}
        error={error}
      />

      {failure ? <ErrorState compact title="Could not search" message={failure} onRetry={search} /> : null}

      {found ? (
        <Card style={styles.list}>
          <Text variant="subheading">{found.customer.name || 'Customer'}</Text>
          <Text variant="bodySmall" color="textSecondary">
            {maskPhone(found.customer.phone)} · pick the vehicle at the pump
          </Text>
          {found.vehicles.map(v => (
            <Touchable
              key={v.id}
              onPress={() => openVehicle(found.customer, v)}
              accessibilityLabel={`Fill ${v.plate_number}`}
              style={[styles.vehicle, {borderColor: t.border}]}>
              <HsrpPlate plate={v.plate_number} size="sm" />
              <Text variant="bodySmall" color="textSecondary" style={styles.vehicleType}>
                {vehicleTypeLabel(v.vehicle_type)}
                {v.model_name ? ` · ${v.model_name}` : ''}
              </Text>
              <Icon name="chevron-right" size={20} color={t.textSecondary} />
            </Touchable>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  modes: {flexDirection: 'row', gap: space.sm},
  mode: {
    flex: 1,
    minHeight: 56,
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: radius.md,
  },
  list: {gap: space.sm},
  vehicle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderTopWidth: 1,
  },
  vehicleType: {flex: 1},
});
