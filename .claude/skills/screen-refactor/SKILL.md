---
name: screen-refactor
description: Safe procedure for refactoring DRIVE_ALIVE's very large screen files (500–2500 lines) without breaking i18n keys, testIDs or Cypress specs. Use before touching DatabaseInterfaceScreen, BookingScreen, UserManagementScreen or any screen over ~500 lines.
---

# Refactoring a large screen

Screen sizes in this repo are not typical. Before editing, know what you are in:

| File | Lines |
|---|---|
| `screens/admin/DatabaseInterfaceScreen.tsx` | 2524 |
| `screens/booking/BookingScreen.tsx` | 1810 |
| `screens/admin/UserManagementScreen.tsx` | 1536 |
| `screens/auth/LoginScreen.tsx` | 1417 |
| `screens/instructor/InstructorHomeScreen.tsx` | 1329 |
| `screens/instructor/EarningsReportScreen.tsx` | 1251 |

Each ends with its own 200–600 line private `StyleSheet.create`.

## Procedure

**1. Read the entire file before editing.** Not a grep window. These screens
carry state machines, effects with subtle dependency arrays, and platform
branches that a local edit will silently break.

**2. Inventory what must survive.** Grep the file for and write down:

```bash
grep -n "testID=" <file>
grep -n "accessibilityLabel=" <file>
grep -n "t('" <file>
```

`frontend/cypress/e2e/*.cy.ts` selects on `testID`s. Changing or dropping one
breaks the E2E suite with an error that points at the spec, not at your edit.

**3. Change one category at a time, in this order.** Each step is independently
verifiable; interleaving them makes a failure impossible to attribute.

  1. colours → tokens
  2. shadows → `elevation()`
  3. width → `ScreenContainer width=`
  4. viewport values out of `StyleSheet.create` → `useBreakpoint()`
  5. typography → `typography` / `fontFamilies`
  6. accessibility props
  7. only then, extracting sub-components

**4. Extract sub-components last, and only when a section is genuinely
self-contained.** A section that closes over six pieces of screen state is not
self-contained; leave it. When you do extract, co-locate it in the same file
first and move it to `components/` in a separate change.

**5. Run the gates after each category**, not once at the end:

```bash
npm --prefix frontend run typecheck    # your file must add zero new errors
npm --prefix frontend run lint
npm --prefix frontend run i18n:check-completeness
npm --prefix frontend run i18n:detect-hardcoded
python scripts/check_error_code_mapping.py
```

`typecheck` currently reports ~297 pre-existing errors repo-wide. Filter to your
file — the count for *your* file must not go up:

```bash
npx tsc --noEmit --pretty false 2>&1 | grep "<your-file>"
```

**6. Verify visually.** Run `s.bat start` and resize the browser 390 → 1440
without reloading. Typechecking proves nothing about layout.

## Do not

- Reword user-facing copy while restyling. If a string is hardcoded English,
  leave it and note it — moving it into locales is a separate change with its
  own translation obligation across `af`, `zu`, `xh`.
- Change data flow, API calls, or navigation while doing visual work.
- Delete a `BACKUP` or `_OLD` file as a side effect. Propose it separately.
- Split one screen across multiple parallel agents. Screens are the unit of
  isolation; two agents in the same file will conflict even in separate
  worktrees.
