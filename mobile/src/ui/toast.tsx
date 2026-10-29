import React from 'react';
import {StyleSheet, View} from 'react-native';
import Toast, {ToastConfig, ToastConfigParams} from 'react-native-toast-message';

import {Icon, IconName} from '../components/Icon';
import {radius, space} from '../theme/tokens';
import {useTheme} from '../theme/useTheme';
import {Text} from './Text';

export type ToastType = 'success' | 'error' | 'info';

/**
 * Short message that slides in at the top and leaves by itself, for news that
 * needs no answer ("Points updated"). Anything with a choice stays a dialog.
 */
export function showToast(type: ToastType, title: string, message?: string) {
  Toast.show({
    type,
    text1: title,
    text2: message,
    position: 'top',
    visibilityTime: type === 'error' ? 4000 : 2500,
  });
}

function Snackbar({type, text1, text2}: ToastConfigParams<unknown> & {type: ToastType}) {
  const t = useTheme();
  const tone: Record<ToastType, {icon: IconName; fg: string; bg: string}> = {
    success: {icon: 'check-circle', fg: t.success, bg: t.successSoft},
    error: {icon: 'cloud-off', fg: t.danger, bg: t.dangerSoft},
    info: {icon: 'info', fg: t.ink, bg: t.surfaceAlt},
  };
  const {icon, fg, bg} = tone[type];
  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: t.surface,
          borderColor: t.border,
          borderLeftColor: fg,
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite">
      <View style={[styles.mark, {backgroundColor: bg}]}>
        <Icon name={icon} size={22} color={fg} />
      </View>
      <View style={styles.copy}>
        {text1 ? <Text variant="subheading">{text1}</Text> : null}
        {text2 ? (
          <Text variant="bodySmall" color="textSecondary">
            {text2}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export const toastConfig: ToastConfig = {
  success: p => <Snackbar {...p} type="success" />,
  error: p => <Snackbar {...p} type="error" />,
  info: p => <Snackbar {...p} type="info" />,
};

const styles = StyleSheet.create({
  bar: {
    width: '92%',
    maxWidth: 560,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: radius.lg,
  },
  mark: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {flex: 1, gap: 2},
});
