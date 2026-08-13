# Drive Alive — Full System Test Run

**Started:** 2026-08-12
**Branch:** `feat/company-revenue-model` @ `f9d7ae0`
**App version:** 8.1.0
**Tester:** Claude Code (automated, driving Chrome)

This file is **checkpointed after every screen** so the run is resumable. If the
session ends mid-run, pick up at the first row still marked `PENDING`.

---

## Phase 0 — Baseline (before any change)

Recorded so that every later regression is attributable.

### Credential backup

All environment files copied to `backups/env-backup-20260812-194355/`:
`backend/.env`, `frontend/.env`, root `.env`, `backup_config.json`, `version.json`.

### Quality gates — all green

| Gate | Result | Detail |
|---|---|---|
| `i18n:check-completeness` | PASS (exit 0) | en, af key parity holds |
| `i18n:detect-hardcoded` | PASS (exit 0) | 1300 findings suppressed by the allowlist baseline |
| `check_error_code_mapping.py` | PASS (exit 0) | 18 backend error codes, all mapped |

### Typecheck baseline

**89 errors — every one of them inside `__tests__`. Zero errors in application code.**

| File | Errors |
|---|---|
| `services/__tests__/database-interface.test.ts` | 46 |
| `screens/__tests__/DatabaseInterfaceScreen.test.tsx` | 21 |
| `utils/__tests__/bookingFees.test.ts` | 9 |
| `__tests__/MainTabs.test.tsx` | 7 |
| `__tests__/database-interface-simple.test.ts` | 6 |

All are the same root cause: Cypress's bundled Chai types shadow Jest's global
`expect`, so `.toBe` is not visible on `Assertion`.

**This 89 is the number to hold.** It must not rise.

> **Documentation discrepancy found.** `CLAUDE.md` states "~203 pre-existing
> errors" and `AGENTS.md` states "~297". The real current figure is 89. The gap
> is explained by an **uncommitted fix** in `frontend/tsconfig.json` that adds
> `"cypress"` to `exclude`, which removed the Chai/Jest global collision across
> the main program. Both docs are stale and should be corrected to 89 once that
> tsconfig change is committed.

### Security check — no leak

Verified `git ls-files` for all three `.env` files: **none are tracked**. They
are covered by `.gitignore:50` (`.env`). Live Twilio, SMTP and Google Maps
credentials exist in the working tree only, which is expected. No action needed.

### Repo hygiene — cosmetic only

Stray zero-byte files from earlier shell-escape accidents, safe to delete:

- Repo root: `,`  `{,`  `{s}`  `NOT`  `PUT`  `safe`  `last`  `tuple[str`
- `backend/`: `'`  `plain`
- `frontend/`: ~15 similar (`{]{2`, `HTTP`, `lockout`, ...)

Not touched — flagged for your call.

---

## Phase 1 — Clean reinstall — COMPLETE

Pre-wipe database contents (dumped to
`backups/env-backup-20260812-194355/pre-wipe-db-dump.json`): **1 user**
(`mvdeventer123@gmail.com`, ADMIN) and **1 company** (`RoadReady`, platform
host). Zero instructors, students or bookings. Nothing of value lost.

| Step | Status | Notes |
|---|---|---|
| `s.bat stop` | PASS | backend PID 5668, frontend PID 11712 stopped |
| `s.bat uninstall --yes` | PASS | removed `venv`, `node_modules`, `dist/`, `.installed`. `.env` and database **kept**, as documented |
| `s.bat install` | PASS | venv + npm rebuilt; DB already provisioned; git hooks re-enabled |
| Wipe database | PASS (workaround) | `clear_database.py` is broken — see **D-1**. Wiped via ORM metadata with all model modules imported |
| `s.bat env loc` | PASS (workaround) | crashed first time — see **D-3** |
| `s.bat start --debug` | PASS (workaround) | backend PID 28116, frontend PID 26116 |
| `GET /health` | PASS | `{"status":"healthy"}` |
| `GET /setup/status` | PASS | `{"initialized":false,"requires_setup":true}` — Setup screen will render |
| Ports 8000 + 8081 listening | PASS | confirmed via netstat |

---

## Phase 3 — First admin via the Setup screen — COMPLETE

Driven live in Chrome. Recording: `01-first-admin-setup-and-login.gif` (24
frames, in Downloads).

| Step | Result |
|---|---|
| App routes to `/Setup` on an empty DB | PASS |
| Wizard accepts all fields | PASS — debug mode pre-filled phone, SMTP password and full Twilio block from `.env` |
| Password policy meter | PASS — all 5 rules green for `Koolkop1@`. Strength label reads "Weak / predictable word-and-number pattern", which is advisory only; the hard gate is the rule list, as designed |
| Confirm modal shows a correct review | PASS |
| `POST /setup/create-initial-admin` | PASS — user id 1, ADMIN, ACTIVE |
| Platform host company auto-created | PASS — `RoadReady`, `is_platform_host=true`, commission 8%, `company_admins` row linking user 1 |
| Redirect to Login | PASS |
| Login + **role picker** | PASS — offered "Admin Profile" and "Driving School Profile", because the admin is also primary company-admin of the host company. Correct multi-role behaviour |
| Lands on `/Main/DashboardTab/AdminDashboard` | PASS — confirms nested route paths, not flat slugs |

**Observation (not a defect):** debug pre-fill populates the Gmail *app
password* but leaves the Gmail *address* blank on both the Setup and
Register Company screens. Mildly inconsistent; harmless.

---

## Phase 4 — Seed data — COMPLETE

Built `backend/seed_demo_data.py`. **Deviation from plan, deliberate:** rather
than modify `seed_scale_data.py` (whose job is account-only scale testing), the
demo seeder is a separate script that *imports* that file's SA name, vehicle and
province pools and reuses `create_company`, `ensure_solo_company`,
`get_password_hash`, the whole of `app/services/fees.py`, and
`billing_service.record_platform_charge` / `accrue_subscription`. Prices are
therefore computed by the same code the app uses, so seeded figures cannot
drift from application behaviour.

**Identity scheme:** one mailbox via plus-addressing
(`mvdeventer123+inst007@gmail.com`), **one shared phone** `+27611154598` for
every account (legal — `users.phone` is not unique), unique 13-digit ID and
licence numbers per person. Password for every seeded account: `Koolkop1@`.

### Seeded totals

| Entity | Count |
|---|---|
| Users | 251 (1 admin + 250) |
| Companies | 23 — 1 platform host + **10 schools** + 12 auto solo companies |
| Instructors | **50** — 42 verified, 5 `pending_admin`, 3 `pending_company` |
| Students | **200** (≈30% school-enrolled, so commission-exempt) |
| Bookings | **1573** across **14 distinct months** |
| Transactions | 1350 · Reviews 643 · Credits 138 |
| Platform commission charges | 1324 · Subscription charges 10 |

Booking mix: 1143 completed · 207 cancelled · 141 no-show · 64 confirmed ·
16 pending · 2 in-progress. Source mix: 1526 platform / 47 school.

### Money baseline — the numbers the UI must match

| Figure | Value |
|---|---|
| Gross paid | **R 489 409.05** |
| Completed-lesson revenue | **R 414 758.30** |
| Platform commission accrued | **R 38 425.59** |
| Subscriptions accrued | **R 6 212.00** |

### Invariants — all pass

| Invariant | Result |
|---|---|
| Cancelled bookings holding a platform charge | **0** (correct — cancellations must not bill) |
| Bookings where `amount != base + markup` | **0** |
| School-sourced bookings billed commission | **0** |

## Phase 5 — Screen-by-screen results

Legend: PASS · PASS* (passes after a fix made during this run) · FAIL · PENDING

### Admin

| Screen | Status | Notes |
|---|---|---|
| AdminDashboard | **PASS** | Every figure matches SQL exactly — see table below |
| AdvancedAnalytics | **PASS\*** | Charts rendered empty; fixed (**D-5**). All breakdown figures verified against SQL |
| RevenueAnalytics | **PASS** | All 7 headline figures + top-7 instructor table match SQL exactly; instructor filter and search verified. See below |
| InstructorVerification | **PASS\*** | Badge 8 correct. Two defects found and fixed: **D-10** (solo instructors wrongly routed to `pending_company`) and **D-11** (filter chips had no a11y semantics) |
| UserManagement | **PASS** | Deep-links at `/admin/users`; seeded users render correctly with plus-addressed emails + shared phone; original admin correctly marked "ORIGINAL ADMIN - PROTECTED". See observation below |
| CreateUser / CreateAdmin | PENDING | |
| EditAdminProfile | PENDING | |
| BookingOversight | **PASS\*** | Badge 16 correct. Two defects found and fixed: **D-12** (tab counts printed twice) and **D-13** (counts wrong and 97% of bookings unreachable) |
| AdminManageInstructorSchedule | PENDING | |
| InstructorEarningsOverview | PENDING | |
| AdminSettings | **PASS** | Twilio test WhatsApp sent successfully to the live number. Language switch, password reveals and validation all correct |
| DatabaseInterface | PENDING | |

### Instructor / Student / Company admin / Booking / Auth

All PENDING — the run is resumable; pick up at the first PENDING row.

### Observation — the user list shows more cards than there are users

Not a defect. On the *All Users* tab `/admin/users` deliberately returns **one
entry per role a person holds** (`app/routes/admin.py:605-680`). The 12
independent instructors who were given auto solo companies therefore appear
twice — once as INSTRUCTOR, once as COMPANY_ADMIN — as does the admin.

So the list renders **264 cards for 251 users** (1 admin + 50 instructor +
13 company-admin + 200 student entries) while the dashboard reports 251.
Both are correct for what they measure, but an operator counting rows will
not get the dashboard's number. Worth a caption if it ever confuses anyone.

Verified in the database: all 50 instructors have `users.role = INSTRUCTOR`
and **no user row has role COMPANY_ADMIN** — the badge reflects a
`company_admins` row, not the base role.

### Analytics correctness — UI vs direct SQL

Every one of these was read off the rendered screen and compared to a direct
query. **No discrepancies.**

| Figure | UI | SQL | |
|---|---|---|---|
| Total users | 251 | 251 | match |
| Active users | 251 | 251 | match |
| Instructors | 50 | 50 | match |
| Students | 200 | 200 | match |
| Verified instructors | 42 | 42 | match |
| Pending instructors | 8 | 5 + 3 | match |
| Total bookings | 1573 | 1573 | match |
| Completed | 1143 | 1143 | match |
| Cancelled | 207 | 207 | match |
| No-show | 141 | 141 | match |
| Confirmed | 64 | 64 | match |
| Pending | 16 | 16 | match |
| In progress | 2 | 2 | match |
| Total revenue | R414 758 | R414 758.30 | match |
| Avg booking | R363 | R362.87 | match (rounded) |
| Cancellation rate | 13.2% | 207/1573 = 13.16% | match |
| Avg lessons/student | 5.71 | 1143/200 = 5.715 | match |
| Role mix | 1 / 200 / 50 | 1 / 200 / 50 | match |

The analytics aggregates are **correct**, not merely non-zero.

## Defects found

### D-1 · `backend/clear_database.py` silently does nothing — HIGH — **FIXED**

`clear_database.py` imports only `Base` and `engine`, never the models. So
`Base.metadata` is **empty** and `drop_all()` / `create_all()` iterate over zero
tables. It prints "All tables dropped successfully!" and drops nothing.

It then crashes anyway on `print("✅ …")` under a cp1252 stdout.

**Repro:** `venv/Scripts/python.exe clear_database.py` on a populated DB, then
count rows — they are all still there.

**Fixed:** now imports `app.models`, refuses to run if metadata is empty rather
than reporting a false success, and prints ASCII. Verified it sees all 20 tables.

---

### D-2 · `app/models/__init__.py` was missing three models — HIGH — **FIXED**

CLAUDE.md calls `app/models/__init__.py` "the canonical import point", but it
did not import the models added by the newest company-revenue feature
(`3bb3754`):

- `CompanyAdmin` (`company_admins`)
- `CompanyPlatformCharge`, `CompanySubscriptionCharge` (+ `ChargeStatus`)
- `CompanyInstructorInvite` (+ `InviteDirection`, `InviteStatus`)

So `Base.metadata` exposed **16 of 20 tables**. Anything reasoning about the
metadata — including the `create_all()` at import time in `app/main.py:57` —
saw an incomplete schema. It currently survives only because `lifespan` calls
`create_all()` a *second* time (`main.py:427`), by which point the routers have
imported those models as a side effect. That is accidental, not designed: on a
truly fresh database the four company tables are created by the second call
only.

**Fixed** in this run — `__init__.py` now imports and re-exports all three
modules, and metadata reports all 20 tables.

---

### D-3 · `scripts/da.py` crashes whenever its output is piped — MEDIUM — **FIXED**

Every `s.bat` subcommand dies with `UnicodeEncodeError` if stdout is not a
console, because the banners contain `→`, `⚠` and `…` and Python falls back to
cp1252.

**Repro:** `python scripts/da.py env loc | tail -5` → traceback, and the
environment is **not** switched (it crashes in `header()` before doing any
work). Same for `start`, `install`, `uninstall`.

**Impact:** any CI step, log capture, or scripted invocation of `s.bat` breaks.
It only appears to work because it is normally run in an interactive terminal.

**Workaround used here:** `PYTHONIOENCODING=utf-8`.

**Fixed:** `da.py` now reconfigures stdout/stderr to UTF-8 with
`errors="replace"` at import. Verified `python scripts/da.py status | tail`
exits 0 and renders correctly.

---

### D-5 · Advanced Analytics charts rendered completely empty — HIGH — **FIXED**

Both "Daily Bookings" and "Daily Revenue" showed axis labels and a correct
`Max:` caption but **no bars at all**. The data pipeline was fine; the layout
collapsed.

**Evidence** (measured live in the DOM):

| Element | Value |
|---|---|
| Bar row height | 120px (correct) |
| Per-bar wrapper computed height | **0px** |
| Bar inline height | `22.2222%` (correct, derived from data) |
| Bar computed height | **0px** |
| Bar width / colour | 44px / `rgb(15,118,110)` — correct |

**Cause** — `frontend/screens/admin/AdvancedAnalyticsScreen.tsx`, `BarChart`:
the row sets `alignItems: 'flex-end'`, which does **not** stretch children on
the cross axis. The per-bar wrapper had only `flex: 1` and so collapsed to zero
height. The bar's percentage height then resolved against a zero-height parent
and computed to `0px`. A percentage height requires a definite parent height.

**Fix applied:** give the wrapper `height: '100%'` and
`justifyContent: 'flex-end'`. Both charts render correctly; verified live.

---

### D-6 · Admin sub-screens are not deep-linkable — MEDIUM — **FIXED**

Navigating directly to `http://localhost:8081/Main/DashboardTab/AdvancedAnalytics`
silently redirects to `/Main/DashboardTab/AdminDashboard`. Only in-app button
navigation reaches the screen.

**Impact on a web app:** a browser refresh, a bookmark, or a shared link to any
admin sub-screen dumps the user back at the dashboard and loses their place.

**Cause:** the `linking.config` in `App.tsx` enumerated only the auth/payment
deep-link routes; the nested `Main → *Tab → *` screens were not declared, so the
URL parsed to the stack's initial route.

**Fixed:** declared the full nested structure for all four role navigators, with
readable paths — `/admin/analytics`, `/admin/users`, `/admin/database`,
`/instructor/earnings`, `/student/instructors`, `/school/statement`, etc.
Verified live: `http://localhost:8081/admin/analytics` now loads the screen
directly and survives a refresh.

---

### D-7 · "Growth (Last 30 Days)" contradicts the 30-day chart on the same screen — LOW — **FIXED**

Advanced Analytics shows "Bookings 98" for the 30-day window and, lower down,
"New Bookings 1573" under *Growth (Last 30 Days)*. Both are on screen at once
and appear to disagree.

They measure different things — the chart counts by `lesson_date`, growth counts
by `created_at` — which is defensible, but nothing on the screen says so. Either
label them ("lessons scheduled" vs "bookings created") or make them consistent.

Surfaced by seeding, where every row shares a `created_at`, but the ambiguity is
real in production too.

**Fixed:** relabelled to make the basis explicit — the KPI is now "Lessons
Scheduled" (by lesson date) and the growth rows are "New Users Registered" and
"Bookings Created" (by creation date).

**Outstanding debt:** this whole screen is on the `i18n` hardcoded-string
allowlist, so these labels are untranslated English. Removing the file from the
allowlist would need proper `en`/`af` keys.

---

### D-8 · `s.bat uninstall` deletes a git-tracked file — LOW — **FIXED**

`cmd_uninstall` removes `dist/`, but `dist/install-manifest.json` is **tracked
in git**. Running uninstall therefore leaves a spurious deletion in the working
tree that a later `git commit -a` would silently commit.

Restored with `git checkout -- dist/install-manifest.json` during this run.

`dist/` is in `.gitignore` (twice), but `install-manifest.json` was force-added
at some point, so gitignore does not protect it.

**Fixed:** `cmd_uninstall` now queries `git ls-files` before deleting and skips
any path containing tracked files, warning instead of destroying them.

---

### D-4 · Typecheck baseline documented as 203 / 297, actually 89 — LOW — **FIXED**

`CLAUDE.md` says "~203 pre-existing errors", `AGENTS.md` says "~297". Real
count is **89**, all in `__tests__`, zero in app code. The uncommitted
`frontend/tsconfig.json` change (excluding `cypress`) is what closed the gap.
**Fixed:** corrected in both files to "89 pre-existing errors, all in
`__tests__`". While there, also corrected three further stale claims: AGENTS.md
and README.md both advertised Alembic (there is none), and CLAUDE.md said
"Three roles" and omitted `CompanyAdminTabs` from the role dispatcher.


---

## Session 2 — resumed 2026-08-13

### Environment change

This session runs inside **WSL Ubuntu** while the app runs on **Windows**, which
broke two assumptions from session 1:

* `localhost` inside WSL does not reach the Windows servers (WSL2 NAT). Worked
  around with a small Node TCP proxy binding WSL `127.0.0.1:8000` and `:8081` to
  the Windows host IP, so the app's hardcoded `localhost` URLs resolve.
* The Claude-in-Chrome MCP server is gone, and WSL had no browser. Chromium was
  installed into the user cache and its missing shared libraries extracted into
  `~/.local/pw-deps` (no root available). Playwright is now driven from scripts
  rather than MCP, because chromium here needs `LD_LIBRARY_PATH`, which only a
  spawned child process can be given.

Neither is an application defect; both are environment plumbing.

### RevenueAnalytics — PASS

Every rendered figure verified against direct SQL:

| Figure | UI | SQL | Match |
|---|---|---|---|
| Commission (2026-08) | R2906.39 | 2906.39 | yes |
| Subscriptions (2026-08) | R6212.00 | 6212.00 | yes |
| Total kept | R9118.39 | 9118.39 | yes |
| Lesson volume (gross) | R414758.30 | 414758.30 | yes |
| Pending volume | R6077.80 | 6077.80 | yes |
| Completed bookings | 1143 | 1143 | yes |
| Average booking value | R362.87 | 362.87 | yes |
| Top 7 instructors | see below | identical | yes |

The top-earner table matches per **instructor id**, not per name — the seeded
data reuses names across instructors, so a name-grouped query disagrees. The
screen is right; a naive check would have been wrong.

Controls exercised: instructor filter (`select`), search box. Filtering to
instructor 25 gave R13806.00 / 36 lessons / R383.50 avg — matches SQL exactly.
No console errors, no failed requests.

**Observation (not a defect).** The *Platform Earnings* panel stays platform-wide
when an instructor filter is applied, because commission and subscriptions are
billed per company, not per instructor. Correct, but sitting directly above the
filtered volume figures it reads as though it were filtered too.

### InstructorVerification — PASS\* (two defects fixed)

Controls exercised: all five status filters, Approve, Reject, the confirmation
modal's Cancel path and its confirm path, and list scrolling.

**Checked and found NOT to be defects:**

* Only 7 of 50 cards are in the DOM at once. This is `VirtualList`/FlashList
  windowing working correctly — scrolling reveals all 50 distinct licences.
* The list looked stale after approving. It is not: `executeAction` calls
  `loadInstructors()`, and the approved card disappears between t+1.5s and
  t+7.5s. The first check simply read the DOM too early, and the success banner
  keeps the approved name on screen for 5s.

#### D-10 — solo instructors were parked awaiting approval from themselves — FIXED

`verify_instructor` decided who still needs school-owner approval with:

```python
is_company_member = (
    getattr(instructor, "company_id", None) is not None
    and not getattr(instructor, "is_company_owner", False)
)
```

Every independent instructor gets a one-person company from
`ensure_solo_company`, which **deliberately** leaves `is_company_owner` False
(`company_service.py:130-132`: *"a solo has nobody to approve them"*). So all 12
solo instructors satisfied both halves of that test, were read as school members,
and on admin approval went to `pending_company` instead of `verified` — waiting
on a company owner who is the instructor themselves. `user.status` was never set
to `ACTIVE` either.

Confirmed live: instructor 11 (solo) went `pending_admin → pending_company`.

The identical expression appeared a second time in
`verification.py:647`, the email-token approval path, so admin approval by link
had the same fault.

**Fix.** One shared helper, `needs_company_approval(db, instructor)` in
`company_service.py` — the module that owns the solo concept — which also
excludes solo companies. Both call sites now use it.

**Verified after fix:** solo instructor 12 approved through the UI went
`pending_admin → verified` with `is_verified=true` and user status `ACTIVE`.

#### D-11 — status filter chips were invisible to assistive tech — FIXED

The five chips rendered as `<div tabindex="0">` with no role, no accessible name
and no selected state: reachable by keyboard, but a screen reader announces
nothing actionable and cannot say which filter is active.

Added `accessibilityRole="tab"`, `accessibilityLabel` and the selected state.
`accessibilityState={{ selected }}` alone was **not** enough — react-native-web
0.21 no longer maps it to `aria-selected`, which is why
`components/ui/TabBar.tsx:83-84` already passes both. Followed that existing
pattern.

The same latent gap existed in `CompanyPricingScreen.tsx:250` and
`CompanyRosterScreen.tsx:354`; both were fixed at the same time and will be
confirmed in the browser when those screens are tested.

**Verified after fix:** all five chips expose `role="tab"`, a name, and
`aria-selected`, with `Pending Admin` correctly `true`.

### Test data mutated by this session

Instructors 12 and 13 were approved through the UI and are now `verified`
(they were seeded `pending_admin`). Instructor 11 was approved, reset, and left
`pending_admin`. Pending-admin count is therefore 3, not the seeded 5.

### BookingOversight — PASS\* (two defects fixed)

#### D-12 — every tab count was printed twice — FIXED

The tabs read `All (50) (50)`, `Pending (9) (9)`. The i18n string already
interpolates the count (`all: 'All ({{count}})'`) and the JSX appended
`{label} ({count})` on top. Removed the duplicate; the count stays inside the
translatable string where a translator can move it.

#### D-13 — the counts were wrong and most bookings were unreachable — FIXED

The screen called `getAllBookingsAdmin('')` under a comment reading
*"Load all bookings"*. It does not: the parameter defaults to `limit = 50`, and
`/admin/bookings` caps `limit` at 100 server-side. So the screen held 50 of 1573
bookings and then computed the tab counts **client-side over those 50**.

An admin therefore saw, against a database of 1573 bookings:

| Tab | Showed | Truth |
|---|---|---|
| All | 50 | 1573 |
| Pending | 9 | 16 |
| Completed | **0** | **1143** |
| Cancelled | **0** | **207** |

`Completed (0)` and `Cancelled (0)` were shown on a platform with 1143 completed
and 207 cancelled lessons. Selecting those tabs also filtered client-side, so
they were genuinely empty — the remaining 1523 bookings could not be reached
from this screen at all.

The backend already computed correct counts twice over: `/admin/stats` (which
the dashboard uses, and which the frontend already wraps as `getAdminStats()`),
and a `status_counts` dict at `admin.py:1119-1123` that is assembled and then
never used.

**Fix**, reusing what exists rather than adding an endpoint:

* tab counts now come from `/admin/stats`, so they describe every booking;
* selecting a tab refetches with `status_filter` server-side, so it can find
  bookings outside the loaded page;
* page size raised to the server's maximum of 100, with a **Load More** control
  appending the next page — the whole table is now reachable;
* the tabs also got `role="tab"`, a name and `aria-selected` (same gap as D-11).

**Verified after fix:** tabs read `All (1573) · Pending (16) · Completed (1143) ·
Cancelled (207)`, matching SQL exactly. Selecting *Pending* returns exactly 16.
The first page loads exactly 100, *Load More* appears, and clicking it appends
the next page. No console errors, no failed requests.

#### D-14 — search only looked at the loaded page — FIXED

Originally recorded as a known limitation, then fixed: `/admin/bookings` had no
search parameter, so the screen filtered client-side over whatever page it held.
With the list paged at 100 of 1573, searching missed most of the table and
returned confident, wrong "no results".

**Fix.** Added a `search` parameter to `/admin/bookings` that matches
server-side across the whole table — booking reference, booking id, student and
instructor name, both id numbers, student and instructor id, and the four date
formats the old client-side search accepted (`YYYY-MM-DD`, `M/D/YYYY`,
`YYYY/MM/DD`, `Month D, YYYY`) via Postgres `to_char`. Names live on `User` and
id numbers on the role profiles, so the search joins all four tables.

The screen now sends the term to the server, debounced at 350ms so typing is not
one request per keystroke, and the dead client-side filter was removed.

**Verified after fix:** `DEMO0001114` returns exactly that one booking;
`2026-08-21` returns the three lessons on that date; `Ayesha` returns her
bookings; clearing the box restores the full list. Direct API probes confirm
case-insensitivity (`demo0001114`), bare-id search (`1114`) and prefix search
(`DEMO000111` → 10). No console errors, no failed requests.

**Observation (not fixed, not a defect):** the row-building loop at
`admin.py:1125-1140` issues four queries per booking, so a 100-row page costs
~400 queries. It was not touched here because changing it is a performance
refactor with its own risk, not part of this defect.

### AdminSettings — PASS

Every section rendered: Language, Email Configuration, Verification Link
Validity, Auto-Logout Timeout, Platform Commission, Test Email, Backup
Configuration, WhatsApp Configuration.

#### Twilio test message — SENT SUCCESSFULLY

Explicitly authorised, so it was fired for real rather than skipped.

`POST /verify/test-whatsapp` returned **200**:

```json
{"success": true,
 "message": "✅ Test WhatsApp message sent successfully to +27611154598!",
 "phone": "+27611154598", "sender": "whatsapp:+14155238886",
 "stored_in_db": true, "retrieved_from_db": true}
```

Credentials were read from the database (`retrieved_from_db: true`) and
re-saved, confirming the `EncryptionService` round-trip works. Sender is the
Twilio sandbox number.

The on-screen success banner was not captured, because it clears after 4s and
the first read happened at t+12s. That is a measurement error, not a defect —
the banner mechanism was then proven working via the email validation path,
which appears at t+300ms.

#### Checked and found NOT to be defects

* **Clearing the phone number and clicking "Send Test WhatsApp" does nothing.**
  Correct: the button is `disabled` when either phone field is empty, so no
  request fires. The in-handler guard behind it is unreachable from the UI.

#### Observation — the two test buttons disagree on how to refuse

"Send Test WhatsApp" **disables** itself when its fields are empty; "Send Test
Email" stays enabled and shows an error banner when clicked. Both are defensible
alone, but sitting on one screen they teach two different rules. Not filed as a
defect.

#### Controls exercised

Language English/Afrikaans, both password reveal toggles (2 password inputs → 1
after revealing the first), all numeric fields, Test Email validation path, Test
WhatsApp. No console errors, no failed requests.

### Afrikaans pass — partial, PASS so far

Switching to Afrikaans translated the settings screen and the admin dashboard
completely — navigation (`Paneelbord`, `Gebruikers`, `Besprekings`,
`Instellings`), quick actions, and every statistics card
(`Gebruikerstatistieke`, `Instrukteurverifikasie`, `Besprekingstatistieke`,
`Inkomste-oorsig`). No English leaked into either screen and no layout broke.
The choice persisted across navigation and reverted cleanly to English.

This covers two screens; the full Phase 6 sweep across all screens is still
outstanding.

### UI change (user-requested) — label/value rows sat too far apart

On wide desktop widths every detail row used
`flexDirection: 'row'` + `justifyContent: 'space-between'`, which pins the label
to the left edge of the card and throws its value to the right edge. On a
1440px-wide card the eye has to track ~1400px to pair "ID No.:" with
`9000000500014`. Replaced with a left-packed row — a fixed minimum label width,
a small gap, and a shrinking value — so the value sits immediately after its
label and the values still line up in a column.

| Screen | Style | Change |
|---|---|---|
| `screens/admin/InstructorVerificationScreen.tsx` | `detailRow` / `detailLabel` / `detailValue` | `space-between` → `gap: 6`, label `minWidth: 56`, value `flexShrink: 1` |
| `screens/admin/BookingOversightScreen.tsx` | `detailRow` / `detailLabel` / `detailValue` | `space-between` → `gap: 8`, label `minWidth: 64`, value `flexShrink: 1` |
| `screens/instructor/EarningsReportScreen.tsx` | `detailRow` / `detailLabel` / `detailValue` / `detailValueHighlight` | dropped `flex: 1` + `textAlign: 'right'`, label `minWidth: 96`, value `flexShrink: 1` |

`minWidth` is a floor, not a fixed width, so a longer Afrikaans label pushes its
own value across rather than truncating — the column alignment degrades
gracefully instead of breaking.

**Deliberately left alone.** Two independent scans of every screen and component
found the remaining `space-between` rows are not label/value pairs and should
stay stretched:

* money statements where right-aligned amounts form a column —
  `CompanyPricingScreen.row`, `CompanyStatementScreen.totalRow`,
  `PaymentScreen.summaryRow/creditRow/totalRow`, `BookingScreen.priceRow`
* rows holding two independent facts, not a label and its value —
  `UserManagementScreen.userHeader/bookingHeader`,
  `EarningsReportScreen.earningHeader/monthHeader`,
  `InstructorEarningsOverviewScreen.earningHeader/cardStats`,
  `InstructorListScreen.infoRow`, `AdminDashboardScreen.backupItem`
* controls with a trailing icon — `ManageAvailabilityScreen` date/time pickers,
  `LocationSelector` list rows

Gates after the change: all three merge gates pass; typecheck still 89 errors,
all in `__tests__`, none in app code.

**Not browser-verified.** Screenshotting these screens needs an admin login, and
`POST /auth/login` returned 409 with the "Already Logged In" modal — the only way
through is Force Login, which would have ended the live admin session in your
own Chrome. The Expo dev server hot-reloads, so the open tab shows the new
layout already.

### Feature (user-requested) — search, status filter and card grid on the admin list screens

The Users screen already had a search box, a status dropdown and a multi-column
card grid. The other admin list screens did not. Brought them into line.

#### `InstructorVerificationScreen` — rewritten

| Added | Detail |
|---|---|
| Search | Name, email, phone, SA ID, licence number, instructor id and user id. `#14` and `14` both find id 14. Debounced 350 ms. |
| Status filter | The existing tab strip **is** the status filter, now labelled `Filter by Status:` and given an active-tab fill. No second dropdown was added — a status dropdown beside status tabs is two controls for one job, and they drift out of sync. |
| Card grid | 1 / 2 / 3 columns at `xs` / `md` / `lg` via `useBreakpoint`, matching `BookingOversightScreen`. |
| Card chrome | `Instructor ID: #n` + `User ID: #n` chip and an `SA ID:` line, like the Users card, so the number an admin is about to search for is visible on the card. `ID No.` left the detail block to avoid printing it twice. |
| i18n | Screen fully migrated to `t(...)`; **removed from `hardcoded-allowlist.json`** (59 → 58 paths, 1300 → 1272 suppressed findings). |

Search is **server-side**: `GET /admin/instructors` caps at `limit` (default
100, max 200), so filtering the loaded page in the screen would silently hide
every match past the cap — the same defect fixed earlier for booking search.
Added `search` to that endpoint (`backend/app/routes/admin.py`).

#### `InstructorEarningsOverviewScreen`

| Added | Detail |
|---|---|
| Search | Name, email, phone, instructor id, user id — client-side. |
| Status filter | `All / Verified / Unverified / Available / Unavailable` picker. |
| Card grid | Same 1 / 2 / 3 column breakpoints. |
| Card chrome | ID chip plus email and phone lines. |
| Header + export | The count, the revenue total and **Export All** now follow the active filter, so the workbook matches what is on screen. |

Filtering here is deliberately **client-side**: `/admin/instructors/earnings-summary`
is unpaged and returns every instructor, so there is no page beyond the loaded
rows for a server query to reach, and a local filter answers instantly.

Only the list chrome on this screen was migrated to `t(...)`; the detail modal
and the PDF/Excel export strings are still hardcoded, so the file stays on the
allowlist.

#### Verified in a browser at 1440×950

| Check | Result |
|---|---|
| Verification grid, no filter | 50 cards, 3 per row, 336 px each |
| Search `john` | 4 cards — John Johnson, Sarah Johnson, John Cele ×2 |
| Search `9000000500016` (SA ID) | 1 card, Sipho Patel, still 336 px wide |
| Search `DL000024` (licence) | 1 row |
| Search `#14` | 3 rows — instructor 14, user 14, and `+inst014@` by email |
| Search `zzz-no-such` | `No instructors match "zzz-no-such".` |
| Earnings, no filter | 50 cards, `50 instructor(s) • Total Revenue: R415262.30` |
| Earnings search `nandi` | 4 cards, header recomputed to `R41486.00` |
| Earnings search `#25` | 2 cards — instructor 25 and instructor 24 (user id 25) |
| Earnings status `Unverified` | 3 cards, `R0.00` (unverified instructors have no completed lessons) |
| Console errors | none |

Every count was cross-checked against the same query run directly through
SQLAlchemy against PostgreSQL: `john` → 4, SA ID → 1, licence → 1, `#14` → 3.

#### Card width cap

`flexGrow: 1` with no `maxWidth` made a single search result stretch to the full
1038 px row. Capped at the per-breakpoint card width (`32%` at `lg`), so one
match renders the same size as a card in a full row.

#### Two environment findings, both cost time

* **uvicorn `--reload` does not see edits made from WSL to files on `/mnt/c`.**
  The backend had been running since 07:30 and never picked up the new `search`
  parameter; `/openapi.json` still listed the old signature while the file on
  disk was correct. Touching the file from Windows did not help either. A
  restart was required.
* **`s.bat start -b` stops both servers, then starts only the backend.** Same for
  `-f` in reverse. Restarting one server therefore takes the other down — a bare
  `s.bat start` is the only way back to both. Both servers were left running.

A temporary admin (`qa-temp-admin@example.invalid`) was created directly in the
database to drive these checks without force-ending the live admin session, and
**deleted afterwards**; `users` is back to a single admin, id 1.

Gates after the change: all three merge gates pass; typecheck still 89 errors,
all in `__tests__`, none in app code; eslint reports no new errors in either
screen.

#### D-15 — "Resend link" dragged an instructor back to Pending Admin — HIGH — FIXED

**Reported by Martin.** Approve an instructor on the Pending Admin tab — they
correctly move to Pending Company. Click **Resend link** on that card and they
reappear under Pending Admin, the approval silently undone.

**Cause.** `POST /admin/instructors/{id}/resend-verification` did the same three
things no matter where the instructor stood:

```python
instructor.admin_verification_token = new_token
instructor.verification_status = IVS.PENDING_ADMIN.value
instructor.is_verified = False
```

It only ever regenerated the **admin** link and mailed the admins. For someone at
`pending_company` the outstanding approval belongs to the school owner, so the
one link that mattered was never reissued and the approval that had just been
granted was thrown away.

The same code path was reachable from **Verified** cards, where the UI also
offered "📧 Resend link". Clicking it un-verified a working instructor and locked
them out of their own account — `RoleTransitionPolicy.assert_runtime_role_ready()`
refuses instructor login unless the status is `verified`.

**Fix.** The endpoint now branches on the current stage:

| Stage | Behaviour |
|---|---|
| `pending_company` | reissues `company_verification_token`, sends to the school owner, **leaves the status alone** |
| `pending_admin` / `rejected` / legacy null | reissues `admin_verification_token`, notifies admins, enters the admin queue — unchanged |
| `verified` | refused, `400 INSTRUCTOR_ALREADY_VERIFIED` |

If the owner cannot be reached the endpoint now returns
`400 COMPANY_OWNER_UNREACHABLE` instead of reporting a send that never happened.
The admin branch also stopped hardcoding `https://roadready.co.za` as the link
base and uses `settings.FRONTEND_URL`, so a link resent in dev is clickable in dev.

Frontend (`InstructorVerificationScreen`): the action now names its recipient —
`🏢 Resend to school owner` at `pending_company`, and Verified cards show
`Fully verified — nothing to resend.` with no button at all. The confirmation
modal and success banner name the school rather than saying "link resent".

#### D-16 — admin and school approval could never both complete — HIGH — FIXED

Found while fixing D-15. Two defects in one workflow:

1. **The school's approval was never recorded.** `verify_company_token()` moved
   the instructor to `pending_admin` and cleared the token, but wrote nothing to
   `verified_by_instructor_id` — a column that exists on `Instructor`, is created
   by the migration in `main.py`, and was read by nothing. So after the owner
   approved, `needs_company_approval()` still answered "yes, they are a school
   member awaiting their owner", and the admin approval that followed sent them
   **back to `pending_company`**. Owner approves → admin approves → pending
   company → owner approves → … The instructor can never reach `verified`.
2. **Admin approval into `pending_company` notified nobody.** `verify_instructor`
   set the status and stopped — no company token was minted and
   `send_company_verification` was never called. The school owner had no idea
   anyone was waiting on them. This is why reaching for "Resend link" was the
   natural thing to do, and D-15 punished it.

**Fix.** `verify_company_token` stamps `verified_by_instructor_id` with the
approving owner; `needs_company_approval()` treats that stamp as the school gate
being closed; and `verify_instructor` mints a company token when one is missing
and sends the owner their link, fire-and-forget so a failed notification cannot
roll back an approval that already happened.

`docs/ARCHITECTURE_MAP.md` §5 was corrected — it claimed
`PENDING_COMPANY --> VERIFIED: school owner approves`, which is not what the code
does. The two gates can be cleared in **either order**; the status names the gate
still open and the *stamps* record which are closed.

**Verified** by driving the real endpoint functions against PostgreSQL with all
notification sends stubbed, then restoring every touched column:

| Step | Result |
|---|---|
| pending_admin → admin approves | `pending_company`, company token minted, owner notified |
| resend at pending_company | still `pending_company`, token reissued, `sent_to: company_owner` |
| school approved → admin approves | `verified` — no longer loops |
| resend on verified | `400 INSTRUCTOR_ALREADY_VERIFIED`, status untouched |
| resend on rejected | `pending_admin`, `sent_to: admins` — unchanged |

In the browser, each tab now offers the right action: Pending Admin → Approve /
Reject, Pending Company → Resend to school owner, Verified → no button.

No live email or WhatsApp was sent during these checks — every send was stubbed,
because the seeded school owners' address and phone are Martin's own.

#### D-17 — "Done" on the school approval page did nothing — MEDIUM — FIXED

**Reported by Martin,** with the console output that names the cause:

```
The action 'REPLACE' with payload {"name":"Login"} was not handled by any navigator.
Do you have a screen named 'Login'?
```

**Cause.** `App.tsx` renders the signed-out group (`Login`, `Register*`, …) **or**
the signed-in group (`Main`, payment screens) — never both — while the
deep-linked screens sit in a third group that is always mounted. Martin opened
the school approval link in a tab where he was signed in as admin, so `Login` was
not in the tree and `goHome`'s `navigation.replace('Login')` resolved to nothing.
`canGoBack()` was false too (fresh tab from an email link), so the button was
simply dead.

**Fix.** New `frontend/utils/exitToLogin.ts`:

* `useExitToLogin(navigation)` — ends the session when one exists (`onLogout`
  clears tokens and, on web, reloads to `/`, which resolves to `Login`), and
  otherwise `reset`s to `Login`. Ending the session is the only thing that
  actually puts the login screen on screen, because the navigator swaps groups.
* `useSignedIn()` — `userRole || userName` from `AuthActionsContext`.
* `useExitToLoginRef(navigation)` — a stable handle for timers. `onLogout` is
  rebuilt on every render of `App`, so a countdown that depends on it directly
  restarts forever.

`InstructorCompanyVerifyScreen` now also **auto-returns after 5 seconds** with a
visible `Returning to sign in in Ns…` countdown, so the redirect is expected
rather than startling, and the screen was migrated to `t(...)` and **removed from
`hardcoded-allowlist.json`** (58 → 57 paths).

**The same defect was latent on three sibling screens**, all in the
always-mounted group, and all fixed with the same helper:

| Screen | Was |
|---|---|
| `VerifyAccountScreen` | `replace('Login')` on its 3-second redirect and on "resend" — dead for a signed-in visitor |
| `InstructorInviteScreen` | `navigate('Login')` on its sign-in button — same |
| `InstructorVerifyScreen` | the mirror image: `replace('Main')` for a visitor who is **not** signed in, which is the normal case for a link opened from email |

**Verified in a browser**, with the approve POST stubbed at the network layer so
nothing was written and no admin was emailed:

| Scenario | Result |
|---|---|
| Signed in, press **Done** | lands on `/Login` |
| Signed in, wait out the countdown | lands on `/Login` |
| Signed out, press **Done** | lands on `/Login` |
| Countdown | renders and ticks 5 → 4 → 2 |
| `was not handled by any navigator` warnings | **none** |

---

## D-18 … D-22 — verification workflow, second pass (post-v10.0.0 cloud review)

A multi-agent cloud review of the v10.0.0 diff found five further defects, four
of them in the same verification workflow. All five were confirmed by reading
the code, then fixed and re-verified against PostgreSQL. **v10.0.0 ships
without these fixes** — they land on top of the tag.

| # | Severity | Defect |
|---|---|---|
| D-18 | normal | Admin approval into `pending_company` sent the instructor a **rejection** notification |
| D-19 | normal | School owner's approval reopened the admin gate even when the admin had already closed it |
| D-20 | normal | A freshly-minted company token inherited the **registration** expiry, so it could be born expired |
| D-21 | normal | Invite-accepted instructors were bounced back to the school that invited them |
| D-22 | nit | A search debounce surviving a tab switch could show one tab's rows under another's header |

### D-18 — approval that reads as a rejection

`verify_instructor` computed `approved = is_verified and status == VERIFIED`.
The branch above had just set `PENDING_COMPANY`, so this collapsed to `False`
and routed to `send_rejection_notification` — *"Unfortunately, we were unable to
approve your registration at this time."* — while the same request asked the
school owner to approve that very instructor. Latent before v10.0.0 only
because the admin-first path was a dead end (D-16); repairing D-16 made it fire
on **every** admin-first approval of a school member.

Now branches on the resulting status, and stays deliberately silent on
`PENDING_COMPANY`.

### D-19 — the second gate did not finish the job

`verify_company_token`'s approve branch unconditionally set `PENDING_ADMIN`,
minted an admin token and emailed **and WhatsApped every admin** — with no check
on `verified_by_admin_id`. In the admin-first order (now the default trajectory,
since D-16 mails the owner straight after admin approval) the owner's approval
therefore did not produce `VERIFIED`: it spammed every admin about someone they
had already approved and held the instructor out of their account until an admin
clicked Approve a second time. This contradicted §5 of the architecture map,
which the same release rewrote. The school-first order was fine — that side got
its check in D-16 — and the mirror case was never tested.

Now: admin gate already closed → straight to `VERIFIED`, activate the user, send
the approval notification, no admin blast.

### D-20 — a link that is dead on arrival

`verification_token_expires` is one column shared by both tokens, written once at
registration as `now + 72h`. The company token minted during admin approval left
it untouched, so an admin approving more than 72 hours after registration — a
queue that sat over a weekend — handed the owner a link that had already expired,
in an email claiming 72 hours of validity. The resend path already refreshed the
expiry; the mint did not.

### D-21 — the school asked to approve its own invitation

`auth.register_instructor` carries the comment *"The invitation IS the school's
approval, so only the admin credential check remains."* It sets the status but
never stamped `verified_by_instructor_id`, and v10.0.0 made that stamp the thing
`needs_company_approval` actually reads. Every invited instructor therefore took
admin click → owner click → admin click. Fixed by stamping
`company.owner_instructor_id` at acceptance. (Use the company's owner, not
`invite.instructor_id` — that column holds the *accepting* instructor.)

### D-22 — debounced search races a tab switch

The debounce effect depends only on `[searchQuery]` and captures `activeTab` in
its timer; `switchTab` did not clear the pending timer. Type a character and
switch tabs within 350 ms and the stale request lands ~250 ms after the fresh
one, so last-write-wins puts the old tab's rows under the new tab's header.
`switchTab` now clears the timer.

### Verification

Exercised against the live PostgreSQL database via a throwaway instructor row
attached to a real school, calling the real route function and the real service,
with all four notification senders stubbed and the probe rows deleted afterwards
(`probe rows remaining = 0`). No email or WhatsApp left the machine.

| Order | Result |
|---|---|
| **A** admin → school | `pending_company` (no rejection mail; owner notified; minted expiry in the future) → `VERIFIED`, user `ACTIVE`, approval mail, **admins not re-notified** |
| **B** school → admin | `pending_admin`, admins notified, school stamp recorded → `VERIFIED`, user `ACTIVE`, approval mail, no rejection |
| **C** invited (school gate pre-stamped) | `needs_company_approval` False → one admin click → `VERIFIED`, owner not re-asked |
| **D** admin rejects | `REJECTED`, rejection mail sent |

24 of 24 assertions passed.

---

## D-23 — Database Interface search never searched

Found by repairing CI rather than by driving the UI: the two `DatabaseInterface`
suites had not run since they were written, and making them run surfaced this.

`handleSearchChange` is `useCallback(..., [])`, so it is pinned to the first
render and the `fetchUsers` / `fetchAdmins` / … it closes over read the table
state as it was at mount. Its debounced timer therefore called
`fetchUsers(1)`, which re-read `usersTable.search` from that first-render
closure — permanently `''`. **Typing in the search box updated the input and
issued a request, and the request always carried an empty search term.** The
same applied to all five searchable tabs. Nothing else refetches on `search`
(the filter effects watch `userRoleFilter` / `userStatusFilter` / … only), so
there was no path by which a typed query reached the server.

The test that caught it asserted the call arguments, and got three calls all
reading `1, 20, "", undefined, undefined, "-created_at"` after typing `john`.

Fixed on two levels, because either alone would still be wrong:

* the five list fetchers take an optional `searchOverride`, so the debounce can
  pass the text it was given instead of re-reading state React has not committed;
* a `searchFetchersRef` refreshed every render, so the pinned callback calls the
  *current* fetchers and keeps the active role/status filters, page size and sort
  instead of resetting them to their mount values.

### CI, and what running the suites was worth

GitHub Actions had been red on every push to `main` since v8.1.0 (2026-08-04).
ESLint: 9 `no-duplicate-imports` errors, each a value import beside an
`import type` from the same module — merged with inline `type` specifiers, no
rule relaxed. Jest: every `expo-*` import died in `expo-modules-core` under the
bare `react-native` preset, taking out both suites before a single assertion
ran; `jest.setup.js` now mocks the four expo modules this app imports.

With the suites actually executing, both turned out to be stale as well:

| Suite | State |
|---|---|
| `services/__tests__/database-interface.test.ts` | Asserted `axios.get` with an object argument (`{ page, page_size }`) and hand-built auth headers. The real functions take positional arguments and go through `apiService`, which adds auth in an interceptor. Every assertion was unreachable. Rewritten against the real surface — 17 tests. |
| `screens/__tests__/DatabaseInterfaceScreen.test.tsx` | Rendered without `ThemeProvider` or `I18nProvider`, so the screen threw on `useTheme`. Called `jest.mock` inside a test body, where hoisting makes it a no-op. Asserted object-shaped API arguments, and read `accessibilityState` off a `<Text>` rather than its `Pressable`. All 11 repaired. |

**6 suites, 70 tests, all passing.** Typecheck baseline improved 89 → 85, still
zero in app code.

> **Local note:** run Jest through Windows node (`cmd.exe /c "cd /d
> C:\Projects\DRIVE_ALIVE\frontend && npx jest"`). Under WSL node it dies at
> `Preset react-native not found relative to rootDir`.
