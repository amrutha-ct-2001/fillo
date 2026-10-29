import React, {useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';

import {LiveCamera, LiveCameraHandle} from '../../camera/LiveCamera';
import type {StaffStackParamList} from '../../navigation/types';
import {setPendingProof} from '../../staff/proofResult';
import {useScanActive} from '../../staff/useScanActive';
import {space} from '../../theme/tokens';
import {useTheme} from '../../theme/useTheme';
import {Button, ErrorState, IconButton, showToast, Text} from '../../ui';
import {takePhoto} from '../../utils/camera';
import {haptics} from '../../utils/haptics';

/** In-app camera for the customer's payment screen (UPI / card receipt). */
export function ProofCameraScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList>>();
  const t = useTheme();
  const camera = useRef<LiveCameraHandle>(null);
  const {active, idle, resume} = useScanActive();
  const [torch, setTorch] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const finish = (uri: string) => {
    setPendingProof(uri);
    haptics.success();
    navigation.goBack();
  };

  const shoot = async () => {
    setBusy(true);
    try {
      const uri = await camera.current?.takeSnapshot();
      if (uri) {
        finish(uri);
      } else {
        showToast('info', 'No picture', 'Try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const usePhoneCameraApp = async () => {
    setBusy(true);
    try {
      const uri = await takePhoto({quality: 0.8});
      if (uri) {
        finish(uri);
      }
    } catch (e: any) {
      showToast('error', 'Camera problem', e?.message || 'Could not open the camera.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.root, {backgroundColor: t.ink}]}>
      <SafeAreaView edges={['top']} style={{backgroundColor: t.ink}}>
        <View style={styles.top}>
          <IconButton icon="chevron-left" label="Cancel" onPress={() => navigation.goBack()} />
          <Text variant="subheading" style={[styles.title, {color: t.textOnInk}]}>
            Payment photo
          </Text>
          <IconButton icon="flashlight" label={torch ? 'Turn torch off' : 'Turn torch on'} onPress={() => setTorch(v => !v)} />
        </View>
      </SafeAreaView>

      <View style={styles.flex}>
        <LiveCamera ref={camera} active={active} torch={torch} onError={setProblem} onStarted={() => setProblem(null)} />
        {idle ? (
          <View style={[styles.overlay, {backgroundColor: t.ink}]}>
            <Text variant="subheading" style={{color: t.textOnInk}}>
              Camera paused
            </Text>
            <Button title="Resume" variant="accent" onPress={resume} />
          </View>
        ) : null}
      </View>

      <SafeAreaView edges={['bottom']} style={[styles.panel, {backgroundColor: t.surface, borderTopColor: t.border}]}>
        {problem ? (
          <View style={styles.gap}>
            <ErrorState compact title="Live camera is not working" message={problem} />
            <Button title="Use phone camera" icon="camera" variant="accent" loading={busy} onPress={usePhoneCameraApp} />
          </View>
        ) : (
          <View style={styles.gap}>
            <Text variant="body" color="textSecondary" style={styles.center}>
              Fit the customer’s payment screen in the picture
            </Text>
            <Button title="TAKE PHOTO" icon="camera" variant="accent" large loading={busy} onPress={shoot} />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  flex: {flex: 1},
  top: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm},
  title: {flex: 1, textAlign: 'center'},
  overlay: {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: space.md},
  panel: {padding: space.lg, borderTopWidth: 1},
  gap: {gap: space.md},
  center: {textAlign: 'center'},
});
