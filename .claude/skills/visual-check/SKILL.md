---
name: visual-check
description: Procedure for driving the running DRIVE_ALIVE web app through a viewport matrix with Playwright MCP to catch layout failures typechecking can't see. Use to verify responsive or theme work actually renders.
---

# Visual verification with Playwright MCP

Typechecking and linting say nothing about whether a layout reflows. This is the
only check that catches a frozen grid or a dark-mode leak.

## Prerequisites

App running via `s.bat start` → `http://localhost:8081`. Playwright MCP is
already configured in `.mcp.json` and enabled. If the app is not reachable, stop
and say so; do not start it from inside a verification run.

Credentials and selectors for all three roles live in
`frontend/cypress/e2e/multi-role-smoke.cy.ts` — read it rather than guessing.

## The matrix

| Width × Height | Represents |
|---|---|
| 390 × 844 | phone |
| 768 × 1024 | tablet / split window — nav rail appears at this width |
| 1024 × 768 | laptop |
| 1440 × 900 | large desktop |

Every width in **both** light and dark, for **all three** roles.

## Per viewport

1. `browser_resize`, then `browser_snapshot`.
2. **Overflow check:**
   ```js
   browser_evaluate: () => ({
     scrollW: document.documentElement.scrollWidth,
     clientW: document.documentElement.clientWidth,
   })
   ```
   `scrollW > clientW` on the page body is a failure. A wide table scrolling
   inside its own container is fine.
3. **Content cap check** at 1440: measure the main content block. Filling the
   full 1440 means a missing `ScreenContainer width=`.
4. `browser_console_messages` — collect errors.
5. `browser_take_screenshot` for anything that fails.

## The reflow check — do not skip this

Resize between two widths that should change the column count **without
reloading the page**. If the grid does not move, a viewport value is trapped in
`StyleSheet.create` or at module scope.

A reload-only test will miss this entirely, because on reload the frozen value
happens to be correct for the new width. This is the single highest-value check
in the procedure.

## Dark mode

Toggle the theme in-app and re-walk the matrix. Any element still light-on-light
or dark-on-dark means a hardcoded hex survived. Reload once afterwards to
confirm the choice persisted (it is stored under `@roadready/theme-mode`).

## Reporting

A route × width × theme table with pass/fail, then each failure with its
screenshot and the likely responsible file — grep to confirm before naming one.
Rank: frozen layout > page overflow > uncapped content > cosmetic.

State explicitly which routes you did not reach and why. Never mark a route as
passing if you did not load it.
