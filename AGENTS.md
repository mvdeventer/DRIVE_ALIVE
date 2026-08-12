# DRIVE_ALIVE Multi-Agent Implementation Contract

This file is the shared execution brief for all coding agents and models used in this repository.

## Objective

Implement and maintain production-grade internationalization and error-code consistency across backend and frontend with strict, automatable quality gates.

## Current Stack Context

- Backend: FastAPI + SQLAlchemy (Python). **No Alembic** — schema changes go in
  `_apply_incremental_migrations()` in `app/main.py`.
- Frontend: Expo React Native + TypeScript + react-native-web
- Locales currently in use: en, af
- i18n provider: frontend/i18n/index.tsx

## Mandatory Deliverables

1. i18n completeness gate
2. hardcoded text detection gate
3. backend-to-frontend error code mapping gate

## Required Task Order

1. Keep `en` as base source-of-truth locale.
2. Ensure locale key parity for af against en.
3. Prevent new hardcoded user-facing literals in app code.
4. Standardize backend user-facing errors to include stable `code` values.
5. Ensure every backend error code has a frontend translation mapping.

## Acceptance Criteria

- `npm --prefix frontend run i18n:check-completeness` exits 0 when all locale keys match `en`.
- `npm --prefix frontend run i18n:detect-hardcoded` exits 0 when no disallowed hardcoded user-facing strings are found.
- `python scripts/check_error_code_mapping.py` exits 0 when backend error codes are fully mapped in frontend.
- All scripts fail with clear actionable output when requirements are not met.

## Required Commands

- `npm --prefix frontend run i18n:check-completeness`
- `npm --prefix frontend run i18n:detect-hardcoded`
- `python scripts/check_error_code_mapping.py`

## Notes For Agents

- Preserve cross-platform compatibility (iOS/Android/Web) in frontend changes.
- Do not introduce browser-only APIs into shared React Native code paths.
- Keep checks deterministic and CI-friendly (non-interactive, machine-readable enough for logs).

## Design System & Cross-Device Contract

`frontend/theme/ThemeContext.tsx` is the single source of truth for colour,
spacing, radius, typography, elevation and breakpoints. There is no Tailwind
config and no CSS variables file — both existed, drifted out of sync, and were
removed. Do not reintroduce a second source.

- **No raw hex** in `screens/` or `components/`. Use `colors.*`; tint with
  `withAlpha(color, alpha)`, never string concatenation.
- **No hand-written shadows.** Use `elevation('sm'|'md'|'lg')`.
- **No raw font-family strings.** Use `fontFamilies.*` or a `typography.*` role.
- **Viewport branching goes through `useBreakpoint()`** (`frontend/hooks/useBreakpoint.ts`).
  `Platform.OS` is for capability differences only, never for a size. The
  theme's `responsive(web, mobile)` is deprecated.
- **Never put a viewport-derived value inside `StyleSheet.create`.** It runs
  once at module import, so the layout freezes at load width and never responds
  to resize or rotation. Pass it inline.
- **Content width** comes from `<ScreenContainer width="form|content|wide|full">`,
  not a per-screen `maxWidth`.
- **Accessibility:** every interactive element needs `accessibilityRole` and an
  accessible name; state changes need `accessibilityState`; touch targets are
  ≥44dp (use `hitSlop`); emoji icons are hidden from assistive tech.
  `frontend/components/ui/` is the reference implementation.

### Supporting checks

Not merge-blocking yet, but run them:

```
npm --prefix frontend run lint        # eslint + react-native-a11y rules
npm --prefix frontend run typecheck   # 89 pre-existing errors, all in __tests__; do not add more
npm --prefix frontend test -- --ci
```

### Known baselines — do not mistake these for new regressions

- `typecheck` has 89 pre-existing errors, every one inside `__tests__` (Cypress's
  Chai types shadow Jest's global `expect`). Application code is clean. What
  matters is whether the count
  rose and whether any error is in a file you touched.
- 2 of 5 Jest suites fail to load: the config uses the bare `react-native`
  preset, not `jest-expo`, so anything importing expo-modules-core dies. See the
  note at the top of `frontend/jest.config.js`.
- `frontend/i18n/hardcoded-allowlist.json` is now an explicit **baseline** of 65
  files. It must only ever shrink — never add a path to it.

### Tooling

`.claude/agents/` — `responsive-auditor`, `ui-refactorer`, `a11y-fixer`,
`cross-device-verifier`, `i18n-guardian`, `design-system-keeper`.
`.claude/skills/` — `responsive-screen`, `design-tokens`, `rn-a11y`,
`screen-refactor`, `visual-check`.
`.claude/commands/` — `/design-audit`, `/responsive <screen>`, `/gates`, `/efficient`.

Agents that write files declare `isolation: worktree`, so several can run in
parallel on different screens without colliding. `.worktreeinclude` carries
`.env` into each worktree. **One screen per agent** — two agents in the same
file conflict even in separate worktrees.
