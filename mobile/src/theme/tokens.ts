/**
 * Fillo design tokens ("Midnight & Mint"): deep indigo surfaces, a fresh teal
 * accent, soft rounded cards. Semantic names only, so a dark palette can be
 * added later by providing a second object with the same keys.
 */
import type {ViewStyle} from 'react-native';

export type Palette = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderStrong: string;
  /** Brand indigo: primary buttons, hero cards, active tab. */
  ink: string;
  inkSoft: string;
  textPrimary: string;
  textSecondary: string;
  /** Example text in an empty field: clearly lighter than typed text so it never looks filled in. */
  placeholder: string;
  textOnInk: string;
  textOnInkMuted: string;
  /** Teal accent: the one main action, highlights on indigo. */
  accent: string;
  textOnAccent: string;
  accentText: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  textOnSuccess: string;
  danger: string;
  dangerSoft: string;
  textOnDanger: string;
  disabledFill: string;
  disabledText: string;
  /** Dims the screen behind a dialog. */
  scrim: string;
};

export const lightPalette: Palette = {
  bg: '#F4F6FB',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF1F8',
  border: '#E1E6F0',
  borderStrong: '#7B87A1',
  ink: '#312E81',
  inkSoft: '#4338CA',
  textPrimary: '#0F172A',
  textSecondary: '#4A5568',
  placeholder: '#7D889E',
  textOnInk: '#FFFFFF',
  textOnInkMuted: '#C7D2FE',
  accent: '#2DD4BF',
  textOnAccent: '#042F2E',
  accentText: '#0F766E',
  accentSoft: '#D5F7F1',
  success: '#15803D',
  successSoft: '#DCFCE7',
  textOnSuccess: '#FFFFFF',
  danger: '#C81E1E',
  dangerSoft: '#FDE8E8',
  textOnDanger: '#FFFFFF',
  disabledFill: '#E5E9F2',
  disabledText: '#4A5568',
  scrim: 'rgba(15, 23, 42, 0.55)',
};

/** Fixed brand colours for the logo and hero gradients. Not themed: they look the same in any mode. */
export const brand = {
  ink: '#1E1B4B',
  indigo: '#312E81',
  violet: '#4F46E5',
  accent: '#2DD4BF',
  accentDeep: '#0D9488',
  mist: '#FFFFFF',
  slate: '#64748B',
} as const;

/** Two-stop gradients for hero cards (top-left to bottom-right). */
export const gradients = {
  hero: [brand.indigo, brand.violet],
  night: [brand.ink, brand.indigo],
  mint: [brand.accentDeep, brand.accent],
} as const;

export type GradientName = keyof typeof gradients;

export const space = {xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32} as const;

/** Soft, friendly corners. `pill` is for buttons, badges and chips. */
export const radius = {sm: 8, md: 14, lg: 20, xl: 24, pill: 999} as const;

/** Minimum touch target and the two button heights. */
export const target = {min: 48, button: 52, buttonLarge: 60} as const;

/** The only shadows in the app. Spread one into a style: `{...shadow.card}`. */
export const shadow: Record<'card' | 'raised', ViewStyle> = {
  card: {
    shadowColor: '#1E1B4B',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 6},
    elevation: 2,
  },
  raised: {
    shadowColor: '#1E1B4B',
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: {width: 0, height: 10},
    elevation: 6,
  },
};

const family = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
  extraBold: 'Inter-ExtraBold',
  mono: 'SpaceMono-Bold',
} as const;

/**
 * Each style names its font file directly and never sets `fontWeight`
 * (custom fonts ignore it on Android and can fall back to a system font).
 */
export const type = {
  display: {fontFamily: family.extraBold, fontSize: 44, lineHeight: 50, letterSpacing: -1.2},
  title: {fontFamily: family.extraBold, fontSize: 28, lineHeight: 34, letterSpacing: -0.6},
  heading: {fontFamily: family.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3},
  subheading: {fontFamily: family.bold, fontSize: 17, lineHeight: 23},
  body: {fontFamily: family.medium, fontSize: 16, lineHeight: 24},
  bodySmall: {fontFamily: family.medium, fontSize: 14, lineHeight: 20},
  caption: {fontFamily: family.semiBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.2},
  label: {fontFamily: family.semiBold, fontSize: 14, lineHeight: 20, letterSpacing: 0.2},
  overline: {fontFamily: family.bold, fontSize: 12, lineHeight: 16, letterSpacing: 1.2},
  button: {fontFamily: family.bold, fontSize: 16, lineHeight: 22, letterSpacing: 0.2},
  amount: {fontFamily: family.extraBold, fontSize: 44, lineHeight: 50, letterSpacing: -1},
  plate: {fontFamily: family.mono, fontSize: 20, lineHeight: 26, letterSpacing: 2},
} as const;

export type TypeStyle = keyof typeof type;
