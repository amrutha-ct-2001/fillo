import React from 'react';
import {StyleSheet, Text, View, ViewStyle} from 'react-native';
import Svg, {Circle, Defs, LinearGradient, Path, Rect, Stop} from 'react-native-svg';

import {brand} from '../theme/tokens';

type Props = {
  height?: number;
  style?: ViewStyle;
  compact?: boolean;
  /** White wordmark, for use on an indigo hero. */
  inverse?: boolean;
};

/** Fillo mark: a fuel drop with a reward spark on an indigo tile, plus the wordmark. */
export function FilloLogo({height = 32, style, compact, inverse}: Props) {
  const scale = height / 60;
  const markWidth = 60 * scale;
  const fullWidth = 190 * scale;

  return (
    <View style={[{width: compact ? markWidth : fullWidth, height}, style]}>
      <Svg width={markWidth} height={height} viewBox="0 0 60 60">
        <Defs>
          <LinearGradient id="fillo-logo-tile" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={brand.indigo} />
            <Stop offset="1" stopColor={brand.violet} />
          </LinearGradient>
        </Defs>
        <Rect x="2" y="2" width="56" height="56" rx="18" fill="url(#fillo-logo-tile)" />
        <Path
          d="M30 13C30 13 18 27.5 18 35.5C18 42.4 23.4 47 30 47C36.6 47 42 42.4 42 35.5C42 27.5 30 13 30 13Z"
          fill={brand.accent}
        />
        <Path d="M25 36.5C25 39.5 27.2 41.5 30 41.5" stroke={brand.ink} strokeWidth="2.6" strokeLinecap="round" />
        <Circle cx="45" cy="15" r="4" fill={brand.mist} />
      </Svg>
      {!compact ? (
        <View style={[styles.wordmark, {left: markWidth + 9 * scale, top: 8 * scale}]}>
          <Text style={[styles.word, {fontSize: 30 * scale, lineHeight: 34 * scale, color: inverse ? brand.mist : brand.ink}]}>
            fillo<Text style={styles.dot}>.</Text>
          </Text>
          <Text style={[styles.tag, {fontSize: 8.5 * scale, letterSpacing: 1.6 * scale, color: inverse ? brand.accent : brand.slate}]}>
            FUEL REWARDS
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wordmark: {position: 'absolute'},
  word: {fontFamily: 'Inter-ExtraBold', letterSpacing: -1},
  dot: {color: brand.accentDeep},
  tag: {fontFamily: 'Inter-Bold', marginTop: 1},
});
