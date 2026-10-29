import React, {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';

import {LiveCamera, LiveCameraHandle} from '../../camera/LiveCamera';
import type {StaffStackParamList} from '../../navigation/types';
import {usePlateLookup} from '../../staff/usePlateLookup';
import {useScanActive} from '../../staff/useScanActive';
import {useSnapshotReader} from '../../staff/useSnapshotReader';
import {radius, space} from '../../theme/tokens';
import {useTheme} from '../../theme/useTheme';
import {Button, ErrorState, IconButton, Input, showToast, Text} from '../../ui';
import {takePhoto} from '../../utils/camera';
import {formatPlate} from '../../utils/format';
import {haptics} from '../../utils/haptics';
import {normalizePlate, recognizePlateFromImage} from '../../utils/ocr';

type Candidate = {plate: string; photoUri?: string};

const readPlate = async (uri: string) => (await recognizePlateFromImage(uri)).plate;

export const CAMERA_PROBLEM_DELAY_MS = 1500;

export function ScanPlateScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList>>();
  const t = useTheme();
  const camera = useRef<LiveCameraHandle>(null);
  const {active, idle, resume} = useScanActive();
  const [torch, setTorch] = useState(false);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [editing, setEditing] = useState(false);
  const [cameraProblem, setCameraProblem] = useState<string | null>(null);
  // The camera often reports a passing error while it starts up and then starts fine;
  // only show the problem if it is still there a moment later.
  const [showProblem, setShowProblem] = useState(false);
  const [reading, setReading] = useState(false);

  useEffect(() => {
    if (!cameraProblem) {
      setShowProblem(false);
      return;
    }
    const timer = setTimeout(() => setShowProblem(true), CAMERA_PROBLEM_DELAY_MS);
    return () => clearTimeout(timer);
  }, [cameraProblem]);

  const lookup = usePlateLookup(candidate?.plate ?? '');

  const take = useCallback(() => camera.current?.takeSnapshot() ?? Promise.resolve(null), []);
  useSnapshotReader({
    // Stop reading while a plate is waiting for confirmation.
    active: active && !candidate && !cameraProblem,
    take,
    read: readPlate,
    onPlate: (plate, uri) => {
      haptics.success();
      setCandidate({plate, photoUri: uri});
    },
  });

  // Last-resort reader: the phone's own camera app, one picture at a time.
  const readWithPhoneCamera = async () => {
    setReading(true);
    try {
      const uri = await takePhoto();
      if (!uri) {
        return;
      }
      const plate = await readPlate(uri);
      if (plate) {
        setCandidate({plate, photoUri: uri});
      } else {
        showToast('info', 'No plate found', 'Try again, or type the plate.');
      }
    } catch (e: any) {
      showToast('error', 'Camera problem', e?.message || 'Could not open the camera.');
    } finally {
      setReading(false);
    }
  };

  const clear = () => {
    setCandidate(null);
    setEditing(false);
  };

  const result = lookup.result;
  const plateText = candidate ? formatPlate(candidate.plate) : '';
  const customerLabel =
    result?.status === 'found' ? result.vehicle.customer.name || 'Customer' : result?.status === 'new' ? 'New vehicle' : '';

  const useCandidate = () => {
    if (!candidate || !result) {
      return;
    }
    if (result.status === 'found') {
      const c = result.vehicle.customer;
      navigation.replace('Fill', {
        plate: result.plate,
        vehicleId: result.vehicle.id,
        customerId: c.id,
        phone: c.phone,
        name: c.name,
        pointsBalance: c.points_balance ?? 0,
        vehiclePhotoUri: candidate.photoUri,
        isNew: false,
      });
    } else if (result.status === 'new') {
      navigation.replace('Fill', {plate: result.plate, vehiclePhotoUri: candidate.photoUri, isNew: true});
    }
  };

  const ready = result?.status === 'found' || result?.status === 'new';
  const useLabel = lookup.status === 'loading' ? `CHECKING ${plateText}…` : `USE ${plateText} · ${customerLabel}`;

  return (
    <View style={[styles.root, {backgroundColor: t.ink}]}>
      <SafeAreaView edges={['top']} style={{backgroundColor: t.ink}}>
        <View style={styles.top}>
          <IconButton icon="chevron-left" label="Go back" onPress={() => navigation.goBack()} />
          <Text variant="subheading" style={[styles.title, {color: t.textOnInk}]}>
            Scan plate
          </Text>
          <IconButton icon="flashlight" label={torch ? 'Turn torch off' : 'Turn torch on'} onPress={() => setTorch(v => !v)} />
        </View>
      </SafeAreaView>

      <View style={styles.cameraWrap}>
        <LiveCamera
          ref={camera}
          active={active}
          torch={torch}
          onError={setCameraProblem}
          onStarted={() => setCameraProblem(null)}
        />
        <View pointerEvents="none" style={styles.frame}>
          {(['tl', 'tr', 'bl', 'br'] as const).map(c => (
            <View key={c} style={[styles.corner, styles[c], {borderColor: t.accent}]} />
          ))}
        </View>
        {idle ? (
          <View style={[styles.overlay, {backgroundColor: t.ink}]}>
            <Text variant="subheading" style={{color: t.textOnInk}}>
              Camera paused
            </Text>
            <Text variant="body" style={[styles.center, {color: t.textOnInkMuted}]}>
              Paused to save battery.
            </Text>
            <Button title="Resume" variant="accent" onPress={resume} />
          </View>
        ) : null}
      </View>

      <SafeAreaView edges={['bottom']} style={[styles.panel, {backgroundColor: t.surface, borderTopColor: t.border}]}>
        {cameraProblem && showProblem && !candidate ? (
          <View style={styles.gap}>
            <ErrorState compact title="Live camera is not working" message={cameraProblem} />
            <Button title="Use phone camera" icon="camera" variant="accent" loading={reading} onPress={readWithPhoneCamera} />
          </View>
        ) : candidate ? (
          <View style={styles.gap}>
            {lookup.status === 'error' ? (
              <ErrorState
                compact
                title="Could not check this plate"
                message={result?.status === 'error' ? result.error.message : 'Try again.'}
                onRetry={lookup.retry}
              />
            ) : (
              <Button
                title={useLabel}
                variant="accent"
                large
                disabled={!ready}
                loading={lookup.status === 'loading'}
                onPress={useCandidate}
              />
            )}
            {editing ? (
              <Input
                label="Plate number"
                value={candidate.plate}
                autoCapitalize="characters"
                autoFocus
                maxLength={12}
                onChangeText={v => setCandidate({...candidate, plate: normalizePlate(v)})}
              />
            ) : null}
            <View style={styles.row}>
              <Button title={editing ? 'Done' : 'Edit'} variant="secondary" style={styles.flex} onPress={() => setEditing(e => !e)} />
              <Button title="Scan again" variant="secondary" style={styles.flex} onPress={clear} />
            </View>
          </View>
        ) : (
          <View style={styles.gap}>
            <Text variant="body" color="textSecondary" style={styles.center}>
              {active ? 'Hold the plate inside the frame' : 'Starting camera…'}
            </Text>
            <View style={styles.row}>
              <Button title="Type plate" icon="plate" variant="secondary" style={styles.flex} onPress={() => navigation.navigate('FindCustomer')} />
              <Button title="Phone" icon="phone" variant="secondary" style={styles.flex} onPress={() => navigation.navigate('FindCustomer', {mode: 'phone'})} />
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const CORNER = 36;
const styles = StyleSheet.create({
  root: {flex: 1},
  top: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm},
  title: {flex: 1, textAlign: 'center'},
  cameraWrap: {flex: 1},
  frame: {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, margin: space.xl * 1.5, marginVertical: space.xxl * 2},
  corner: {position: 'absolute', width: CORNER, height: CORNER},
  tl: {top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: radius.sm},
  tr: {top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: radius.sm},
  bl: {bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: radius.sm},
  br: {bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: radius.sm},
  overlay: {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl},
  panel: {padding: space.lg, borderTopWidth: 1},
  gap: {gap: space.md},
  row: {flexDirection: 'row', gap: space.sm},
  flex: {flex: 1},
  center: {textAlign: 'center'},
});
