---
name: design-tokens
description: The DRIVE_ALIVE design token contract — which token to use for colour, spacing, radius, typography, elevation and alpha, and why raw hex breaks dark mode. Use whenever writing or reviewing styles in the frontend.
---

# Design tokens

`frontend/theme/ThemeContext.tsx` is the **single source of truth**. There is no
Tailwind config and no CSS variables file — those existed once, drifted out of
sync with the TypeScript tokens, and were removed. Do not reintroduce a second
colour source.

Everything comes from one hook:

```tsx
import { useTheme } from '../../theme/ThemeContext';

const {
  colors, isDark,
  spacing, radii, fontSizes,
  typography, fontFamilies,
  elevation, withAlpha,
  breakpoints, contentWidths,
} = useTheme();
```

## Colour

**Never write a hex literal in `screens/` or `components/`.** Both light and
dark palettes are fully populated; a hardcoded hex renders identically in both
modes, which is exactly the bug it looks like.

40 semantic slots, grouped:

| Group | Slots |
|---|---|
| Brand | `primary` `primaryLight` `primaryDark` `accent` `accentLight` `accentDark` |
| Background | `background` `backgroundSecondary` `card` `cardElevated` |
| Text | `text` `textSecondary` `textTertiary` `textInverse` |
| Border | `border` `borderFocus` `divider` |
| Semantic | `success` `danger` `warning` `info` + `successBg` `dangerBg` `warningBg` `infoBg` |
| Interactive | `buttonPrimary` `buttonPrimaryText` `buttonSecondary` `buttonSecondaryText` `buttonDanger` `buttonDangerText` `inputBackground` `inputBorder` `inputText` `inputPlaceholder` |
| Role | `roleAdmin` `roleInstructor` `roleStudent` |
| Nav | `headerBackground` `headerText` `tabBarBackground` `tabBarActive` `tabBarInactive` |

The palette is **closed**. If nothing fits, say so rather than adding a slot —
a new semantic token is a deliberate design decision, not a side effect of one
screen.

### Alpha

```tsx
withAlpha(colors.primary, 0.07)     // ✓
colors.primary + '12'               // ✗ breaks on #RGB, #RRGGBBAA, rgb()
```

`withAlpha` handles `#RGB`, `#RRGGBB`, `#RRGGBBAA`, `rgb()` and `rgba()`.

## Spacing, radius, size

```
spacing   xs 4 · sm 8 · md 12 · lg 16 · xl 20 · 2xl 24 · 3xl 32 · 4xl 40 · 5xl 48
radii     sm 4 · md 8 · lg 12 · xl 16 · 2xl 20 · full 9999
fontSizes xs 12 · sm 14 · md 16 · lg 18 · xl 20 · 2xl 24 · 3xl 30 · 4xl 36
```

`radii.md` (8) is the button/input radius; `radii.lg` (12) is the card radius.

## Typography

Prefer a role token over picking a size and family separately — it keeps
line-height proportional:

```tsx
<Text style={typography.h2}>Bookings</Text>
```

`h1 h2 h3 body bodySm label caption`, each `{ fontFamily, fontSize, lineHeight, letterSpacing? }`.

When you need only the family: `fontFamilies.regular | medium | semibold | bold`
(Inter 400/500/600/700). Never write the raw string `'Inter_600SemiBold'`.

## Elevation

One call, correct on both platforms and both themes:

```tsx
<View style={[styles.card, elevation('md')]} />
```

`sm` subtle lift · `md` cards · `lg` modals and popovers. It returns a web
`boxShadow` string or the native `shadowColor`/`shadowOffset`/`shadowOpacity`/
`shadowRadius`/`elevation` quintet, with opacity already tuned for light vs
dark.

Never hand-write a shadow. The same four-branch block was copy-pasted across
Card, StatCard and Modal before this token existed.

## Theme mode

`mode` is `'light' | 'dark' | 'system'`, persisted to AsyncStorage under
`@roadready/theme-mode` and restored on mount. `isThemeReady` tells you the
persisted value has been read — useful if you need to avoid a flash, though the
provider renders immediately with the default rather than blocking.

## What goes where

| Value | Location |
|---|---|
| Static layout, colours-free geometry | `StyleSheet.create` |
| Anything from `colors`, `elevation()`, `withAlpha()` | inline, at render |
| Anything viewport-derived | inline, at render (see `responsive-screen`) |

Theme values change at runtime when the user toggles dark mode, so they cannot
live in `StyleSheet.create` either.
