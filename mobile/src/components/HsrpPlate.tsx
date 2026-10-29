import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
  Pressable,
} from 'react-native';

import {lightPalette as p, radius, space} from '../theme/tokens';
import {Icon} from './Icon';

type Props = {
  plate: string;
  size?: 'sm' | 'md' | 'lg';
  editable?: boolean;
  onChangePlate?: (value: string) => void;
  onEditPress?: () => void;
  style?: ViewStyle;
  compact?: boolean;
  /** IND badge — use on capture/autofill plate input only */
  showInd?: boolean;
};

function cleanPlate(plate: string) {
  return (plate || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

function formatPlateDisplay(plate: string) {
  const clean = cleanPlate(plate);
  if (!clean) return '—';
  if (clean.length >= 8) {
    return `${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 6)} ${clean.slice(6)}`;
  }
  return clean;
}

export function HsrpPlate({
  plate,
  size = 'md',
  editable,
  onChangePlate,
  onEditPress,
  style,
  compact,
  showInd,
}: Props) {
  const clean = cleanPlate(plate);
  const display = formatPlateDisplay(plate);
  const isLg = size === 'lg';
  const isSm = size === 'sm';
  // IND only on editable capture/autofill inputs by default
  const withInd = showInd ?? !!editable;

  if (compact) {
    return (
      <View style={[styles.compact, style]}>
        <Text style={styles.compactPlate} numberOfLines={1}>
          {display}
        </Text>
      </View>
    );
  }

  // Listing / read-only chip — size to plate text (no flex collapse)
  if (!withInd && !editable) {
    return (
      <View
        style={[
          styles.chip,
          isSm && styles.chipSm,
          isLg && styles.chipLg,
          style,
        ]}>
        <Text
          style={[
            styles.chipText,
            isSm && styles.chipTextSm,
            isLg && styles.chipTextLg,
          ]}
          numberOfLines={1}>
          {display}
        </Text>
        {onEditPress ? (
          <Pressable
            hitSlop={8}
            onPress={onEditPress}
            accessibilityLabel="Edit plate number">
            <Icon name="edit" size={18} color={p.textSecondary} />
          </Pressable>
        ) : null}
      </View>
    );
  }

  // Editable / IND input — raw letters/digits only (no spaces/hyphens)
  // so typing never fights display formatting.
  return (
    <View style={[styles.inputWrap, isLg && styles.inputWrapLg, style]}>
      <View style={[styles.ind, isLg && styles.indLg]}>
        <Icon
          name="stars"
          size={isLg ? 15 : 11}
          color={p.successSoft}
        />
        <Text style={[styles.indText, isLg && styles.indTextLg]}>IND</Text>
        {isLg ? <View style={styles.indDot} /> : null}
      </View>
      <View style={styles.inputArea}>
        {editable ? (
          <TextInput
            value={clean}
            onChangeText={t => onChangePlate?.(cleanPlate(t))}
            autoCapitalize="characters"
            autoCorrect={false}
            style={[styles.inputText, isLg && styles.inputTextLg]}
            maxLength={12}
            placeholder="KL07AB1234"
            placeholderTextColor={p.placeholder}
          />
        ) : (
          <Text
            style={[styles.inputText, isLg && styles.inputTextLg]}
            numberOfLines={1}>
            {display}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // —— Listing chip (no IND) ——
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: p.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: p.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    maxWidth: '100%',
  },
  chipSm: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipLg: {
    alignSelf: 'stretch',
    paddingVertical: 16,
    paddingHorizontal: space.md,
    justifyContent: 'center',
  },
  chipText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 15,
    letterSpacing: 1.8,
    color: p.textPrimary,
    textTransform: 'uppercase',
  },
  chipTextSm: {
    fontSize: 13,
    letterSpacing: 1.4,
  },
  chipTextLg: {
    fontSize: 22,
    letterSpacing: 2.4,
    textAlign: 'center',
    flex: 1,
  },

  // —— Capture / editable input with IND ——
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'stretch',
    alignSelf: 'stretch',
    backgroundColor: p.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    height: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: p.border,
  },
  inputWrapLg: {height: 64},
  ind: {
    backgroundColor: p.ink,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  indLg: {
    width: 48,
    paddingVertical: 6,
    justifyContent: 'space-between',
  },
  indText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    color: p.textOnInk,
    lineHeight: 10,
  },
  indTextLg: {
    fontSize: 12,
    letterSpacing: -0.3,
  },
  indDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: p.accent,
  },
  inputArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    backgroundColor: p.surfaceAlt,
    minWidth: 0,
  },
  inputText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 15,
    letterSpacing: 2.1,
    flex: 1,
    color: p.textPrimary,
    textTransform: 'uppercase',
    includeFontPadding: false,
    padding: 0,
  },
  inputTextLg: {
    fontSize: 20,
    letterSpacing: 1.2,
    fontFamily: 'SpaceMono-Bold',
  },

  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: p.ink,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  compactPlate: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 13,
    color: p.textOnInk,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
});
