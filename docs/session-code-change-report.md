# DRIVE_ALIVE Session Code Change Report

Generated from the current session on 2026-05-31.

## Purpose

This report summarizes the code, docs, workflow, and security changes made during the session and provides a compact map of how the application flows together.

## Executive Summary

The session focused on three connected areas:

1. Shared agent and workflow guidance for all future chats and model runs.
2. Repository quality gates for locale parity, hardcoded text detection, and backend-to-frontend error-code mapping.
3. Focused security and workflow documentation updates, plus a small backend security hardening pass.

## Files Changed In This Session

### Shared agent / workflow files
- [AGENTS.md](../AGENTS.md)
- [.github/copilot-instructions.md](../.github/copilot-instructions.md)
- [DEVELOPMENT_GUIDE.md](../DEVELOPMENT_GUIDE.md)
- [.github/workflows/quality-gates.yml](../.github/workflows/quality-gates.yml)

### Quality-gate implementation files
- [frontend/package.json](../frontend/package.json)
- [frontend/scripts/i18n-check-completeness.mjs](../frontend/scripts/i18n-check-completeness.mjs)
- [frontend/scripts/i18n-detect-hardcoded.mjs](../frontend/scripts/i18n-detect-hardcoded.mjs)
- [frontend/i18n/hardcoded-allowlist.json](../frontend/i18n/hardcoded-allowlist.json)
- [frontend/i18n/error-code-map.json](../frontend/i18n/error-code-map.json)
- [frontend/i18n/locales/en.ts](../frontend/i18n/locales/en.ts)
- [frontend/i18n/locales/af.ts](../frontend/i18n/locales/af.ts)
- [frontend/i18n/locales/zu.ts](../frontend/i18n/locales/zu.ts)
- [frontend/i18n/locales/xh.ts](../frontend/i18n/locales/xh.ts)
- [scripts/check_error_code_mapping.py](../scripts/check_error_code_mapping.py)

### Backend security hardening
- [backend/app/schemas/user.py](../backend/app/schemas/user.py)
- [backend/app/routes/auth.py](../backend/app/routes/auth.py)

### Documentation updates
- [README.md](../README.md)
- [SETUP_INTEGRATION_GUIDE.md](../SETUP_INTEGRATION_GUIDE.md)
- [docs/RELEASE_WORKFLOW.md](../docs/RELEASE_WORKFLOW.md)
- [docs/INSTALL_WINDOWS.md](../docs/INSTALL_WINDOWS.md)
- [docs/UPDATE_WINDOWS.md](../docs/UPDATE_WINDOWS.md)
- [frontend/SECURITY_TESTING.md](../frontend/SECURITY_TESTING.md)

## What Was Implemented

### 1. Shared agent contract

A root-level [AGENTS.md](../AGENTS.md) file was added so every future agent/model run can read the same high-level execution contract.

It now defines:
- the repository objective around i18n and error-code consistency,
- the required quality gates,
- the required commands to run them,
- the backend and frontend compatibility expectations.

[.github/copilot-instructions.md](../.github/copilot-instructions.md) was also updated to point to that shared contract.

### 2. Developer workflow guide

A new [DEVELOPMENT_GUIDE.md](../DEVELOPMENT_GUIDE.md) was added as the human-readable companion to the agent contract.

It explains:
- what each quality gate checks,
- how to run them locally,
- the current security baseline,
- the recommended workflow after code changes.

### 3. i18n completeness gate

The frontend completeness gate was implemented in [frontend/scripts/i18n-check-completeness.mjs](../frontend/scripts/i18n-check-completeness.mjs).

Behavior:
- Uses `en` as the base locale.
- Checks that `af`, `zu`, and `xh` have the same key structure.
- Reports missing keys as failures.
- Warns on extra keys.

This gate is wired into [frontend/package.json](../frontend/package.json) and into the GitHub Actions workflow.

### 4. Hardcoded-text detection gate

The frontend hardcoded-text gate was implemented in [frontend/scripts/i18n-detect-hardcoded.mjs](../frontend/scripts/i18n-detect-hardcoded.mjs).

Behavior:
- Scans frontend source files for likely user-facing literals.
- Uses a staged allowlist in [frontend/i18n/hardcoded-allowlist.json](../frontend/i18n/hardcoded-allowlist.json).
- Treats existing legacy screens/components as suppressed until they are migrated.
- Keeps the script standalone and dependency-free.

The gate is also wired into [frontend/package.json](../frontend/package.json) and CI.

### 5. Error-code mapping gate

The backend-to-frontend mapping gate was implemented in [scripts/check_error_code_mapping.py](../scripts/check_error_code_mapping.py).

Behavior:
- Detects backend error codes from Python sources.
- Verifies each backend code has a frontend translation key mapping.
- Fails with a readable list of missing mappings.

A seed mapping file was added at [frontend/i18n/error-code-map.json](../frontend/i18n/error-code-map.json).

### 6. Locale translations for error states

The base and translated locale files were extended with an `errors` namespace.

Added keys cover:
- invalid credentials,
- expired token,
- forbidden access,
- pending verification,
- setup already initialized,
- user not found,
- booking not found.

### 7. GitHub Actions workflow

A new workflow at [.github/workflows/quality-gates.yml](../.github/workflows/quality-gates.yml) runs the three gates on pull requests:
- locale completeness,
- hardcoded text detection,
- backend error-code mapping.

### 8. Backend security hardening

Two targeted hardening changes were made:
- password change and reset requests now require stronger passwords,
- password changes are rate-limited,
- non-development environments now use secure auth cookies,
- sensitive auth debug logs were removed.

### 9. Documentation updates

The main docs now reference the new workflow and security baseline:
- [README.md](../README.md) now includes the quality gates section,
- [docs/RELEASE_WORKFLOW.md](../docs/RELEASE_WORKFLOW.md) now requires the gates before release,
- [SETUP_INTEGRATION_GUIDE.md](../SETUP_INTEGRATION_GUIDE.md) now points setup work to the gates,
- [docs/INSTALL_WINDOWS.md](../docs/INSTALL_WINDOWS.md) and [docs/UPDATE_WINDOWS.md](../docs/UPDATE_WINDOWS.md) now tell users to run the gates after install/update,
- [frontend/SECURITY_TESTING.md](../frontend/SECURITY_TESTING.md) now includes the app security gates and current baseline controls.

## Code Flow Map

### Frontend app flow

1. `frontend/App.tsx` loads the application shell.
2. `frontend/i18n/index.tsx` supplies the current locale, translation lookup, and persistence.
3. Navigation and screens consume translations through `useI18n()` / `useT()`.
4. User-facing text now has a target structure that can be checked against the base `en` locale.
5. The hardcoded-text gate scans the frontend surface and flags new unlocalized copy.

### Authentication flow

1. `backend/app/routes/auth.py` handles login, registration, password reset, logout, and profile updates.
2. `backend/app/schemas/user.py` validates request payloads, including password strength.
3. Login issues an access token and stores the active session token.
4. Web clients receive an HTTP-only cookie; mobile/API clients still receive the bearer token response.
5. The current user endpoint resolves the token, role, and session validity.
6. Password changes and resets now require stronger passwords and are rate-limited.

### Setup / initialization flow

1. `SETUP_INTEGRATION_GUIDE.md` documents the first-run setup check.
2. The app checks whether setup is required.
3. If required, the setup screen is shown before normal login.
4. After setup completes, the app returns to the normal auth flow.

### Release and documentation flow

1. `docs/RELEASE_WORKFLOW.md` describes the release path.
2. `s.bat release --minor` or `s.bat release --major` triggers versioning and release generation.
3. The generated docs and installer assets are built and published.
4. The release workflow now explicitly requires the quality gates before publish.

### Security flow

1. `backend/app/main.py` applies security headers.
2. `backend/app/routes/auth.py` enforces auth cookies, rate limits, and password-policy checks.
3. `frontend/SECURITY_TESTING.md` documents the app-level checks and baseline controls.
4. The docs now point developers to the gate scripts and security expectations.

## Memory Map: How The Application Works

### Core layers

- **Frontend shell**: Expo React Native app, shared across iOS, Android, and Web.
- **i18n layer**: `frontend/i18n/index.tsx` holds locale state, lookup, interpolation, and persistence.
- **Navigation layer**: React Navigation stacks/tabs route users into role-specific sections.
- **API layer**: frontend services call the backend over HTTP using authenticated requests.
- **Backend app**: FastAPI application with routes, schemas, services, utilities, and middleware.
- **Database layer**: SQLAlchemy models and migrations manage persistent state.

### Major backend subsystems

- **Auth**: login, registration, current-user resolution, session enforcement, logout, password reset.
- **Setup**: first-run admin creation and initialization checks.
- **Bookings**: scheduling, conflict checks, rescheduling, cancellation behavior.
- **Payments**: payment initiation and verification.
- **Verification**: email/WhatsApp workflows for user and instructor onboarding.
- **Admin tools**: analytics, database browser, user management, company management.
- **Schedulers**: reminders, backups, verification cleanup.

### Major frontend subsystems

- **Auth screens**: login, registration, password recovery, setup.
- **Role tabs**: student, instructor, admin and related dashboard sections.
- **Shared components**: inputs, selectors, banners, list helpers, map preview, top bar.
- **Testing / support docs**: security, accessibility, cross-browser, and performance guidance.

### Persistent configuration concepts

- `APP_NAME`, `APP_DOMAIN`, and related branding are runtime-configurable.
- `FRONTEND_URL` drives links, redirects, and verification flows.
- `ALLOWED_ORIGINS` controls CORS.
- `SECRET_KEY`, JWT expiry, and rate limiting protect auth flows.
- `ENCRYPTION_KEY` protects sensitive stored secrets.
- `RATE_LIMIT_ENABLED` and `REDIS_URL` enable throttling.

## Validation Performed

The following checks passed during this session:
- `npm --prefix frontend run i18n:check-completeness`
- `npm --prefix frontend run i18n:detect-hardcoded`
- `python scripts/check_error_code_mapping.py`

Codacy also verified the touched source files after cleanup. The backend auth file still has existing complexity warnings, but those are pre-existing and were not introduced by this session.

## Regeneration Notes

This report is intended to be regenerated when code changes are made.

Recommended regeneration path:
1. Update the source markdown.
2. Run the report generation script.
3. Open the `.docx` and verify the flow map and file list.

