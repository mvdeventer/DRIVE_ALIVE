---
description: Migrate one screen to the token + breakpoint system, add accessibility, then verify it
---

Make one screen work properly on every device.

Target screen: $ARGUMENTS

If no screen was given, ask which one — do not pick for the user.

Run in sequence (each depends on the previous):

1. **`ui-refactorer`** on that screen. It handles colours → tokens, ad-hoc
   `maxWidth` → `ScreenContainer width=`, hand-written shadows → `elevation()`,
   `responsive()` / `Dimensions.get` → `useBreakpoint()`, grid columns →
   `select({...})`.

2. **`a11y-fixer`** on the same screen. Roles, accessible names, states, 44dp
   touch targets, emoji handling, form error announcement.

3. **`cross-device-verifier`** limited to that screen's route. It must include
   the reflow check — resize 390 → 1440 **without reloading** and confirm the
   layout moves. That is what catches a value still trapped in
   `StyleSheet.create`.

Then report:

- what changed, by category and count
- the output of the five gates, verbatim
- any colour with no matching semantic token, and any accessibility label that
  needs a new i18n key (these need a human decision — do not invent either)
- anything the verifier could not reach

If the screen is over ~500 lines, load the `screen-refactor` skill first and
follow its ordering.
