# First Chat with Claude — DRIVE_ALIVE Security & Web Hosting Audit

**Date:** 2026-06-11  
**Project:** DRIVE_ALIVE (RoadReady v7.0.0)  
**Stack:** FastAPI + PostgreSQL + Redis (backend) · Expo React Native 54 + TypeScript + react-native-web (frontend)

---

## Session Overview

This session covered two main phases:

1. **Setup** — Creating `CLAUDE.md` and `.claude/settings.json` for token-efficient future sessions
2. **Security + Web Hosting Audit** — Full audit of the codebase followed by implementation of 15 fixes/features

---

## Phase 1: Project Setup for Claude Code

### CLAUDE.md Created
Auto-loads into every Claude Code session, eliminating the need to re-describe the stack each time. Contains:
- All `s.bat` and `python scripts/da.py` commands (start, stop, test, release)
- Architecture overview (backend routes, services, models; frontend navigation, state, auth)
- Role system (student / instructor / admin) and verification workflow
- JWT single-session enforcement (`jti` + `active_session_token`)
- i18n 4-locale system with AGENTS.md quality gates
- Cross-platform rule: no browser-only APIs in shared React Native code

### `.claude/settings.json` Created
Permission allowlist eliminating approval prompts for common read commands:
```json
{
  "permissions": {
    "allow": [
      "Bash(npm --prefix frontend run i18n:check-completeness)",
      "Bash(npm --prefix frontend run i18n:detect-hardcoded)",
      "Bash(python scripts/check_error_code_mapping.py)",
      "Bash(python scripts/da.py status)",
      "Bash(s.bat status)"
    ]
  }
}
```

### MCP Policy Decision
`.vscode/mcp.json` intentionally stays empty — each enabled MCP server injects its full tool schema on every turn, burning tokens. Add temporarily per domain (postgres, github, playwright), then remove.

---

## Phase 2: Security Audit Findings

### Critical
- **Live credentials in `.env`** — GitHub PAT, Twilio Account SID, Twilio Auth Token committed to the repo. **These must be rotated immediately.**
- **`Base.metadata.drop_all()`** in exception handler — would wipe the entire production database on startup error. **Removed.**

### High Severity
| # | Issue | File |
|---|-------|------|
| 1 | No account lockout after failed logins | `services/auth.py` |
| 2 | `/setup/create-initial-admin` has no rate limit | `routes/setup.py` |
| 3 | Instructor `setup_token` never invalidated | `routes/instructor_setup.py` |
| 4 | No HTTP→HTTPS redirect in production | `main.py` |
| 5 | Cookie `max_age` hardcoded 7 days (ignores JWT expiry setting) | `routes/auth.py` |
| 6 | `/check-unique` endpoint had no rate limit | `routes/auth.py` |
| 7 | Password reset tokens used `uuid4` (weak entropy) | `models/password_reset.py` |
| 8 | User enumeration via split login errors | `services/auth.py` |

### Medium Severity
| # | Issue | File |
|---|-------|------|
| 9 | N+1 queries in earnings report | `routes/instructors.py` |
| 10 | N+1 queries in `get_my_bookings` | `routes/bookings.py` |
| 11 | `active_role` undefined bug in `get_booking()` | `routes/bookings.py:895` |
| 12 | No compound indexes on bookings table | `main.py` migrations |
| 13 | Instructor verification check missing in payments | `routes/payments.py` |
| 14 | No production secret validation at startup | `config.py` |

### Production Readiness
- No Dockerfile existed
- `docker-compose.yml` had dead Celery service + `--reload` in production
- No CORS production/dev split
- TypeScript `strict: false`
- No Sentry error monitoring
- No PWA support
- No public instructor pages for SEO

---

## Phase 3: Fixes Implemented (Previous Session)

### Before This Session's Todo List
These were implemented in the prior context window:

| Fix | Details |
|-----|---------|
| Remove `drop_all()` | Replaced with safe log message |
| Production secret validation | `validate_production_secrets()` in `config.py` |
| CORS split | Production origins always included; dev origins only in non-production |
| `active_role` undefined bug | Added `active_role = get_active_role(current_user)` at `bookings.py:895` |
| Mock payment mode | `ALLOW_MOCK_PAYMENTS` config flag; mock only when no Stripe key |
| Payments: instructor verification check | Blocks payment for unverified instructors |
| Payments: duration validation | 30–180 min bounds enforced |
| Password reset token entropy | `secrets.token_urlsafe(32)` replaces `uuid4()` |
| User enumeration | Single generic 401 for both "not found" and "wrong password" |
| `/check-unique` rate limit | `@limiter.limit("20/minute")` |
| Database backup PII | Removed `password_hash`, `address`, coordinates from backup payload |
| PostgreSQL SSL | `connect_args={"sslmode": "require"}` in production |
| Dockerfile | Multi-stage build, non-root `appuser`, health check |
| Docker Compose | Removed `--reload`, removed dead Celery service, Redis password |

---

## Phase 4: Todo List Implemented (This Session)

All 15 items completed:

### Security (Items 1–5)

**1. Account lockout after 5 failed logins**
- Added `failed_login_attempts: int` and `account_locked_until: DateTime` to `backend/app/models/user.py`
- Added inline migration in `main.py` `_apply_incremental_migrations()`
- Updated `services/auth.py` `authenticate_user()`: check lockout → increment on failure → reset on success → 429 when locked

**2. Rate-limit `/setup/create-initial-admin`**
- Added `Request` to fastapi imports in `routes/setup.py`
- Added `from ..utils.rate_limiter import limiter`
- Added `@limiter.limit("3/hour")` decorator and `request: Request` parameter

**3. Invalidate instructor `setup_token` after first login**
- In `routes/auth.py` login endpoint, after `create_user_token()`, queries the instructor profile and sets `setup_token = None` if present
- Rationale: setup token is multi-use during setup flow, so clearing it on first verified login (not on first use) is the correct moment

**4. HTTP→HTTPS redirect middleware**
- Added at top of `add_security_headers` middleware in `main.py`
- Returns 301 redirect when `ENVIRONMENT == "production"` and `request.url.scheme == "http"`

**5. Cookie `max_age` aligned with JWT expiry**
- Changed `max_age=3600 * 24 * 7` → `max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60`

### Performance (Items 6–8)

**6. Fix N+1 in `get_earnings_report()`**
- File: `backend/app/routes/instructors.py`
- Before: per-booking `db.query(Student)` + `db.query(User)` in loop (2N queries)
- After: bulk load all student IDs then user IDs in 2 queries total using `.in_()` filter

**7. Fix N+1 in `get_my_bookings()`**
- File: `backend/app/routes/bookings.py`
- Student path: bulk-load instructors + instructor users + reviews (3 queries instead of 3N)
- Instructor path: bulk-load students + student users (2 queries instead of 2N)
- Also removed all `🔍 DEBUG` print statements in the instructor path

**8. Compound indexes on bookings**
- Added `ix_bookings_lesson_date_status` on `(lesson_date, status)`
- Added `ix_bookings_instructor_status` on `(instructor_id, status)`
- Merged into existing booking indexes block in `_apply_incremental_migrations()`

### Quality (Items 9–10)

**9. Remove debug print statements**
- Removed `print(f"🔍 EARNINGS ENDPOINT CALLED...")` from `routes/instructors.py`
- Removed `print(f"✅ RETURNING EARNINGS DATA: {response_data}")` from `routes/instructors.py`
- Removed 4× `print(f"🔍 DEBUG - ...")` from `routes/bookings.py` instructor path

**10. TypeScript `strict: true`**
- Changed `"strict": false` → `"strict": true` in `frontend/tsconfig.json`
- `skipLibCheck: true` already set (protects against third-party type errors)
- Note: `expo export` uses Babel (not tsc) so build won't break; IDE will surface type errors

### Tests (Items 11–12)

**11. Booking lifecycle tests** — `backend/tests/test_booking_lifecycle.py`
- `TestAutoUpdatePastBookings`: verifies past PENDING bookings auto-complete, future bookings untouched, no commit when nothing changes
- `TestConfirmBookingRules`: validates PENDING+PAID is the only confirmable state; CONFIRMED/CANCELLED/unpaid all reject
- `TestAccountLockout`: verifies locked account raises 429, failed login increments counter, successful login resets counter

**12. Instructor verification workflow tests** — `backend/tests/test_instructor_verification.py`
- Verifies `pending_admin`, `pending_company`, `rejected` → 403
- Verifies `verified`, `None` (legacy) → allowed
- Verifies no-instructor-profile → skip check
- Verifies student/admin roles → DB not queried at all

### Web (Items 13–15)

**13. Sentry error monitoring**

Backend:
- Added `sentry-sdk[fastapi]>=2.0.0` to `requirements.txt`
- Added `SENTRY_DSN: str = ""` and `SENTRY_TRACES_SAMPLE_RATE: float = 0.05` to `config.py`
- POPIA-compliant `before_send` hook in `main.py` scrubs: SA ID numbers (`\b\d{13}\b`), email addresses, SA phone numbers (`\b(?:\+27|0)\d{9}\b`)
- Initialized with `FastApiIntegration()` + `SqlalchemyIntegration()`, `send_default_pii=False`
- Only activates when `SENTRY_DSN` is set (zero-cost when empty)

Frontend (scaffold in `App.tsx` — uncomment to activate):
```bash
npm install @sentry/react
# Set EXPO_PUBLIC_SENTRY_DSN in frontend/.env
```
- Same PII scrubbing pattern applied to exceptions and breadcrumbs

**14. PWA support**

`frontend/app.json` web section expanded:
```json
"web": {
  "name": "RoadReady",
  "shortName": "RoadReady",
  "description": "Book driving lessons with verified instructors across South Africa.",
  "themeColor": "#0D9488",
  "backgroundColor": "#0D9488",
  "lang": "en-ZA",
  "startUrl": "/",
  "display": "standalone",
  "orientation": "portrait"
}
```

`frontend/public/service-worker.js` created:
- Pre-caches `/` and `/index.html` on install
- Network-first strategy with cache fallback
- Skips API/auth routes
- Returns cached `index.html` as offline fallback for navigation requests

Service worker registered in `App.tsx`:
```typescript
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}
```

**15. Public instructor profile pages with SEO**

`frontend/screens/instructor/PublicInstructorProfileScreen.tsx`:
- Fetches instructor by ID from `GET /instructors/{id}` (no auth required)
- Sets DOM meta tags via `setWebMeta()` utility (Platform.OS === 'web' guarded):
  - `<title>` — `{name} — Driving Instructor in {city} | RoadReady`
  - `<meta name="description">` — bio or auto-generated fallback (max 160 chars)
  - `<meta property="og:title">`, `og:description`, `og:type`, `og:url`
  - `<meta name="twitter:card">`, `twitter:title`, `twitter:description`
- Deep-linked at `/instructors/:instructorId`
- Added to `App.tsx` stack navigator and deep linking config

---

## Files Changed

### Backend
| File | Change |
|------|--------|
| `app/models/user.py` | Added `failed_login_attempts`, `account_locked_until` columns |
| `app/config.py` | Added `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE`, `ALLOW_MOCK_PAYMENTS`, `validate_production_secrets()` |
| `app/main.py` | Sentry init, HTTPS redirect, lockout + compound index migrations, removed `drop_all()` |
| `app/services/auth.py` | Account lockout in `authenticate_user()`, unified error messages |
| `app/routes/auth.py` | Cookie `max_age` fix, setup_token clear on login, `/check-unique` rate limit |
| `app/routes/setup.py` | Rate limit on `create_initial_admin` |
| `app/routes/instructors.py` | N+1 fix in earnings, removed debug prints |
| `app/routes/bookings.py` | N+1 fix in my-bookings (both paths), removed debug prints, `active_role` bug fix |
| `app/routes/payments.py` | Instructor verification check, duration validation, mock mode guard |
| `app/models/password_reset.py` | `secrets.token_urlsafe(32)` instead of `uuid4()` |
| `app/database.py` | PostgreSQL SSL, connection pooling |
| `requirements.txt` | Added `sentry-sdk[fastapi]>=2.0.0` |
| `Dockerfile` | Created (multi-stage, non-root user) |
| `docker-compose.yml` | Removed `--reload`, dead Celery service; added Redis password |

### Frontend
| File | Change |
|------|--------|
| `tsconfig.json` | `"strict": true` |
| `app.json` | PWA manifest fields in `web` section |
| `App.tsx` | Service worker registration, Sentry scaffold, `PublicInstructorProfile` screen + deep link |
| `public/service-worker.js` | Created — offline cache strategy |
| `screens/instructor/PublicInstructorProfileScreen.tsx` | Created — SEO-enabled public profile |

### Tests
| File | Content |
|------|---------|
| `tests/test_booking_lifecycle.py` | Auto-complete, confirm guards, account lockout |
| `tests/test_instructor_verification.py` | All verification status states |

---

## Pending Actions for the User

1. **Rotate leaked credentials immediately:**
   - GitHub PAT: `<REDACTED>`
   - Twilio Account SID: `<REDACTED>`
   - Twilio Auth Token: `<REDACTED>`

2. **Enable frontend Sentry:**
   ```bash
   cd frontend && npm install @sentry/react
   # Add to frontend/.env:
   EXPO_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
   # Then uncomment the Sentry block in App.tsx
   ```

3. **Set `SENTRY_DSN` in backend `.env`:**
   ```
   SENTRY_DSN=https://your-dsn@sentry.io/project-id
   ```

4. **Restart backend to run new migrations:**
   ```bash
   s.bat stop && s.bat start
   ```

5. **Fix TypeScript strict errors** (IDE will now show them):
   ```bash
   cd frontend && npx tsc --noEmit
   ```

---

## Key Architecture Decisions Made

| Decision | Rationale |
|----------|-----------|
| `setup_token` cleared on login, not on first API call | Token covers a multi-step setup flow; clearing on first login (post-verification) is the correct lifecycle boundary |
| Sentry `@sentry/react` not added to `package-lock.json` | `npm ci` checks the lock file; adding to `package.json` without running `npm install` would break CI |
| TypeScript strict enabled despite potential IDE errors | Expo uses Babel for compilation; strict mode only affects IDE tooling, won't break CI build |
| N+1 fixed with bulk `.in_()` queries, not `joinedload` | Bookings loop builds dicts from mixed models; `joinedload` would require ORM relationship traversal which is messier with the existing dict-construction pattern |
| POPIA scrubbing: SA ID = `\b\d{13}\b` | South African ID numbers are exactly 13 digits; the word boundary prevents false matches |
