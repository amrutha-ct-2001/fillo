import React, {useEffect, useRef, useState} from 'react';
import {Animated, StyleSheet, View} from 'react-native';
import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useKeyboardOpen} from '../hooks/useKeyboardOpen';
import {useReduceMotion} from '../hooks/useReduceMotion';
import {radius, shadow, space} from '../theme/tokens';
import {useTheme} from '../theme/useTheme';
import {Text} from './Text';
import {Touchable} from './Touchable';

const PILL_W = 68;
const PILL_H = 40;
const ICON_SIZE = 24;

type TabProps = {
  label: string;
  focused: boolean;
  icon: React.ReactNode;
  onPress: () => void;
  onLongPress: () => void;
  accessibilityLabel?: string;
  reduceMotion: boolean;
};

function Tab({label, focused, icon, onPress, onLongPress, accessibilityLabel, reduceMotion}: TabProps) {
  const t = useTheme();
  const progress = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(focused ? 1 : 0);
      return;
    }
    // Snappy: settles in about 150 ms with a hint of bounce.
    Animated.spring(progress, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      stiffness: 520,
      damping: 30,
      mass: 0.6,
    }).start();
  }, [focused, progress, reduceMotion]);

  const pillStyle = {
    opacity: progress,
    transform: [{scaleX: progress.interpolate({inputRange: [0, 1], outputRange: [0.6, 1]})}],
  };
  const iconStyle = {
    transform: [{translateY: progress.interpolate({inputRange: [0, 1], outputRange: [0, -1]})}, {scale: progress.interpolate({inputRange: [0, 1], outputRange: [1, 1.08]})}],
  };

  return (
    <Touchable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{selected: focused}}
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={0}
      style={styles.tab}>
      <View style={styles.iconSlot}>
        <Animated.View style={[styles.pill, {backgroundColor: t.accentSoft}, pillStyle]} />
        <Animated.View style={iconStyle}>{icon}</Animated.View>
      </View>
      <Text
        variant="caption"
        color={focused ? 'ink' : 'textSecondary'}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        style={[styles.label, focused && styles.labelOn]}>
        {label}
      </Text>
    </Touchable>
  );
}

/**
 * Bottom tab bar: rounded top, soft shadow, an animated pill behind the
 * active icon, and labels that shrink to fit instead of being cut off.
 */
export function TabBar({state, descriptors, navigation}: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardOpen = useKeyboardOpen();
  const reduceMotion = useReduceMotion();
  // The tab that looks selected. It moves the instant a tab is touched; the
  // screen switch follows a frame later, so the pill never waits for a heavy
  // screen to render. It re-syncs whenever navigation changes the tab itself.
  const [active, setActive] = useState(state.index);
  useEffect(() => setActive(state.index), [state.index]);

  if (keyboardOpen) {
    return null;
  }

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, {backgroundColor: t.surface, paddingBottom: Math.max(insets.bottom, space.sm)}]}>
      {state.routes.map((route, index) => {
        const {options} = descriptors[route.key];
        const current = state.index === index;
        const focused = active === index;
        const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : options.title ?? route.name;
        const color = focused ? t.ink : t.textSecondary;

        const onPress = () => {
          const event = navigation.emit({type: 'tabPress', target: route.key, canPreventDefault: true});
          // Tapping the current tab still emits tabPress, so a nested stack pops back to its first screen.
          if (!current && !event.defaultPrevented) {
            setActive(index);
            requestAnimationFrame(() => navigation.navigate(route.name, route.params));
          }
        };
        const onLongPress = () => navigation.emit({type: 'tabLongPress', target: route.key});

        return (
          <Tab
            key={route.key}
            label={label}
            focused={focused}
            icon={options.tabBarIcon?.({focused, color, size: ICON_SIZE})}
            onPress={onPress}
            onLongPress={onLongPress}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            reduceMotion={reduceMotion}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: space.sm,
    paddingHorizontal: space.xs,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    ...shadow.raised,
  },
  tab: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 2},
  iconSlot: {width: PILL_W, height: PILL_H, alignItems: 'center', justifyContent: 'center'},
  pill: {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.pill},
  label: {textAlign: 'center', alignSelf: 'stretch'},
  labelOn: {fontFamily: 'Inter-Bold'},
});
