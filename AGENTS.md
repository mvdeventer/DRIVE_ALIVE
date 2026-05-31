# DRIVE_ALIVE Multi-Agent Implementation Contract

This file is the shared execution brief for all coding agents and models used in this repository.

## Objective

Implement and maintain production-grade internationalization and error-code consistency across backend and frontend with strict, automatable quality gates.

## Current Stack Context

- Backend: FastAPI + SQLAlchemy + Alembic (Python)
- Frontend: Expo React Native + TypeScript + react-native-web
- Locales currently in use: en, af, zu, xh
- i18n provider: frontend/i18n/index.tsx

## Mandatory Deliverables

1. i18n completeness gate
2. hardcoded text detection gate
3. backend-to-frontend error code mapping gate

## Required Task Order

1. Keep `en` as base source-of-truth locale.
2. Ensure locale key parity for af, zu, xh against en.
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
