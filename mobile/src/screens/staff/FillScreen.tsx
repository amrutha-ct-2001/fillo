import React, {useCallback, useEffect, useMemo, useReducer, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {RouteProp, useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {pointsApi} from '../../api/client';
import type {PointsSettings} from '../../api/types';
import {HsrpPlate} from '../../components/HsrpPlate';
import {Icon} from '../../components/Icon';
import type {StaffStackParamList} from '../../navigation/types';
import {createDraft, draftReducer} from '../../staff/draft';
import {
  AMOUNT_CHIPS,
  computeTotals,
  PaymentMode,
  proofAllowed,
  redeemDescription,
  saveLabel,
  validateFill,
} from '../../staff/fill';
import {takePendingProof} from '../../staff/proofResult';
import {saveFill} from '../../staff/saveFill';
import {usePlateLookup} from '../../staff/usePlateLookup';
import {radius, space} from '../../theme/tokens';
import {useTheme} from '../../theme/useTheme';
import {
  AmountDisplay,
  AppHeader,
  Badge,
  Button,
  Card,
  ErrorState,
  Input,
  Screen,
  showToast,
  Text,
  Toggle,
  Touchable,
} from '../../ui';
import {formatInr, maskPhone} from '../../utils/format';
import {haptics} from '../../utils/haptics';
import {newFillId} from '../../utils/offlineQueue';
import {recognizePaymentFromImage} from '../../utils/ocr';

const MODES: PaymentMode[] = ['CASH', 'UPI', 'CARD'];

export function FillScreen() {
  const route = useRoute<RouteProp<StaffStackParamList, 'Fill'>>();
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList>>();
  const t = useTheme();
  const seed = route.params;

  const [draft, dispatch] = useReducer(draftReducer, undefined, () => createDraft(seed, newFillId()));
  const [settings, setSettings] = useState<PointsSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [readingProof, setReadingProof] = useState(false);
  const [amountFromPhoto, setAmountFromPhoto] = useState(false);
  const amountRef = useRef('');
  const modeRef = useRef<PaymentMode>('CASH');

  useEffect(() => {
    pointsApi
      .settings()
      .then(r => setSettings(r.data))
      .catch(() => undefined);
  }, []);

  // The scan or search that opened this screen already looked the plate up.
  // Only look again if staff change the plate.
  const seedResolved = seed.vehicleId !== undefined || seed.isNew !== undefined;
  const lookupInput = seedResolved && draft.plate === seed.plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase() ? '' : draft.plate;
  const lookup = usePlateLookup(lookupInput);

  useEffect(() => {
    if (lookup.result) {
      dispatch({type: 'lookup', result: lookup.result});
    }
  }, [lookup.result]);

  amountRef.current = draft.amount;
  modeRef.current = draft.mode;

  const totals = useMemo(
    () => computeTotals({amount: draft.amount, pointsBalance: draft.pointsBalance, settings, redeem: draft.redeem}),
    [draft.amount, draft.pointsBalance, settings, draft.redeem],
  );

  // Redeem switches itself off when it stops being possible (amount lowered, etc.)
  useEffect(() => {
    if (draft.redeem && !totals.available) {
      dispatch({type: 'redeem', on: false});
    }
  }, [draft.redeem, totals.available]);

  const checking = lookup.status === 'loading';
  const lookupFailed = lookup.status === 'error';
  const problem = validateFill({
    plate: draft.plate,
    amount: draft.amount,
    phone: draft.phone,
    isNewVehicle: draft.isNewVehicle,
  });
  const canSave = !problem && !checking && !lookupFailed && !saving && !readingProof;

  // The in-app proof camera leaves its picture behind; pick it up when we are shown again.
  useFocusEffect(
    useCallback(() => {
      const uri = takePendingProof();
      if (!uri) {
        return;
      }
      // A payment photo means a digital payment; Cash cannot carry one.
      if (modeRef.current === 'CASH') {
        dispatch({type: 'mode', mode: 'UPI'});
      }
      dispatch({type: 'proof', uri});
      setReadingProof(true);
      recognizePaymentFromImage(uri)
        .then(({amount, paymentMode}) => {
          if (paymentMode === 'UPI' || paymentMode === 'CARD') {
            dispatch({type: 'mode', mode: paymentMode});
          }
          // Only suggest an amount when staff have not typed one.
          if (amount && !amountRef.current) {
            dispatch({type: 'amount', amount});
            setAmountFromPhoto(true);
            haptics.tap();
          }
        })
        .catch(() => undefined) // reading the photo is a convenience; it stays attached
        .finally(() => setReadingProof(false));
    }, []),
  );

  const onSave = async () => {
    if (!canSave) {
      if (problem) {
        showToast('error', 'Check this fill', problem);
      }
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const outcome = await saveFill(draft, totals.points);
      if (outcome.kind === 'rejected') {
        // Staff keep everything they typed; a corrected retry is a new fill.
        dispatch({type: 'rejected', newId: newFillId()});
        setSaveError(outcome.message);
        haptics.error();
        return;
      }
      haptics.success();
      if (outcome.kind === 'queued') {
        navigation.replace('FillSuccess', {
          amount: draft.amount,
          pointsEarned: 0,
          balance: draft.pointsBalance,
          plate: draft.plate,
          offline: true,
          paymentMode: draft.mode,
          customerName: draft.name,
          customerPhone: draft.phone,
        });
        return;
      }
      const tx = outcome.transaction;
      navigation.replace('FillSuccess', {
        amount: tx.amount,
        pointsEarned: tx.points_earned,
        pointsUsed: tx.points_redeemed,
        balance: tx.customer_balance ?? draft.pointsBalance,
        plate: draft.plate,
        paymentMode: tx.payment_mode,
        customerName: tx.customer?.name || draft.name,
        customerPhone: tx.customer?.phone || draft.phone,
        fuelType: tx.fuel_type,
      });
    } finally {
      setSaving(false);
    }
  };

  const label = saving ? 'SAVING…' : problem && draft.amount ? 'CHECK DETAILS' : saveLabel(draft.amount, draft.mode);

  return (
    <Screen
      header={<AppHeader title="Fill" subtitle="Check the customer, enter the amount" onBack={() => navigation.goBack()} />}
      footer={
        <View style={styles.footer}>
          {problem && draft.amount ? (
            <Text variant="bodySmall" color="danger" accessibilityLiveRegion="polite">
              {problem}
            </Text>
          ) : null}
          {draft.amount && totals.points > 0 ? (
            <AmountDisplay size="normal" label={`Customer pays (after ${totals.points} points)`} amount={totals.payable} />
          ) : null}
          <Button title={label} variant="accent" large disabled={!canSave && !saving} loading={saving} onPress={onSave} />
        </View>
      }>
      {/* 1. Customer first: staff must see who this is before typing an amount. */}
      <Card style={styles.gap}>
        <Text variant="label" color="textSecondary">
          VEHICLE
        </Text>
        <HsrpPlate
          plate={draft.plate}
          size="lg"
          editable
          onChangePlate={v => dispatch({type: 'editPlate', plate: v})}
        />
        {checking ? (
          <Text variant="body" color="textSecondary">
            Checking customer…
          </Text>
        ) : lookupFailed ? (
          <ErrorState
            compact
            title="Could not check this plate"
            message={lookup.result?.status === 'error' ? lookup.result.error.message : 'Try again.'}
            onRetry={lookup.retry}
          />
        ) : draft.isNewVehicle ? (
          <View style={styles.gap}>
            <Badge label="NEW VEHICLE" tone="warning" icon="plus" />
            <Input
              label="Customer mobile"
              prefix="+91"
              keyboardType="phone-pad"
              maxLength={10}
              value={draft.phone}
              onChangeText={v => dispatch({type: 'phone', phone: v})}
              placeholder="Enter mobile number"
            />
            <Input label="Customer name (optional)" value={draft.name} onChangeText={v => dispatch({type: 'name', name: v})} autoCapitalize="words" />
          </View>
        ) : (
          <View style={styles.customerRow}>
            <View style={styles.flex}>
              <Text variant="subheading" numberOfLines={1}>
                {draft.name || 'Customer'}
              </Text>
              <Text variant="bodySmall" color="textSecondary">
                {maskPhone(draft.phone)}
              </Text>
            </View>
            <Badge label={`${draft.pointsBalance} pts`} tone="success" icon="stars" />
          </View>
        )}
      </Card>

      {/* 2. Amount */}
      <Card style={styles.gap}>
        <Input
          label="Amount"
          prefix="₹"
          keyboardType="decimal-pad"
          value={draft.amount}
          onChangeText={v => {
            setAmountFromPhoto(false);
            dispatch({type: 'amount', amount: v});
          }}
          placeholder="0"
          hint={amountFromPhoto ? 'Read from the payment photo. Check it before saving.' : undefined}
        />
        <View style={styles.chips}>
          {AMOUNT_CHIPS.map(c => {
            const on = Number(draft.amount) === c;
            return (
              <Touchable
                key={c}
                onPress={() => {
                  setAmountFromPhoto(false);
                  dispatch({type: 'amount', amount: String(c)});
                }}
                accessibilityLabel={`Amount ${formatInr(c)}`}
                accessibilityState={{selected: on}}
                style={[
                  styles.chip,
                  {backgroundColor: on ? t.ink : t.surface, borderColor: on ? t.ink : t.borderStrong},
                ]}>
                <Text variant="label" style={{color: on ? t.textOnInk : t.textPrimary}}>
                  {formatInr(c)}
                </Text>
              </Touchable>
            );
          })}
        </View>
      </Card>

      {/* 3. Payment: Cash by default; the photo is optional and only for UPI / Card. */}
      <Card style={styles.gap}>
        <Text variant="label" color="textSecondary">
          PAID BY
        </Text>
        <View style={styles.modes}>
          {MODES.map(m => {
            const on = draft.mode === m;
            return (
              <Touchable
                key={m}
                onPress={() => dispatch({type: 'mode', mode: m})}
                accessibilityLabel={`Paid by ${m}`}
                accessibilityState={{selected: on}}
                style={[
                  styles.mode,
                  {backgroundColor: on ? t.ink : t.surface, borderColor: on ? t.ink : t.borderStrong},
                ]}>
                {on ? <Icon name="check" size={18} color={t.textOnInk} /> : null}
                <Text variant="label" style={{color: on ? t.textOnInk : t.textPrimary}}>
                  {m}
                </Text>
              </Touchable>
            );
          })}
        </View>
        {proofAllowed(draft.mode) ? (
          <View style={styles.gap}>
            {draft.proofUri ? (
              <Badge label={readingProof ? 'Reading photo…' : 'Payment photo attached'} tone="success" icon="check-circle" />
            ) : null}
            <Button
              title={draft.proofUri ? 'Retake payment photo' : 'Add payment photo (optional)'}
              icon="camera"
              variant="secondary"
              onPress={() => navigation.navigate('ProofCamera')}
              disabled={readingProof}
            />
          </View>
        ) : null}
      </Card>

      {/* 4. Redeem, only when the customer can use points on this amount. */}
      {totals.available ? (
        <Toggle
          label="Use points"
          description={redeemDescription(draft.pointsBalance, totals)}
          value={draft.redeem}
          onChange={on => dispatch({type: 'redeem', on})}
        />
      ) : null}

      {saveError ? <ErrorState compact title="Not saved" message={saveError} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  gap: {gap: space.md},
  footer: {gap: space.md},
  customerRow: {flexDirection: 'row', alignItems: 'center', gap: space.md},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: space.sm},
  chip: {
    minWidth: 88,
    paddingHorizontal: space.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: radius.md,
  },
  modes: {flexDirection: 'row', gap: space.sm},
  mode: {
    flex: 1,
    minHeight: 56,
    flexDirection: 'row',
    gap: space.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: radius.md,
  },
});
