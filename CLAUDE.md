# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Drive Alive (RoadReady) v7.0.0 — a South African driving-school booking platform. Instructors register and manage availability; students book lessons with GPS-based pickup/drop-off; payments in ZAR via Stripe/PayFast; WhatsApp reminders via Twilio.

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

### Tests

```bash
# Backend — all tests
cd backend && venv\Scripts\activate && pytest -v --cov=app

# Backend — single test or file
cd backend && venv\Scripts\activate && pytest -v -k "test_name_or_keyword"
cd backend && venv\Scripts\activate && pytest -v tests/test_role_transition_policy.py

# Frontend — Jest
cd frontend && npm test
cd frontend && npm test -- --testPathPattern="MainTabs"   # single file
cd frontend && npm test -- -t "renders admin tabs"        # single test by name

# E2E (Cypress, requires servers running)
cd frontend && npm run webtest:smoke                      # multi-role smoke
cd frontend && npm run test:e2e                           # database interface
```

### AGENTS.md quality gates (must exit 0 before any merge)

```bash
npm --prefix frontend run i18n:check-completeness
npm --prefix frontend run i18n:detect-hardcoded
python scripts/check_error_code_mapping.py
```

### Lint / format

```bash
make lint     # flake8 + mypy (backend) + npm lint (frontend)
make format   # black + isort (backend) + npm format (frontend)
```

### Release

```bash
s.bat release --minor --dry-run   # preview
s.bat release --minor             # bump minor, publish GitHub release
s.bat release --major
```

## Architecture

### Backend (`backend/`)

FastAPI + SQLAlchemy ORM + Alembic + PostgreSQL. Uvicorn server on port 8000.

- `app/main.py` — app factory; mounts all routers; starts background schedulers (reminders, DB backup, token cleanup); runs inline idempotent migrations for schema changes that `create_all()` can't handle (add columns to existing tables — add new ones here, not via Alembic)
- `app/routes/` — one file per domain (auth, bookings, instructors, students, admin, payments, availability, companies, certifications, verification, database, webhooks, setup)
- `app/models/` — SQLAlchemy models; `__init__.py` is the canonical import point
- `app/services/` — business logic; key services: `AuthService`, `RoleTransitionPolicy`, `EmailService`, `WhatsAppService`, `InstructorVerificationService`, `PaymentGateway` (factory → Stripe or Mock)
- `app/schemas/` — Pydantic request/response schemas
- `app/utils/` — encryption, rate limiting (SlowAPI + Redis), logging

**Background tasks:** `reminder_scheduler`, `backup_scheduler`, `verification_cleanup_scheduler` — all async, started in `lifespan`.

**Payments:** `get_payment_gateway()` factory returns `StripeGateway` or `MockGateway` based on env. Mock gateway completes instantly with no real charge (dev/test).

**Sensitive credential storage:** SMTP password and Twilio SID/token are encrypted at rest via `EncryptionService` (Fernet). Stored on the `User` model for the single admin user.

### Frontend (`frontend/`)

Expo React Native 54 + TypeScript + react-native-web. Runs on port 8081 (web) or via Expo tunnel.

- `App.tsx` — root; wraps providers (QueryClient, AuthContext, ThemeContext, I18nProvider)
- `navigation/MainTabs.tsx` — role dispatcher: reads `userRole` from `AuthContext`, renders `AdminTabs`, `InstructorTabs`, or `StudentTabs`
- `navigation/{Admin,Instructor,Student}Tabs.tsx` — bottom tab navigators with nested stacks per role
- `screens/{auth,admin,instructor,student}/` — screens grouped by role
- `components/ui/` — shared UI primitives (Button, Card, Input, Badge, StatCard, Skeleton, etc.)
- `services/api/` — Axios client; interceptors add `Authorization: Bearer` header and handle 401/403 logout
- `i18n/` — custom lightweight i18n provider; `locales/en.ts` is the base (source of truth); af, zu, xh must match all keys

**State:** TanStack Query v5 for server state (staleTime 30s, gcTime 5m). React Context for auth/theme/i18n.

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

Four locales: `en` (base), `af`, `zu`, `xh`. All keys in `af`/`zu`/`xh` must match `en` exactly — enforced by the `i18n:check-completeness` gate. New user-facing strings must go into all four locale files and must not be hardcoded inline (enforced by `i18n:detect-hardcoded`). Allowlist for permitted hardcoded strings: `frontend/i18n/hardcoded-allowlist.json`.

Backend error codes raised as `HTTPException` must have a stable `code` field and a matching entry in `frontend/i18n/error-code-map.json` — enforced by `check_error_code_mapping.py`.
