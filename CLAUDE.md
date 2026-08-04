# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Drive Alive (RoadReady) — a South African driving-school booking platform. Instructors register and manage availability; students book lessons with GPS-based pickup/drop-off; payments in ZAR via Stripe/PayFast; WhatsApp reminders via Twilio.

## Commands

All commands run from the repo root unless noted. Use `s.bat` (Windows thin wrapper) or `python scripts/da.py` directly.

### Dev server

```
s.bat start                 # backend + frontend (default)
s.bat start -b              # backend only
s.bat start -f              # frontend only
s.bat start --debug         # verbose; pre-fills all forms via EXPO_PUBLIC_DEBUG_MODE=true
s.bat stop
s.bat env loc               # switch to localhost (default)
s.bat env net               # switch to LAN/mobile IP
```

### AGENTS.md quality gates (must exit 0 before any merge)

```bash
npm --prefix frontend run i18n:check-completeness
npm --prefix frontend run i18n:detect-hardcoded
python scripts/check_error_code_mapping.py
```

### Supporting checks (not merge-blocking yet)

```bash
npm --prefix frontend run lint        # eslint 9 flat config + react-native-a11y
npm --prefix frontend run typecheck   # ~203 pre-existing errors — do not add more
npm --prefix frontend run format      # prettier
npm --prefix frontend run build:web   # must produce dist/_redirects
```

Or `/gates` to run everything with the known baselines already accounted for.

### Release

```bash
s.bat release --minor --dry-run   # preview
s.bat release --minor             # bump minor, publish GitHub release
s.bat release --major
```

## Architecture

### Backend (`backend/`)

Uvicorn server on port 8000.

- `app/main.py` — app factory; mounts all routers; starts background schedulers (reminders, DB backup, token cleanup); runs inline idempotent migrations for schema changes that `create_all()` can't handle (add columns to existing tables — add new ones here, not via Alembic)
- `app/models/` — `__init__.py` is the canonical import point
- `app/services/` — business logic; key services: `AuthService`, `RoleTransitionPolicy`, `EmailService`, `WhatsAppService`, `InstructorVerificationService`, `PaymentGateway` (factory → Stripe or Mock)

**Background tasks:** `reminder_scheduler`, `backup_scheduler`, `verification_cleanup_scheduler` — all async, started in `lifespan`.

**Payments:** `get_payment_gateway()` factory returns `StripeGateway` or `MockGateway` based on env. Mock gateway completes instantly with no real charge (dev/test).

**Sensitive credential storage:** SMTP password and Twilio SID/token are encrypted at rest via `EncryptionService` (Fernet). Stored on the `User` model for the single admin user.

### Frontend (`frontend/`)

Runs on port 8081 (web) or via Expo tunnel.

- `navigation/MainTabs.tsx` — role dispatcher: reads `userRole` from `AuthContext`, renders `AdminTabs`, `InstructorTabs`, or `StudentTabs`
- `services/api/` — Axios client; interceptors add `Authorization: Bearer` header and handle 401/403 logout
- `i18n/` — custom lightweight i18n provider; `locales/en.ts` is the base (source of truth); af must match all keys

**State:** TanStack Query v5 for server state (staleTime 30s, gcTime 5m). React Context for auth/theme/i18n.

**Design system:** `theme/ThemeContext.tsx` is the single token source — `colors` (40 semantic slots, full light + dark), `spacing`, `radii`, `fontSizes`, `typography`, `fontFamilies`, `breakpoints`, `contentWidths`, plus `elevation(level)` and `withAlpha(color, a)` helpers. Theme mode persists to AsyncStorage. No Tailwind, no CSS variables — NativeWind was removed. Never write a raw hex, a hand-rolled shadow, or `fontFamily: 'Inter_*'` in a screen.

**Responsive:** `hooks/useBreakpoint.ts` is the only sanctioned source of viewport-derived values — `select({ xs, sm, md, lg, xl })`, `up`, `down`, `isPhone`/`isTablet`/`isDesktop`. Breakpoints: `xs 0 · sm 480 · md 768 · lg 1024 · xl 1440`; `md` is also `SIDEBAR_BREAKPOINT`, where the bottom tab bar becomes a left nav rail on web. Content width comes from `<ScreenContainer width="form|content|wide|full">`. **Never put a viewport-derived value inside `StyleSheet.create`** — it runs once at module import and freezes the layout at load width. `responsive(web, mobile)` is deprecated (branches on platform, not viewport).

**Accessibility:** `components/ui/` is the reference implementation — roles, accessible names, `accessibilityState`, 44dp targets via `hitSlop`, emoji hidden from assistive tech, and a full web focus trap + Escape handling in `ThemedModal`. Enforced at `warn` by `eslint-plugin-react-native-a11y`.

**Auth token storage:** HTTP-only cookie (web) · `expo-secure-store` (native).

**Platform rule:** never use browser-only APIs in shared code paths. Use `.web.tsx` / `.native.tsx` suffixes for platform-specific implementations (see `MapPreview.*`).

### Role system

Three roles: `student`, `instructor`, `admin`. A single user can hold multiple role profiles simultaneously (one `User` row + optional `Student` + optional `Instructor`).

**Runtime role selection:** at login, `RoleTransitionPolicy.get_available_runtime_roles()` returns all roles the user can log in as. If multiple, the frontend must present a picker; the selected role is encoded in the JWT and determines which tab navigator loads.

**Instructor verification workflow** (`verification_status` column on `Instructor`):
1. `pending_admin` — registration complete; awaiting admin approval
2. `pending_company` — admin approved a company member; awaiting company owner approval
3. `verified` — fully approved; can log in as instructor
4. `rejected` — rejected; account suspended

`RoleTransitionPolicy.assert_runtime_role_ready()` blocks instructor login until status is `verified`.

### Auth

JWT (HS256) with `jti` claim for single-session enforcement. On login, `jti` is written to `user.active_session_token` in the DB. Subsequent requests validate `jti` matches; a login from another device/browser overwrites it, invalidating previous sessions. Logout clears the column.

Firebase UID is stored on `User` but is not the primary auth mechanism — the system uses email/password + JWT.

### i18n

Two locales: `en` (base) and `af`. All keys in `af` must match `en` exactly — enforced by the `i18n:check-completeness` gate. New user-facing strings must go into both locale files and must not be hardcoded inline (enforced by `i18n:detect-hardcoded`). Allowlist for permitted hardcoded strings: `frontend/i18n/hardcoded-allowlist.json`.

isiZulu and isiXhosa were removed (Aug 2026) rather than shipped as unreviewed machine translation. To reinstate them: restore `locales/zu.ts` / `xh.ts` from commit `f92d033`, add the codes back to `SUPPORTED_LOCALES` (`i18n/index.tsx`), `LOCALES` (`scripts/i18n-check-completeness.mjs`) and `SUPPORTED_LANGUAGES` (`backend/app/schemas/user.py`).

Backend error codes raised as `HTTPException` must have a stable `code` field and a matching entry in `frontend/i18n/error-code-map.json` — enforced by `check_error_code_mapping.py`.
