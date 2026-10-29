import {contrastRatio} from '../contrast';
import {lightPalette as p} from '../tokens';

// Text pairs must reach 4.5:1 (WCAG AA); fills that only need to be seen as a
// shape (borders, the accent button face) must reach 3:1.
const textPairs: Array<[string, string, string]> = [
  ['textPrimary', 'bg', 'primary text on screen'],
  ['textPrimary', 'surface', 'primary text on card'],
  ['textPrimary', 'surfaceAlt', 'primary text on tonal fill'],
  ['textSecondary', 'bg', 'secondary text on screen'],
  ['textSecondary', 'surface', 'secondary text on card'],
  ['textSecondary', 'surfaceAlt', 'secondary text on tonal fill'],
  ['textOnInk', 'ink', 'text on ink'],
  ['textOnInkMuted', 'ink', 'muted text on ink'],
  ['textOnAccent', 'accent', 'text on accent button'],
  ['accentText', 'surface', 'accent text on card'],
  ['accentText', 'accentSoft', 'accent text on accent tint'],
  ['textOnSuccess', 'success', 'text on success'],
  ['success', 'successSoft', 'success text on tint'],
  ['textOnDanger', 'danger', 'text on danger'],
  ['danger', 'dangerSoft', 'danger text on tint'],
  ['danger', 'surface', 'danger text on card'],
  ['disabledText', 'disabledFill', 'disabled button label'],
];

const shapePairs: Array<[string, string, string]> = [
  ['borderStrong', 'surface', 'input border on card'],
  ['borderStrong', 'bg', 'input border on screen'],
  ['accent', 'ink', 'accent accent on ink'],
  // Placeholders are hints, deliberately lighter than typed text, but still readable in sun.
  ['placeholder', 'surface', 'placeholder in a field'],
  ['placeholder', 'surfaceAlt', 'placeholder on the number plate'],
];

test('a placeholder is clearly lighter than typed text', () => {
  expect(contrastRatio(p.placeholder, p.surface)).toBeLessThan(contrastRatio(p.textSecondary, p.surface));
});

const get = (k: string) => (p as Record<string, string>)[k];

test.each(textPairs)('%s on %s reaches 4.5:1 (%s)', (fg, bg) => {
  expect(contrastRatio(get(fg), get(bg))).toBeGreaterThanOrEqual(4.5);
});

test.each(shapePairs)('%s on %s reaches 3:1 (%s)', (fg, bg) => {
  expect(contrastRatio(get(fg), get(bg))).toBeGreaterThanOrEqual(3);
});
