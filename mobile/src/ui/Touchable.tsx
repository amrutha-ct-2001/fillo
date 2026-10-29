import React from 'react';
import {Pressable, PressableProps, StyleProp, ViewStyle} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

import {target} from '../theme/tokens';

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** Style merged in while pressed. Default is 1px down (no opacity fades). */
  pressedStyle?: StyleProp<ViewStyle>;
  haptic?: boolean;
  children?: React.ReactNode;
};

const PRESSED: ViewStyle = {transform: [{translateY: 1}]};

/** Base pressable: 48px minimum target, 1px-down pressed state, light haptic. */
export function Touchable({style, pressedStyle, haptic = true, onPress, children, ...rest}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      {...rest}
      onPress={e => {
        if (haptic) {
          ReactNativeHapticFeedback.trigger('impactLight');
        }
        onPress?.(e);
      }}
      style={({pressed}) => [{minHeight: target.min}, style, pressed && PRESSED, pressed && pressedStyle]}>
      {children as React.ReactElement | undefined}
    </Pressable>
  );
}

