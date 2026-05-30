# Install Drive Alive On A New Windows PC

This guide installs Drive Alive 2.0.7 from source on a fresh Windows machine.

## Prerequisites

- Windows 10 or later
- Git
- Python 3.9+
- Node.js 18+
- PostgreSQL 13+

## Clone The Repository

```powershell
git clone https://github.com/mvdeventer/DRIVE_ALIVE.git
cd DRIVE_ALIVE
```

## Full Install

```powershell
.\s.bat install
```

The install command prepares the backend virtual environment, installs backend and frontend dependencies, copies `backend/.env.example` to `backend/.env` when needed, and attempts PostgreSQL database provisioning.

## Start The Application

```powershell
.\s.bat start
```

Service endpoints:

- Frontend: `http://localhost:8081`
- Backend API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

## Manual Recovery

### Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
copy .env.example .env
```

### Frontend

```powershell
cd frontend
npm install
```

### Database

- Ensure PostgreSQL is installed and running.
- Confirm `DATABASE_URL` in `backend/.env` points at the target PostgreSQL instance.
- Apply migrations if needed:

```powershell
cd backend
.\venv\Scripts\python.exe -m alembic upgrade head
```

## Installer Inputs

The Windows installer definition is `scripts/installer.iss`. The release workflow refreshes the documentation shipped with the installer and validates the tracked setup files before publishing a release.
