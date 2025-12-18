# Virtual Environment Setup for VS Code

## ✅ Setup Complete!

Your project is now configured to use Python virtual environment (venv) automatically in VS Code.

## What's Been Configured

### 1. Python Virtual Environment
- **Location**: `.venv` in project root
- **Python Version**: 3.13.9
- **All backend packages installed**: ✅
  - FastAPI, SQLAlchemy, Stripe, PayFast, JWT auth, etc.

### 2. VS Code Configuration
- **Python interpreter**: Automatically uses `.venv/Scripts/python.exe`
- **Terminal**: Auto-activates venv when opening terminal
- **Pylance**: Configured with correct paths
- **Debugging**: Launch configurations ready

### 3. Available VS Code Tasks
Press `Ctrl+Shift+P` → "Run Task" to access:
- **Setup Python venv** - Reinstall Python packages
- **Start Backend (FastAPI)** - Run FastAPI server
- **Start Frontend (Expo)** - Run React Native app
- **Install Frontend Dependencies** - Install npm packages
- **Start All** - Run both backend and frontend (default build task)

## Quick Start

### From VS Code Terminal
The terminal automatically activates the venv. Just run:

```powershell
# Start Backend
cd backend/app
python -m uvicorn main:app --reload

# Start Frontend (new terminal)
cd frontend
npm start
```

### Using VS Code Tasks
1. Press `Ctrl+Shift+B` (default build task)
2. Or press `Ctrl+Shift+P` → type "Run Task" → "Start All"

### Using Debug Configuration
1. Press `F5` or go to Run & Debug panel
2. Select "Python: FastAPI"
3. Start debugging

## Manual Setup Script

If you need to reinstall everything:

```powershell
.\setup_venv.ps1
```

This script will:
- Create/verify venv exists
- Install all Python packages
- Install all npm packages
- Display setup summary

## Verify Installation

### Check Python Environment
```powershell
# From project root (venv should auto-activate)
python --version
python -c "import fastapi; print(fastapi.__version__)"
python -c "import sqlalchemy; print(sqlalchemy.__version__)"
```

### Check Installed Packages
```powershell
# Python packages
pip list

# Frontend packages
cd frontend
npm list --depth=0
```

## VS Code Settings Applied

### Python Settings
- ✅ Virtual environment path configured
- ✅ Auto-activation in terminal enabled
- ✅ Python analysis paths set for backend
- ✅ Linting disabled (using Pylance)
- ✅ Format on save enabled

### Terminal Settings
- ✅ VIRTUAL_ENV environment variable set
- ✅ Auto-activates venv on terminal open

### File Exclusions
Hidden from search and file explorer:
- `__pycache__`
- `.pytest_cache`
- `node_modules`
- `.expo`
- `*.pyc`

## Recommended VS Code Extensions

Install these for best experience (already in `.vscode/extensions.json`):

### Python Development
- **Python** (ms-python.python) - Core Python support
- **Pylance** (ms-python.vscode-pylance) - Fast language server
- **Python Debugger** (ms-python.debugpy) - Debugging support

### Frontend Development
- **ESLint** (dbaeumer.vscode-eslint) - JavaScript linting
- **TypeScript** (ms-vscode.vscode-typescript-next) - TS support

### General
- **IntelliCode** (visualstudioexptteam.vscodeintellicode) - AI assistance
- **Docker** (ms-azuretools.vscode-docker) - Container support

## Troubleshooting

### Virtual Environment Not Activating

1. **Reload Window**: `Ctrl+Shift+P` → "Reload Window"
2. **Check Interpreter**: `Ctrl+Shift+P` → "Python: Select Interpreter" → Choose `.venv`
3. **Manual Activation**:
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```

### Import Errors in Python Files

1. **Verify packages installed**:
   ```powershell
   .\.venv\Scripts\python.exe -m pip list
   ```

2. **Reinstall if needed**:
   ```powershell
   .\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
   ```

3. **Reload VS Code**: `Ctrl+Shift+P` → "Reload Window"

### Module Not Found Errors

If you see import errors for backend modules:

1. **Check Python path** - Should be `.venv/Scripts/python.exe`
2. **Verify settings.json** has correct paths
3. **Run from correct directory**:
   ```powershell
   cd backend
   python -m app.main
   ```

### PowerShell Execution Policy

If script execution is disabled:

```powershell
# Run as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Project Structure with venv

```
DRIVE_ALIVE/
├── .venv/                    # Virtual environment (auto-created)
│   ├── Scripts/
│   │   ├── python.exe       # Python interpreter
│   │   ├── pip.exe          # Package manager
│   │   └── activate.ps1     # Activation script
│   └── Lib/                 # Installed packages
├── .vscode/
│   ├── settings.json        # VS Code Python config ✅
│   ├── launch.json          # Debug configurations ✅
│   ├── tasks.json           # Build/run tasks ✅
│   └── extensions.json      # Recommended extensions ✅
├── backend/
│   ├── app/                 # Python source code
│   └── requirements.txt     # Python dependencies ✅ installed
├── frontend/
│   ├── package.json         # npm dependencies
│   └── node_modules/        # npm packages (to be installed)
└── setup_venv.ps1          # Setup script ✅
```

## Running the Application

### Development Mode

**Backend** (Terminal 1):
```powershell
# Terminal auto-activates venv
cd backend/app
python -m uvicorn main:app --reload
```
Access: http://localhost:8000/docs

**Frontend** (Terminal 2):
```powershell
cd frontend
npm start
# Press 'w' for web, 'a' for Android, 'i' for iOS
```

### Using VS Code Tasks (Recommended)

Press `Ctrl+Shift+B` to run both simultaneously!

## Environment Variables

Don't forget to configure:

1. **Backend**: Copy and edit `.env`
   ```powershell
   cd backend
   cp .env.example .env
   notepad .env  # Edit with your settings
   ```

2. **Generate SECRET_KEY**:
   ```powershell
   python -c "import secrets; print(secrets.token_hex(32))"
   ```

## Next Steps

1. ✅ Virtual environment configured
2. ✅ All Python packages installed
3. ⏳ Install frontend packages: `cd frontend && npm install`
4. ⏳ Setup PostgreSQL database
5. ⏳ Configure `.env` file
6. ⏳ Start backend server
7. ⏳ Start frontend app

## Quick Reference

| Task | Command | Shortcut |
|------|---------|----------|
| Open Terminal | - | `` Ctrl+` `` |
| Run Task | Command Palette | `Ctrl+Shift+P` |
| Build (Start All) | - | `Ctrl+Shift+B` |
| Start Debugging | - | `F5` |
| Select Python Interpreter | Command Palette | - |
| Reload Window | Command Palette | - |

---

**Status**: ✅ Ready for development!

All Python dependencies are installed in the virtual environment. VS Code is configured to use it automatically.
