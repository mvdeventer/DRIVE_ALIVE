# Update Drive Alive On Windows

This guide updates an existing Drive Alive installation to the current repository state.

## Recommended Update Flow

```powershell
git pull origin main
.\s.bat stop
.\s.bat install --force
.\s.bat start
```

## Database And Migration Steps

If the backend schema changed, run:

```powershell
cd backend
.\venv\Scripts\python.exe -m alembic upgrade head
```

## Verification Checklist

- Confirm the frontend loads on `http://localhost:8081`
- Confirm the backend responds on `http://localhost:8000/health`
- Confirm `http://localhost:8000/docs` loads
- Confirm your `backend/.env` still points at the correct database and external services

## Rollback Guidance

- Stop both services before restoring an older version
- Restore the previous database backup before rolling back code
- Reinstall dependencies if the target release used a different dependency set
