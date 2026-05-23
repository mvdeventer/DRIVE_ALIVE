# Load Testing

We use [Locust](https://locust.io) for HTTP load testing because it is pip-installable
and shares the backend's existing Python venv — no extra runtime to install.

## Install

```powershell
backend\venv\Scripts\python.exe -m pip install locust
```

## Run (interactive UI)

```powershell
cd backend
..\backend\venv\Scripts\locust.exe -f tests/load/locustfile.py --host http://localhost:8000
```

Open <http://localhost:8089> and start a swarm.

## Run (headless, with HTML report)

```powershell
cd backend
..\backend\venv\Scripts\locust.exe -f tests/load/locustfile.py `
    --host http://localhost:8000 `
    --headless -u 200 -r 20 -t 2m `
    --html ..\logs\load_report.html
```

| Flag | Meaning |
| --- | --- |
| `-u 200` | 200 concurrent users |
| `-r 20` | spawn 20 users/sec |
| `-t 2m` | run for 2 minutes |

## Authenticated traffic

Set credentials for a pre-existing student before running so the authenticated user
class can hit `/auth/login`, `/certifications/me`, etc.

```powershell
$env:LOAD_STUDENT_EMAIL    = "loadtest@example.com"
$env:LOAD_STUDENT_PASSWORD = "ChangeMe!23"
```

## What is exercised

| Class | Endpoint | Purpose |
| --- | --- | --- |
| `PublicBrowsingUser` | `GET /instructors/` (paginated + geo) | Hot read path; validates index/N+1 fix |
| `PublicBrowsingUser` | `GET /` | Liveness baseline |
| `AuthenticatedStudentUser` | `POST /auth/login` | Auth path under load |
| `AuthenticatedStudentUser` | `GET /certifications/me` | New per-user lookup |
| `AuthenticatedStudentUser` | `GET /instructors/{id}` | Detail page |

## Recent optimisations targeted by these tests

- `joinedload(InstructorModel.user)` on `GET /instructors/` eliminates the N+1
  user lookup that issued one `SELECT user` per instructor.
- `limit` / `offset` pagination on `GET /instructors/` (default 100, max 500).
- Indexes on `bookings(student_id)`, `bookings(instructor_id)`,
  `bookings(lesson_date)`, `bookings(status)` — speeds up admin dashboards,
  "my bookings", and analytics timeseries.
