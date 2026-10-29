import React from 'react';
import {Platform, StyleSheet, TextInput, TextInputProps, View, ViewStyle, StyleProp} from 'react-native';

import {Icon} from '../components/Icon';
import {radius, space, type} from '../theme/tokens';
import {useTheme} from '../theme/useTheme';
import {MAX_FONT_SCALE, Text} from './Text';
import {Touchable} from './Touchable';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  hint?: string;
  /** Fixed text before the value, such as `₹` or `+91`. */
  prefix?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

// `importantForAutofill` works on Android Views at runtime but is missing from RN's View types.
const androidNoAutofill = {importantForAutofill: 'noExcludeDescendants'} as object;

/**
 * Text field with a visible label above it (never a placeholder-only label).
 * A secret field (secureTextEntry) gets an eye button to show or hide what was typed.
 */
export function Input({label, error, hint, prefix, containerStyle, style, secureTextEntry, ...rest}: Props) {
  const t = useTheme();
  const [focused, setFocused] = React.useState(false);
  const [revealed, setRevealed] = React.useState(false);
  const borderColor = error ? t.danger : focused ? t.inkSoft : t.borderStrong;

  return (
    <View style={[styles.wrap, containerStyle]} {...androidNoAutofill}>
      {label ? (
        <Text variant="label" color="textSecondary">
          {label}
        </Text>
      ) : null}
      <View style={[styles.field, {backgroundColor: focused ? t.surface : t.surfaceAlt, borderColor, borderWidth: focused || error ? 2 : 1}]}>
        {prefix ? (
          <Text variant="subheading" color="textSecondary" style={styles.prefix}>
            {prefix}
          </Text>
        ) : null}
        <TextInput
          placeholderTextColor={t.placeholder}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          accessibilityLabel={label}
          autoCorrect={false}
          spellCheck={false}
          autoCapitalize="none"
          autoComplete="off"
          textContentType="none"
          {...(Platform.OS === 'ios' ? {clearButtonMode: 'never' as const} : {})}
          {...rest}
          secureTextEntry={secureTextEntry && !revealed}
          importantForAutofill="no"
          onFocus={e => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[styles.input, {color: t.textPrimary}, style]}
        />
        {secureTextEntry ? (
          <Touchable
            onPress={() => setRevealed(r => !r)}
            accessibilityLabel={revealed ? `Hide ${label ?? 'text'}` : `Show ${label ?? 'text'}`}
            style={styles.reveal}>
            <Icon name={revealed ? 'eye' : 'eye-off'} size={22} color={t.textSecondary} />
          </Touchable>
        ) : null}
      </View>
      {error ? (
        <Text variant="bodySmall" color="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="bodySmall" color="textSecondary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {gap: space.xs},
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
  },
  prefix: {marginRight: space.sm},
  reveal: {minWidth: 48, alignItems: 'center', justifyContent: 'center', marginRight: -space.sm},
  input: {
    ...type.subheading,
    flex: 1,
    minHeight: 56,
    paddingVertical: 0,
  },
});
