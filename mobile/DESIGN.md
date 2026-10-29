# Fillo design system

"Midnight & Mint": deep indigo hero cards, a fresh teal accent, soft rounded white cards on a cool grey background. Built to stay readable outdoors at the pump.

## Rules
- **Colours** come from `useTheme()` (`src/theme/useTheme.ts`), never from hex values in a screen.
  Names are semantic (`textPrimary`, `ink`, `accent`, `danger`, ...). `src/theme/tokens.ts` holds the values and
  `src/theme/__tests__/contrast.test.ts` fails if a text pair drops below 4.5:1.
- **Hero cards** use `GradientCard` (`hero`, `night` or `mint` gradient). Text on them uses `textOnInk`, `textOnInkMuted` or `accent`.
- **Shape:** radii from `radius` (8 to 24, `pill` for buttons, badges, chips, tabs). Shadows only by spreading `shadow.card` or `shadow.raised`.
- **Type:** `Text` with a `variant` from `type` in tokens. Never set `fontWeight`; each style names its font file.
- **Touch targets:** 48px minimum. Buttons are 52px pills, the one main action on a screen is `large` (60px).
- **Lists:** rows sit in one rounded card: `Card` around `ListRow`s, or `GroupedItem` per FlatList item (`ListScreen` does this for you). Give a row an `icon` for a tinted `IconBubble`.
- **Pressed / disabled:** pressed moves 1px down. Disabled is a grey fill, never low opacity.
- **Status is never colour only:** a badge carries a word or an icon.
- **A failed load is never "empty".** Use `ErrorState` with Try again. `EmptyState` is only for a successful empty result.
- **Never show raw internal values** (`CUSTOMER`, `EARN`, `PENDING`). Use `utils/labels.ts`.
- **Keyboard:** put forms in `Screen` (with `footer` for the main action). The Android window uses `adjustNothing`, so `Screen` lifts content above the keyboard itself.

## Where things are
| What | Where |
|---|---|
| Components | `src/ui/` (import from `../../ui`) |
| Tokens, theme hook | `src/theme/` |
| Formatting (₹, phone, plate, dates) | `src/utils/format.ts` |
| Plain-words errors | `src/utils/errors.ts` |
| Staff fill logic (pure, tested) | `src/staff/` |
| Customer / admin / rewards reads | `src/queries/` (react-query; cache is cleared on logout) |

## Checks
Run from `mobile/`:

    npx tsc --noEmit && npx jest && npx eslint src && bash scripts/check-theme.sh src

`check-theme.sh` fails on raw hex colours, raw shadows, `fontWeight`, raw radii above 8, low-opacity states and local `formatInr` copies.

## Dark mode (not built)
Add a second palette object with the same keys in `tokens.ts` and return it from `useTheme()` based on
`useColorScheme()` or a setting. Screens already read every colour through `useTheme()`, so none change.
