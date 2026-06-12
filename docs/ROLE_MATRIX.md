# Role Matrix

This project supports three canonical runtime roles:

- `admin`
- `instructor`
- `student`

`company-owner` is not a separate runtime role. It is represented as instructor capability metadata (`is_company_owner=true`) on an instructor profile.

## Transition Matrix

### Public registration (`public_registration`)

| Existing effective role set | Allowed target roles |
| --- | --- |
| unregistered | student, instructor |
| student | instructor |
| instructor | student |
| admin | student, instructor |

### Admin grant (`admin_grant`)

| Existing effective role set | Allowed target roles |
| --- | --- |
| unregistered | admin |
| student | admin |
| instructor | admin |
| admin | admin |

Only an authenticated admin may perform transitions via `admin_grant`.

### Initial setup (`initial_setup`)

| Existing effective role set | Allowed target roles |
| --- | --- |
| unregistered | admin |

## Runtime selection rules

- A login role must be one of the account's available runtime roles.
- Unknown role values are rejected server-side (`Invalid role selection for this account.`).
- Frontend navigation strictly blocks unknown runtime role values and surfaces an error guard screen.

## Company owner behavior

- Company owner accounts remain `instructor` runtime role.
- Company ownership uses profile flags and company relationships, not a separate role enum.
- Any UI/API checks for ownership must use instructor ownership state, not `school_owner` role strings.

## Automated coverage

- Backend policy tests: [backend/tests/test_role_transition_policy.py](../backend/tests/test_role_transition_policy.py)
- Frontend role guard tests: [frontend/__tests__/MainTabs.test.tsx](../frontend/__tests__/MainTabs.test.tsx)
