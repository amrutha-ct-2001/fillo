import React, {useRef} from 'react';
import {BackHandler, StyleSheet, View} from 'react-native';
import {RouteProp, useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {HsrpPlate} from '../../components/HsrpPlate';
import {Icon} from '../../components/Icon';
import type {StaffStackParamList} from '../../navigation/types';
import {savedHeadline, savedOfflineNote, savedPointsLine} from '../../staff/saved';
import {space} from '../../theme/tokens';
import {useTheme} from '../../theme/useTheme';
import {AmountDisplay, Badge, Button, Card, ListRow, Screen, Text} from '../../ui';
import {formatDateTime, maskPhone} from '../../utils/format';
import {paymentLabel} from '../../utils/labels';

export function FillSuccessScreen() {
  const route = useRoute<RouteProp<StaffStackParamList, 'FillSuccess'>>();
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList>>();
  const t = useTheme();
  const {amount, pointsEarned, pointsUsed = 0, balance, plate, offline = false, paymentMode, customerName, customerPhone, fuelType} =
    route.params;
  const savedAt = useRef(new Date()).current;

  // The fill is saved. Back must not return to the filled-in form (that would
  // allow a duplicate fill), so send it home instead.
  useFocusEffect(
    React.useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        navigation.popToTop();
        return true;
      });
      return () => sub.remove();
    }, [navigation]),
  );

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          <Button
            title="NEXT VEHICLE"
            variant="accent"
            large
            icon="gas-station"
            onPress={() =>
              // Fresh stack, so repeated fills don't pile up screens.
              navigation.reset({index: 1, routes: [{name: 'StaffHome'}, {name: 'ScanPlate'}]})
            }
          />
          <Button title="Back to home" variant="secondary" onPress={() => navigation.popToTop()} />
        </View>
      }>
      <View style={styles.hero} accessibilityRole="header">
        <Icon name="check-circle" size={56} color={offline ? t.accentText : t.success} />
        <Text variant="title">{savedHeadline(offline)}</Text>
        {offline ? <Badge label="NOT UPLOADED YET" tone="warning" icon="cloud-off" /> : null}
        <HsrpPlate plate={plate} />
      </View>

      {offline ? (
        <Card tone="tonal">
          <Text variant="body">{savedOfflineNote()}</Text>
        </Card>
      ) : null}

      <Card>
        <AmountDisplay amount={amount} label={fuelType ? `Fuel · ${fuelType}` : 'Amount'} />
        <ListRow first title="Points" subtitle={savedPointsLine(offline, pointsEarned, balance, pointsUsed)} />
        <ListRow title="Paid by" trailing={paymentLabel(paymentMode) || '—'} />
        <ListRow title={customerName || 'Customer'} subtitle={customerPhone ? maskPhone(customerPhone) : undefined} />
        <ListRow title="Time" trailing={formatDateTime(savedAt)} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {alignItems: 'center', gap: space.md, paddingTop: space.lg},
  footer: {gap: space.md},
});
