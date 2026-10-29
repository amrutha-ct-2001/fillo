import {lightPalette, Palette} from './tokens';

/**
 * Single place screens read colours from. Dark mode later means returning a
 * different palette here (from a store or useColorScheme); no screen changes.
 */
export function useTheme(): Palette {
  return lightPalette;
}
