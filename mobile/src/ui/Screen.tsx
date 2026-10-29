import React from 'react';
import {KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View} from 'react-native';
import {Edge, SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import {useKeyboardHeight} from '../hooks/useKeyboardHeight';
import {radius, shadow, space} from '../theme/tokens';
import {useTheme} from '../theme/useTheme';

type Props = {
  children: React.ReactNode;
  /** Pinned bar at the bottom (main action). Stays above the keyboard. */
  footer?: React.ReactNode;
  /** Pinned bar above the content, usually an AppHeader. */
  header?: React.ReactNode;
  /** Set false for screens that manage their own scrolling (lists). */
  scroll?: boolean;
  edges?: Edge[];
  padded?: boolean;
  /** Centre the content vertically while the keyboard is closed (login screens). */
  centered?: boolean;
};

/**
 * Safe area + background + optional scroll + sticky footer that rides above the keyboard.
 *
 * The Android window uses `adjustNothing`, so Android never resizes for the
 * keyboard on its own. The keyboard height is read and added as bottom padding,
 * which shrinks the scroll area and lifts the footer. iOS uses KeyboardAvoidingView.
 *
 * React Native reports the Android keyboard height with the navigation bar already
 * taken off (ime inset minus system bars, see ReactRootView). SafeAreaView pads that
 * bar when `bottom` is an edge, so the full reported height is the lift; without the
 * bottom edge the bar has to be added back.
 */
export function Screen({
  children,
  footer,
  header,
  scroll = true,
  edges = ['top', 'bottom'],
  padded = true,
  centered = false,
}: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const keyboardOpen = keyboard > 0;
  const androidLift =
    Platform.OS === 'android' && keyboardOpen ? keyboard + (edges.includes('bottom') ? 0 : insets.bottom) : 0;

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[padded && styles.padded, centered && !keyboardOpen && styles.centered]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, padded && styles.padded]}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.flex, {backgroundColor: t.bg}]} edges={edges}>
      {header}
      <KeyboardAvoidingView
        style={[styles.flex, {paddingBottom: androidLift}]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {body}
        {footer ? (
          <View style={[styles.footer, {backgroundColor: t.surface}, shadow.raised]}>{footer}</View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  padded: {padding: space.lg, gap: space.lg},
  centered: {flexGrow: 1, justifyContent: 'center'},
  footer: {padding: space.lg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl},
});
