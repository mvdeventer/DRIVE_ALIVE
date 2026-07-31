---
name: responsive-screen
description: How to make a DRIVE_ALIVE screen adapt across phone, tablet and desktop. Use when building a new screen, fixing a layout that doesn't reflow on resize, adding a grid or table, or deciding content width. Covers useBreakpoint, ScreenContainer, grid rules, and the StyleSheet.create trap.
---

# Making a screen work on any device

DRIVE_ALIVE ships one codebase to iOS, Android and web. A screen is "done" when
it reflows correctly at 390, 768, 1024 and 1440 dp **without a reload** — resize
the browser window and watch it move.

## The one rule that causes most bugs

`StyleSheet.create` is evaluated **once, at module import**. Anything derived
from viewport width that you put inside it freezes at whatever width the app
happened to load at, forever.

```tsx
// ✗ Broken — flexBasis is fixed at import time
const styles = StyleSheet.create({
  card: { flexBasis: Dimensions.get('window').width < 768 ? '100%' : '30%' },
});

// ✓ Correct — read in the component body, pass inline
const { select } = useBreakpoint();
const cardWidth = { flexBasis: select({ xs: '100%', md: '48%', lg: '30%' }) };
<Card style={[styles.card, cardWidth]} />
```

Static values (padding that never changes, border radius, colours) still belong
in `StyleSheet.create`. Only viewport-derived values must move out.

## useBreakpoint

`frontend/hooks/useBreakpoint.ts`, built on `useWindowDimensions()` so it
re-renders on browser resize **and** device rotation.

```tsx
import { useBreakpoint } from '../../hooks/useBreakpoint';

const { width, bp, isPhone, isTablet, isDesktop, select, up, down } = useBreakpoint();

const columns = select({ xs: 1, md: 2, lg: 3 });   // cascades down like min-width
const showSidebar = up('md');
```

Breakpoints (`frontend/theme/ThemeContext.tsx`):

| Token | dp | Meaning |
|---|---|---|
| `xs` | 0 | phone portrait |
| `sm` | 480 | large phone |
| `md` | 768 | tablet — **nav rail appears here** |
| `lg` | 1024 | laptop |
| `xl` | 1440 | large desktop |

`select` walks *down* from the current breakpoint to the nearest defined key, so
`select({ xs: 1, lg: 3 })` gives 1 at 800dp. If nothing is defined at or below,
it walks back up, so a lone `{ lg: 3 }` still returns 3 on a phone.

### Do not use these

- `responsive(web, mobile)` from the theme — deprecated. Branches on *platform*,
  so a 390px mobile browser gets the desktop value.
- `Dimensions.get(...)` — a one-shot read that never updates.
- `window.innerWidth` / `window.addEventListener('resize')` — web-only, silently
  dead on native, and duplicates the hook.

`Platform.OS` is still correct for **capability** differences: haptics, secure
store, maps, file pickers, `KeyboardAvoidingView` behaviour. Just never for a
size.

## Content width

Wrap the screen in `ScreenContainer` and pick a width; never hand-roll `maxWidth`.

```tsx
import { ScreenContainer } from '../../components/ui';

<ScreenContainer width="form" onRefresh={load} refreshing={loading}>
```

| `width` | Cap | Use for |
|---|---|---|
| `form` | 480 | login, register, verify, payment result — anything single-column |
| `content` | 960 | default; normal screens |
| `wide` | 1280 | dense tables, multi-column dashboards |
| `full` | none | maps, full-bleed media |

It also supplies breakpoint-aware horizontal gutters (16 / 24 / 32) and centres
the content, so a dashboard stops stretching edge-to-edge on a 27" monitor.

## Grids

```tsx
const { select } = useBreakpoint();
const columns = select({ xs: 1, md: 2, lg: 3 }) ?? 1;

<FlatList
  numColumns={columns}
  key={`grid-${columns}`}          // FlatList can't change numColumns in place
  columnWrapperStyle={columns > 1 ? styles.row : undefined}
/>
```

The `key` remount is required — without it React Native throws when
`numColumns` changes.

## Tables on narrow screens

A horizontally scrolling table is acceptable **only** if it scrolls inside its
own container; the page body must never scroll sideways. Below `md`, prefer
collapsing each row into a stacked card. `ScreenContainer` will not save you
here — a fixed-width table will still overflow.

## Navigation

`useResponsiveTabBar` flips the bottom tab bar to a 220dp left nav rail at
`md` (768) on web. Native keeps the bottom bar at every size. Because the rail
and the content cap share the same `md` token, they switch together — if you
introduce a new layout breakpoint, use the token rather than a fresh number.

## Checklist before calling a screen done

- [ ] Root is `<ScreenContainer width="…">`; no per-screen `maxWidth`
- [ ] No `Dimensions.get` / `window.innerWidth` / `responsive()` anywhere
- [ ] No viewport value inside `StyleSheet.create`
- [ ] Grid column count comes from `select({...})`
- [ ] Resizing the browser 390 → 1440 **without reloading** reflows the layout
- [ ] No horizontal page scroll at 390
- [ ] Content still capped at 1440
