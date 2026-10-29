import React, {useEffect, useImperativeHandle, useRef} from 'react';
import {Linking, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {
  Camera,
  CameraRef,
  CommonResolutions,
  useCameraPermission,
  usePhotoOutput,
} from 'react-native-vision-camera';

import {space} from '../theme/tokens';
import {useTheme} from '../theme/useTheme';
import {Button, Text} from '../ui';

export type LiveCameraHandle = {
  /** Takes one still, silently, and returns its `file://` URI (null if the camera is not ready). */
  takeSnapshot: () => Promise<string | null>;
};

type Props = {
  /** Camera runs only while true. Turn it off when the screen loses focus or goes idle. */
  active: boolean;
  torch?: boolean;
  onStarted?: () => void;
  onError?: (message: string) => void;
  style?: StyleProp<ViewStyle>;
  ref?: React.Ref<LiveCameraHandle>;
};

/**
 * Back camera preview with a still-capture function. Built on VisionCamera v5.
 * Shows its own permission screen, so callers only render this component.
 */
export function LiveCamera({active, torch = false, onStarted, onError, style, ref}: Props) {
  const t = useTheme();
  const {hasPermission, canRequestPermission, requestPermission} = useCameraPermission();
  // Small, speed-first stills: enough for plate OCR and quick to produce.
  const photoOutput = usePhotoOutput({
    targetResolution: CommonResolutions.HD_4_3,
    quality: 0.7,
    qualityPrioritization: 'speed',
  });
  const camera = useRef<CameraRef>(null);

  useEffect(() => {
    if (!hasPermission && canRequestPermission) {
      requestPermission().catch(() => undefined);
    }
  }, [hasPermission, canRequestPermission, requestPermission]);

  useImperativeHandle(
    ref,
    () => ({
      takeSnapshot: async () => {
        if (!camera.current?.controller) {
          return null;
        }
        try {
          const file = await photoOutput.capturePhotoToFile({enableShutterSound: false}, {});
          return `file://${file.filePath}`;
        } catch (e: any) {
          onError?.(e?.message || 'Could not take a picture.');
          return null;
        }
      },
    }),
    [photoOutput, onError],
  );

  if (!hasPermission && canRequestPermission) {
    // The system permission prompt is on its way; a plain dark frame, not "Camera is off".
    return <View style={[styles.fill, {backgroundColor: t.ink}, style]} />;
  }

  if (!hasPermission) {
    return (
      <View style={[styles.gate, {backgroundColor: t.ink}, style]}>
        <Text variant="subheading" style={{color: t.textOnInk}}>
          Camera is off
        </Text>
        <Text variant="body" style={[styles.center, {color: t.textOnInkMuted}]}>
          Allow the camera to read number plates. You can still type the plate.
        </Text>
        <Button title="Open settings" variant="accent" onPress={() => Linking.openSettings()} />
      </View>
    );
  }

  return (
    <Camera
      ref={camera}
      style={[styles.fill, style]}
      device="back"
      isActive={active}
      outputs={[photoOutput]}
      torchMode={torch ? 'on' : 'off'}
      resizeMode="cover"
      onStarted={onStarted}
      onError={e => onError?.(String((e as any)?.message ?? e))}
    />
  );
}

const styles = StyleSheet.create({
  fill: {flex: 1},
  gate: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl},
  center: {textAlign: 'center'},
});
