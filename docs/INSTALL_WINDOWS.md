# Install Drive Alive On A New Windows PC

This guide installs Drive Alive 5.0.0 from the repository on a fresh Windows machine.

## Prerequisites

- Windows 10 or later
- Git
- Python 3.9+
- Node.js 18+
- PostgreSQL 13+
- GitHub CLI (`gh`) if you also plan to publish releases from this machine

## Repository Setup

```powershell
git clone https://github.com/mvdeventer/DRIVE_ALIVE.git
cd DRIVE_ALIVE
```

## One-Command Install

```powershell
.\s.bat install
```

The install command prepares the backend virtual environment, installs backend and frontend dependencies, provisions the PostgreSQL database when possible, and writes `backend/.env` from `backend/.env.example`.

## Start The Full Stack

```powershell
.\s.bat start
```

Services:

- Frontend: `http://localhost:8081`
- Backend API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

## Manual Recovery Steps

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
- Confirm `DATABASE_URL` in `backend/.env` points at your local PostgreSQL instance.
- Run migrations if needed:

```powershell
cd backend
.\venv\Scripts\python.exe -m alembic upgrade head
```

## Installer Assets

The Windows installer definition lives in `scripts/installer.iss`. Release automation validates the installer inputs and refreshes the shipped documentation and install manifest before publishing a GitHub release.
