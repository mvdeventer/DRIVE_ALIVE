# Drive Alive - PID Tracking System

## Overview

The `s.bat` script now uses a **PID (Process ID) tracking system** for reliable server management.

## How It Works

### Starting Servers

When you run `s.bat`, the script:

1. **Stops existing servers** by reading `.pid` files
2. **Starts new servers** and captures their PIDs
3. **Saves PIDs to files**:
   - `backend\.backend.pid` - Backend server PID
   - `frontend\.frontend.pid` - Frontend server PID

### Stopping Servers

When stopping servers (restart, database clear, or manual stop):

1. **Reads PID files**
2. **Checks if processes are still running**
3. **Kills processes by exact PID** (graceful first, then force)
4. **Cleans up PID files**
5. **Fallback to window title** if PID files don't exist

## Benefits

✅ **Precise targeting** - Only kills YOUR Drive Alive processes
✅ **No collateral damage** - VSCode Pylance, other Python tools unaffected
✅ **Reliable shutdown** - Uses exact process IDs, not pattern matching
✅ **Clean restarts** - No orphaned processes

## PID Files Location

```
DRIVE_ALIVE/
├── backend/
│   └── .backend.pid      # Backend server PID
└── frontend/
    └── .frontend.pid     # Frontend server PID
```

## Troubleshooting

**PID file exists but process not running:**

- Script automatically detects this and cleans up stale PID files

**Servers won't stop:**

- Check Task Manager for CMD windows titled "Drive Alive - Backend" or "Drive Alive - Frontend"
- Manually delete PID files: `backend\.backend.pid` and `frontend\.frontend.pid`
- Run `s.bat` again

**PID files not created:**

- Ensure you're running with administrator privileges (if required)
- Check Windows Event Viewer for permission errors

## Manual Cleanup

If needed, manually remove PID files:

```cmd
del backend\.backend.pid
del frontend\.frontend.pid
```

Then restart with `s.bat`.

## Technical Details

- **Storage Format**: Plain text file with single PID number
- **Encoding**: ASCII (no newlines)
- **Cleanup**: Automatic on graceful shutdown
- **Fallback**: Window title matching if PID files missing
