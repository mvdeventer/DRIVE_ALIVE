# Update Drive Alive On Windows

This guide upgrades an existing installation to Drive Alive 6.3.0.

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

## Release Artifacts

- Review the GitHub release notes for migration notes and install changes.
- Review `docs/releases/v6.3.0.md` for the repository copy of the published release notes.

## Rollback Guidance

- Stop both services before restoring an older version.
- Restore the previous database backup before rolling back application code.
- Reinstall dependencies if the target release used a different dependency set.
