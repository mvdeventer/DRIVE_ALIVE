# Drive Alive - Development Scripts

This directory contains batch scripts to manage the Drive Alive application.

## 📁 Available Scripts

### `drive-alive.bat` ⭐ **PRIMARY SCRIPT**

**Comprehensive all-in-one development and deployment toolkit**

This is the **ONLY** script you need for development! It replaces all legacy scripts with a unified, powerful interface.

#### Quick Examples:

```bash
# Start everything (servers + open browsers)
scripts\drive-alive.bat start

# Check if everything is set up correctly
scripts\drive-alive.bat check

# Install all dependencies
scripts\drive-alive.bat install

# Run all tests
scripts\drive-alive.bat test

# Commit changes with GitHub CLI
scripts\drive-alive.bat commit -m "feat: new feature"

# Create a release
scripts\drive-alive.bat release -v v1.0.0

# Build for production (dry-run)
scripts\drive-alive.bat build

# Stop all servers
scripts\drive-alive.bat stop
```

#### Available Commands:

| Command   | Description             | Options                                             |
| --------- | ----------------------- | --------------------------------------------------- |
| `start`   | Start servers (default) | `--backend-only`, `--frontend-only`, `--no-browser` |
| `stop`    | Stop all servers        | -                                                   |
| `restart` | Restart all servers     | -                                                   |
| `check`   | Check dependencies      | -                                                   |
| `install` | Install dependencies    | `--backend-only`, `--frontend-only`                 |
| `test`    | Run tests               | `--backend-only`, `--frontend-only`                 |
| `build`   | Build (dry-run)         | `--backend-only`, `--frontend-only`                 |
| `commit`  | Git commit with GH CLI  | `--message "msg"`, `-m "msg"`                       |
| `release` | Create release          | `--version v1.0.0`, `-v v1.0.0`                     |
| `status`  | Show system status      | -                                                   |
| `help`    | Show help               | -                                                   |

#### Options:

- `--backend-only`, `-b` - Only affect backend
- `--frontend-only`, `-f` - Only affect frontend
- `--no-browser`, `-n` - Don't open browsers
- `--debug`, `-d` - Show debug info
- `--port [PORT]` - Custom backend port
- `--message [MSG]`, `-m` - Commit message
- `--version [VER]`, `-v` - Release version

#### Features:

✅ **Dependency Checking** - Verifies Python, Node.js, Git, GitHub CLI
✅ **Auto Environment** - Activates venv automatically
✅ **Browser Auto-Open** - Opens API docs & frontend
✅ **GitHub CLI Integration** - Commit and release commands
✅ **Build Verification** - Dry-run production builds
✅ **Server Management** - Start, stop, restart servers
✅ **Status Monitoring** - Check what's running
✅ **Colored Output** - Easy-to-read colored terminal

---

## � Utility Scripts

### `setup-database.bat`

**Creates PostgreSQL database**

- Creates 'driving_school_db' database
- Checks if PostgreSQL is installed
- Provides connection string
- Run after installing PostgreSQL

> **Note:** This is a specialized database setup utility. For all other operations, use `drive-alive.bat`

## 📋 Setup Workflow

For first-time setup:

```bash
# 1. Install dependencies and check system
scripts\drive-alive.bat install

# 2. Create database (if using PostgreSQL)
scripts\setup-database.bat

# 3. Configure environment
# Edit backend\.env with your settings

# 4. Start application
scripts\drive-alive.bat start
```

## 🛠️ Development Workflow

For daily development:

```bash
# Start development servers
scripts\drive-alive.bat start

# Run tests
scripts\drive-alive.bat test

# Check project status
scripts\drive-alive.bat status

# Stop servers
scripts\drive-alive.bat stop
```

## 📝 Important Notes

- **Primary Tool**: Use `drive-alive.bat` for all standard operations
- **Database Setup**: Use `setup-database.bat` only for PostgreSQL database creation
- **Virtual Environment**: Automatically activated by all scripts
- **Auto-reload**: Backend and frontend reload on file changes
- **Port Numbers**:
  - Backend: 8000
  - Frontend: 19000 (default Expo port)
- **Stopping Servers**: Use `drive-alive.bat stop` or close terminal windows

## 🔍 Troubleshooting

### Dependencies not found?

```bash
scripts\drive-alive.bat check    # Check what's missing
scripts\drive-alive.bat install  # Install everything
```

### Backend/Frontend won't start?

```bash
scripts\drive-alive.bat status   # Check current state
scripts\drive-alive.bat restart  # Restart servers
```

### Database errors?

1. Run `scripts\setup-database.bat` to create database
2. Update `backend\.env` with correct DATABASE_URL
3. Restart backend: `scripts\drive-alive.bat restart`

### Port conflicts?

The scripts check for available ports automatically. If issues persist, manually stop conflicting processes.

## 💡 Pro Tips

- Run `drive-alive.bat help` to see all available commands
- Use `drive-alive.bat check` before starting work to verify dependencies
- Use `drive-alive.bat status` to see running servers
- Use `drive-alive.bat test` to run automated tests
- Use `drive-alive.bat commit` for quick Git commits

## 🔗 Quick Links

When servers are running:

- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc
- **Frontend**: Opens automatically in browser
