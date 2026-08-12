# Role Matrix

This project supports four canonical runtime roles:

- `admin` — the platform operator. Global, unscoped.
- `company_admin` — administers a single driving school. No platform powers.
- `instructor`
- `student`

`company-owner` is not a runtime role. It is legacy instructor capability metadata
(`is_company_owner=true`) on an instructor profile, and predates `company_admin`.

## admin vs company_admin

These are deliberately separate enum values, not one role scoped by a company id.

`require_admin` ([backend/app/middleware/admin.py](../backend/app/middleware/admin.py))
authorizes by **exact equality** against `UserRole.ADMIN` and gates every `/admin/*`
route — including Reset Database, Backup and Restore. Because the comparison is
exact, `company_admin` is refused at all of those call sites without any of them
changing. Scoping a single `admin` role by company id would instead have been
fail-open: one route missed during the audit would hand a driving school the
platform's database.

Company-scoped routes use `require_company_admin`
([backend/app/middleware/company.py](../backend/app/middleware/company.py)), which
returns a `CompanyContext`. **Routes must take the company id from that context,
never from a path, query or body parameter** — accepting a caller-supplied company
id would let any school administrator act on another school's records.

## Transition Matrix

### Public registration (`public_registration`)

| Existing effective role set | Allowed target roles |
| --- | --- |
| unregistered | student, instructor |
| student | instructor |
| instructor | student |
| admin | student, instructor |
| company_admin | student, instructor |

### Company registration (`company_registration`)

Registering a driving school. Public, like student and instructor registration,
but it can only ever mint `company_admin`.

| Existing effective role set | Allowed target roles |
| --- | --- |
| unregistered | company_admin |
| student | company_admin |
| instructor | company_admin |
| admin | company_admin |

### Admin grant (`admin_grant`)

| Existing effective role set | Allowed target roles |
| --- | --- |
| unregistered | admin, student, instructor |
| student | admin, instructor |
| instructor | admin, student |
| admin | admin, student, instructor |
| company_admin | admin, student, instructor |

Only an authenticated admin may perform transitions via `admin_grant`.

### Initial setup (`initial_setup`)

| Existing effective role set | Allowed target roles |
| --- | --- |
| unregistered | admin |

`admin` is reachable only through `admin_grant` and `initial_setup`. No public
channel can produce it.

## Runtime selection rules

- A login role must be one of the account's available runtime roles.
- Roles are resolved by **profile-row existence** — a `Student`, `Instructor` or
  `CompanyAdmin` row for that user — plus the `User.role` column.
- Unknown role values are rejected server-side (`Invalid role selection for this account.`).
- Frontend navigation strictly blocks unknown runtime role values and surfaces an error guard screen.
- Every source role must appear as a key in every channel dict: `_allowed_targets`
  does `channel_rules.get(source_role, set())`, so an absent key silently blocks
  all transitions for anyone holding that role.

## Company owner behavior (legacy)

- Company owner accounts remain `instructor` runtime role.
- Company ownership uses profile flags and company relationships, not a separate role enum.
- Any UI/API checks for ownership must use instructor ownership state, not `school_owner` role strings.
- New work should prefer `company_admin` + `CompanyAdmin`; `is_company_owner` is retained
  so existing owners keep working.

## Automated coverage

- Backend policy tests: [backend/tests/test_role_transition_policy.py](../backend/tests/test_role_transition_policy.py)
- Platform-admin boundary: [backend/tests/test_require_admin_boundary.py](../backend/tests/test_require_admin_boundary.py)
- Company-admin boundary: [backend/tests/test_require_company_admin.py](../backend/tests/test_require_company_admin.py)
- Login contract: [backend/tests/test_auth_login_contract.py](../backend/tests/test_auth_login_contract.py)
- Frontend role guard tests: [frontend/__tests__/MainTabs.test.tsx](../frontend/__tests__/MainTabs.test.tsx)
