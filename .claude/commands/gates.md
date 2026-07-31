---
description: Run every quality gate and report pass/fail honestly
---

Run all quality gates from the repo root and report the result of each.

**AGENTS.md mandatory gates — these must exit 0 before any merge:**

```bash
npm --prefix frontend run i18n:check-completeness
npm --prefix frontend run i18n:detect-hardcoded
python scripts/check_error_code_mapping.py
```

**Supporting checks:**

```bash
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend test -- --ci
```

Report a table: gate · exit code · one-line summary. Then any failure in detail.

## Known baselines — do not report these as new regressions

- `typecheck` — ~297 pre-existing errors repo-wide. What matters is whether the
  count went **up**, and whether any error is in a file the current change
  touched. Check both.
- `test` — 2 of 5 Jest suites fail to load because the config uses the bare
  `react-native` preset instead of `jest-expo`, so anything importing
  expo-modules-core dies. See the note at the top of `frontend/jest.config.js`.
- `i18n:detect-hardcoded` — verify `frontend/i18n/hardcoded-allowlist.json` does
  not contain directory-wide `ignorePathRegexes` (`^screens/.*` etc.). If it
  does, the gate is passing vacuously and its green result means nothing. Say so.

Never report a gate as passing when it exited non-zero.
