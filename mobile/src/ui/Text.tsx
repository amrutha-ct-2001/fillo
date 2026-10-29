import React from 'react';
import {Text as RNText, TextProps, TextStyle} from 'react-native';

import {type, TypeStyle} from '../theme/tokens';
import {useTheme} from '../theme/useTheme';
import {Palette} from '../theme/tokens';

type Props = TextProps & {
  variant?: TypeStyle;
  /** Name of a palette colour; defaults to textPrimary. */
  color?: keyof Palette;
};

/** Large system fonts still grow the text, but only up to this, so rows and buttons keep their shape. */
export const MAX_FONT_SCALE = 1.3;

/** Themed text. Font scaling stays on so large system fonts still work. */
export function Text({variant = 'body', color = 'textPrimary', style, ...rest}: Props) {
  const theme = useTheme();
  const base: TextStyle = {...type[variant], color: theme[color]};
  return <RNText maxFontSizeMultiplier={MAX_FONT_SCALE} {...rest} style={[base, style]} />;
}
