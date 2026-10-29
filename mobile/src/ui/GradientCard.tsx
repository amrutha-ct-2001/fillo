import React, {useState} from 'react';
import {LayoutChangeEvent, StyleProp, StyleSheet, View, ViewProps, ViewStyle} from 'react-native';
import Svg, {Circle, ClipPath, Defs, G, LinearGradient, Rect, Stop} from 'react-native-svg';

import {brand, gradients, GradientName, radius, shadow, space} from '../theme/tokens';

type Props = Omit<ViewProps, 'style'> & {
  children: React.ReactNode;
  gradient?: GradientName;
  style?: StyleProp<ViewStyle>;
  /** Two soft circles in the corner. Off for small cards. */
  decorated?: boolean;
};

let nextId = 0;

/**
 * Hero card on a diagonal brand gradient. Text on it uses `textOnInk` /
 * `textOnInkMuted`, which pass contrast on every stop of every gradient.
 *
 * The gradient is drawn at the card's measured pixel size and clipped to its
 * rounded shape inside the SVG. Percentage sizes and `overflow: hidden` are
 * not reliable on Android (the gradient stopped short and the corner circle
 * leaked out), and the solid fill underneath keeps the elevation shadow clean.
 */
export function GradientCard({children, gradient = 'hero', style, decorated = true, ...rest}: Props) {
  // SVG ids must be unique per mounted card and must not contain ':' (useId does).
  const id = React.useMemo(() => `fillo-grad-${nextId++}`, []);
  const [size, setSize] = useState<{w: number; h: number} | null>(null);
  const [from, to] = gradients[gradient];

  const onLayout = (e: LayoutChangeEvent) => {
    const {width, height} = e.nativeEvent.layout;
    if (!size || Math.abs(size.w - width) > 0.5 || Math.abs(size.h - height) > 0.5) {
      setSize({w: width, h: height});
    }
    rest.onLayout?.(e);
  };

  return (
    <View {...rest} onLayout={onLayout} style={[styles.base, {backgroundColor: from}, style]}>
      {size ? (
        <Svg style={StyleSheet.absoluteFill} width={size.w} height={size.h} pointerEvents="none">
          <Defs>
            <LinearGradient id={`${id}-fill`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={from} />
              <Stop offset="1" stopColor={to} />
            </LinearGradient>
            <ClipPath id={`${id}-clip`}>
              <Rect x="0" y="0" width={size.w} height={size.h} rx={radius.xl} ry={radius.xl} />
            </ClipPath>
          </Defs>
          <G clipPath={`url(#${id}-clip)`}>
            <Rect x="0" y="0" width={size.w} height={size.h} fill={`url(#${id}-fill)`} />
            {decorated ? (
              <>
                <Circle cx={size.w - 20} cy={10} r={90} fill={brand.mist} fillOpacity={0.07} />
                <Circle cx={size.w - 6} cy={-6} r={48} fill={brand.accent} fillOpacity={0.16} />
              </>
            ) : null}
          </G>
        </Svg>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.xl,
    padding: space.xl,
    gap: space.sm,
    ...shadow.card,
  },
});
