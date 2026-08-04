---
name: rn-a11y
description: Accessibility patterns that work on iOS, Android and react-native-web from one codebase — roles, names, states, emoji icons, touch targets, form errors, modal focus. Use when adding any interactive element or reviewing a screen for screen-reader support.
---

# Accessibility for React Native + react-native-web

DRIVE_ALIVE ships one codebase to TalkBack, VoiceOver and desktop screen
readers. Write React Native accessibility props first; add `aria-*` only where
react-native-web needs it (cast with `{...({ 'aria-x': v } as any)}` — the RN
types don't know about them).

`frontend/components/ui/` is the reference implementation. Match it.

## Role + name on every interactive element

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel={t('booking.confirm')}
  accessibilityHint={t('booking.confirmHint')}   // optional, describes the result
  onPress={confirm}
>
```

Roles used here: `button` `link` `tab` `header` `checkbox` `radio` `switch`
`image` `alert`. On web, `tablist` and `dialog` need the `aria` form.

A pressable containing only an icon or emoji has **no accessible name** without
`accessibilityLabel`.

## State must be announced, not just drawn

```tsx
accessibilityState={{ disabled, selected, checked, expanded, busy }}
```

A tab that is only visually underlined is not "selected" to a screen reader.
A button showing a spinner needs `busy: true`.

## Emoji are not icons

`📊` is announced literally ("bar chart"). Two correct treatments:

```tsx
// Decorative — the parent already has a name
<Text
  accessibilityElementsHidden
  importantForAccessibility="no"
  {...({ 'aria-hidden': true } as any)}
>📊</Text>

// Meaningful — name the parent, hide the glyph
<Pressable accessibilityRole="button" accessibilityLabel={t('nav.reports')}>
  <Text accessibilityElementsHidden importantForAccessibility="no">📊</Text>
</Pressable>
```

## Group compound content

A stat tile should read as one node, not three:

```tsx
<View accessible accessibilityLabel={`${value}, ${label}`}>
  {/* icon hidden, value, label */}
</View>
```

## Touch targets

Minimum 44dp. Where the design is smaller, expand the *touch* area, not the box:

```tsx
const MIN_TARGET_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };
<Pressable hitSlop={MIN_TARGET_SLOP} />
```

## Forms

```tsx
const id = useId();

<Text nativeID={`${id}-label`}>{label}</Text>
<TextInput
  accessibilityLabel={label}
  accessibilityHint={hint}
  {...({
    'aria-invalid': error ? true : undefined,
    'aria-errormessage': error ? `${id}-desc` : undefined,
    'aria-describedby': description ? `${id}-desc` : undefined,
  } as any)}
/>
{error && (
  <Text nativeID={`${id}-desc`} accessibilityLiveRegion="polite" {...({ role: 'alert' } as any)}>
    {error}
  </Text>
)}
```

Keyboard users need a visible focus ring on web. A `borderWidth: 1 → 2` swap is
not sufficient:

```tsx
...(Platform.OS === 'web' && isFocused
  ? { outlineStyle: 'solid', outlineWidth: 2, outlineOffset: 2, outlineColor: colors.borderFocus }
  : null)
```

## Modals

Use `ThemedModal` (`frontend/components/ui/Modal.tsx`) — it already does all of
this. Only if you must hand-roll one:

- native: `accessibilityViewIsModal` on the dialog container
- web: `role="dialog"`, `aria-modal`, `aria-labelledby` → the title's `nativeID`
- Escape closes (unless `persistent`)
- Tab is trapped inside the dialog and cycles
- focus moves into the dialog on open and returns to the trigger on close
- the close button has an `accessibilityLabel`; the `✕` glyph is hidden

## Strings

Every user-facing `accessibilityLabel` goes through `t('...')` and must exist in
both locales (`en` `af`). `npm --prefix frontend run i18n:detect-hardcoded`
scans `accessibilityLabel` attributes specifically.

## Enforcement

`eslint-plugin-react-native-a11y` is wired into `frontend/eslint.config.js` at
`warn`. `npm --prefix frontend run lint` reports missing roles, names and
states. Tighten individual rules to `error` as each area is cleaned up.
