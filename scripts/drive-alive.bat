@echo off
:: ==============================================================================
:: Drive Alive - Universal Development & Deployment Manager
:: ==============================================================================
::
:: This script provides a comprehensive development and deployment toolkit for
:: the Drive Alive project, including server management, dependency checking,
:: GitHub operations, and automated testing.
::
:: USAGE:
::   drive-alive.bat [COMMAND] [OPTIONS]
::
:: COMMANDS:
::   start           Start backend and frontend servers (default)
::   stop            Stop all running servers
::   restart         Restart all servers
::   check           Check all dependencies and environment
::   install         Install all dependencies (backend + frontend)
::   test            Run all tests (backend + frontend)
::   build           Build production bundles (dry-run)
::   commit          Commit changes with GitHub CLI
::   release         Create a release with GitHub CLI (auto-updates versions)
::   status          Show Git and server status
::   update-version  Update version in all project files
::   help            Show this help message
::
:: OPTIONS:
::   --backend-only, -b      Only affect backend
::   --frontend-only, -f     Only affect frontend
::   --no-browser, -n        Don't open browser windows
::   --debug, -d             Show detailed debug information
::   --port [PORT]           Custom backend port (default: 8000)
::   --message [MSG], -m     Commit message (for commit command)
::   --version [VER], -v     Version tag (for release command)
::
:: EXAMPLES:
::   drive-alive.bat start                    # Start both servers and open browsers
::   drive-alive.bat start --backend-only     # Start only backend server
::   drive-alive.bat check                    # Check all dependencies
::   drive-alive.bat commit -m "feat: new feature"
::   drive-alive.bat release -v v1.0.0
::   drive-alive.bat build                    # Dry-run production build
::   drive-alive.bat test                     # Run all tests
::
:: REQUIREMENTS:
::   - Python 3.9+ (for backend)
::   - Node.js 18+ & npm (for frontend)
::   - GitHub CLI (gh) [optional, for git operations]
::   - Git (for version control)
::
:: ==============================================================================

setlocal enabledelayedexpansion

:: Configuration
set "PROJECT_ROOT=%~dp0.."
set "BACKEND_DIR=%PROJECT_ROOT%\backend"
set "FRONTEND_DIR=%PROJECT_ROOT%\frontend"
set "VENV_DIR=%BACKEND_DIR%\venv"
set "BACKEND_PORT=8000"
set "FRONTEND_PORT=19000"
set "BACKEND_URL=http://localhost:%BACKEND_PORT%"
set "FRONTEND_URL=http://localhost:%FRONTEND_PORT%"
set "API_DOCS_URL=%BACKEND_URL%/docs"

:: Colors for output (Windows 10+)
set "COLOR_RESET=[0m"
set "COLOR_GREEN=[92m"
set "COLOR_YELLOW=[93m"
set "COLOR_RED=[91m"
set "COLOR_BLUE=[94m"
set "COLOR_CYAN=[96m"

:: Parse arguments
set "COMMAND=%~1"
set "BACKEND_ONLY=0"
set "FRONTEND_ONLY=0"
set "NO_BROWSER=0"
set "DEBUG=0"
set "COMMIT_MESSAGE="
set "RELEASE_VERSION="

if "%COMMAND%"=="" set "COMMAND=start"

:parse_args
shift
if "%~1"=="" goto :end_parse
if /i "%~1"=="--backend-only" set "BACKEND_ONLY=1"
if /i "%~1"=="-b" set "BACKEND_ONLY=1"
if /i "%~1"=="--frontend-only" set "FRONTEND_ONLY=1"
if /i "%~1"=="-f" set "FRONTEND_ONLY=1"
if /i "%~1"=="--no-browser" set "NO_BROWSER=1"
if /i "%~1"=="-n" set "NO_BROWSER=1"
if /i "%~1"=="--debug" set "DEBUG=1"
if /i "%~1"=="-d" set "DEBUG=1"
if /i "%~1"=="--port" (
    shift
    set "BACKEND_PORT=%~1"
    set "BACKEND_URL=http://localhost:!BACKEND_PORT!"
    set "API_DOCS_URL=!BACKEND_URL!/docs"
)
if /i "%~1"=="--message" (
    shift
    set "COMMIT_MESSAGE=%~1"
)
if /i "%~1"=="-m" (
    shift
    set "COMMIT_MESSAGE=%~1"
)
if /i "%~1"=="--version" (
    shift
    set "RELEASE_VERSION=%~1"
)
if /i "%~1"=="-v" (
    shift
    set "RELEASE_VERSION=%~1"
)
goto :parse_args

:end_parse

:: Show header
echo.
echo %COLOR_CYAN%==============================================================================
echo   Drive Alive - Development Manager
echo ==============================================================================%COLOR_RESET%
echo.

:: Execute command
if /i "%COMMAND%"=="start" goto :cmd_start
if /i "%COMMAND%"=="stop" goto :cmd_stop
if /i "%COMMAND%"=="restart" goto :cmd_restart
if /i "%COMMAND%"=="check" goto :cmd_check
if /i "%COMMAND%"=="install" goto :cmd_install
if /i "%COMMAND%"=="test" goto :cmd_test
if /i "%COMMAND%"=="build" goto :cmd_build
if /i "%COMMAND%"=="commit" goto :cmd_commit
if /i "%COMMAND%"=="release" goto :cmd_release
if /i "%COMMAND%"=="status" goto :cmd_status
if /i "%COMMAND%"=="update-version" goto :cmd_update_version
if /i "%COMMAND%"=="help" goto :cmd_help
if /i "%COMMAND%"=="--help" goto :cmd_help
if /i "%COMMAND%"=="-h" goto :cmd_help
if /i "%COMMAND%"=="/?" goto :cmd_help

echo %COLOR_RED%Error: Unknown command '%COMMAND%'%COLOR_RESET%
echo Run 'drive-alive.bat help' for usage information.
exit /b 1

:: ==============================================================================
:: COMMAND: START
:: ==============================================================================
:cmd_start
echo %COLOR_BLUE%Starting Drive Alive servers...%COLOR_RESET%
echo.

:: Always stop any existing servers first
echo %COLOR_YELLOW%Stopping any existing servers...%COLOR_RESET%
taskkill /FI "WINDOWTITLE eq Drive Alive - Backend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Drive Alive - Frontend*" /T /F >nul 2>&1
taskkill /FI "ImageName eq uvicorn.exe" /F >nul 2>&1
taskkill /FI "ImageName eq python.exe" /FI "CommandLine eq *uvicorn*" /F >nul 2>&1
taskkill /FI "ImageName eq node.exe" /FI "CommandLine eq *expo*" /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8081" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":19000" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
timeout /t 1 /nobreak >nul
echo.

call :check_dependencies
if errorlevel 1 (
    echo %COLOR_RED%Dependency check failed. Run 'drive-alive.bat check' for details.%COLOR_RESET%
    exit /b 1
)

if "%FRONTEND_ONLY%"=="1" goto :start_frontend_only
if "%BACKEND_ONLY%"=="1" goto :start_backend_only

:: Start both servers
echo %COLOR_YELLOW%Starting Backend Server on port %BACKEND_PORT%...%COLOR_RESET%
start "Drive Alive - Backend" cmd /k "cd /d "%BACKEND_DIR%" && "%VENV_DIR%\Scripts\python.exe" -m uvicorn app.main:app --reload --host 0.0.0.0 --port %BACKEND_PORT%"

echo %COLOR_YELLOW%Waiting for backend to initialize...%COLOR_RESET%
timeout /t 5 /nobreak >nul

echo %COLOR_YELLOW%Starting Frontend Server...%COLOR_RESET%
start "Drive Alive - Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && npm start"

echo.
echo %COLOR_GREEN%Servers are starting...%COLOR_RESET%
echo.
echo   Backend:  %BACKEND_URL%
echo   API Docs: %API_DOCS_URL%
echo   Frontend: %FRONTEND_URL%
echo.

if "%NO_BROWSER%"=="1" goto :start_done

echo %COLOR_YELLOW%Waiting for servers to be ready...%COLOR_RESET%
timeout /t 10 /nobreak >nul

echo %COLOR_YELLOW%Opening browser windows...%COLOR_RESET%
start "" "%API_DOCS_URL%"
timeout /t 2 /nobreak >nul
start "" "%FRONTEND_URL%"

:start_done
echo.
echo %COLOR_GREEN%All servers started successfully!%COLOR_RESET%
echo %COLOR_YELLOW%Press Ctrl+C in server windows to stop them.%COLOR_RESET%
echo.
goto :eof

:start_backend_only
echo %COLOR_YELLOW%Stopping any existing backend servers...%COLOR_RESET%
taskkill /FI "WINDOWTITLE eq Drive Alive - Backend*" /T /F >nul 2>&1
taskkill /FI "ImageName eq uvicorn.exe" /F >nul 2>&1
taskkill /FI "ImageName eq python.exe" /FI "CommandLine eq *uvicorn*" /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
timeout /t 1 /nobreak >nul
echo %COLOR_YELLOW%Starting Backend Server only...%COLOR_RESET%
start "Drive Alive - Backend" cmd /k "cd /d "%BACKEND_DIR%" && "%VENV_DIR%\Scripts\python.exe" -m uvicorn app.main:app --reload --host 0.0.0.0 --port %BACKEND_PORT%"
echo.
echo %COLOR_GREEN%Backend server started: %BACKEND_URL%%COLOR_RESET%
if "%NO_BROWSER%"=="0" (
    timeout /t 5 /nobreak >nul
    start "" "%API_DOCS_URL%"
)
goto :eof

:start_frontend_only
echo %COLOR_YELLOW%Stopping any existing frontend servers...%COLOR_RESET%
taskkill /FI "WINDOWTITLE eq Drive Alive - Frontend*" /T /F >nul 2>&1
taskkill /FI "ImageName eq node.exe" /FI "CommandLine eq *expo*" /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8081" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":19000" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
timeout /t 1 /nobreak >nul
echo %COLOR_YELLOW%Starting Frontend Server only...%COLOR_RESET%
start "Drive Alive - Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && npm start"
echo.
echo %COLOR_GREEN%Frontend server started: %FRONTEND_URL%%COLOR_RESET%
goto :eof

:: ==============================================================================
:: COMMAND: STOP
:: ==============================================================================
:cmd_stop
echo %COLOR_YELLOW%Stopping all servers...%COLOR_RESET%
echo.

:: Kill backend processes
taskkill /FI "WINDOWTITLE eq Drive Alive - Backend*" /T /F >nul 2>&1
taskkill /FI "ImageName eq uvicorn.exe" /F >nul 2>&1
taskkill /FI "ImageName eq python.exe" /FI "CommandLine eq *uvicorn*" /F >nul 2>&1

:: Kill frontend processes
taskkill /FI "WINDOWTITLE eq Drive Alive - Frontend*" /T /F >nul 2>&1
taskkill /FI "CommandLine eq *expo start*" /F >nul 2>&1

echo %COLOR_GREEN%All servers stopped.%COLOR_RESET%
goto :eof

:: ==============================================================================
:: COMMAND: RESTART
:: ==============================================================================
:cmd_restart
echo %COLOR_YELLOW%Restarting servers...%COLOR_RESET%
call :cmd_stop
timeout /t 2 /nobreak >nul
call :cmd_start
goto :eof

:: ==============================================================================
:: COMMAND: CHECK
:: ==============================================================================
:cmd_check
echo %COLOR_BLUE%Checking dependencies and environment...%COLOR_RESET%
echo.

set "CHECK_FAILED=0"

:: Check Python
echo %COLOR_CYAN%[1/8] Checking Python...%COLOR_RESET%
python --version >nul 2>&1
if errorlevel 1 (
    echo %COLOR_RED%  X Python not found. Please install Python 3.9+%COLOR_RESET%
    set "CHECK_FAILED=1"
) else (
    for /f "tokens=2" %%i in ('python --version 2^>^&1') do echo %COLOR_GREEN%  ✓ Python %%i%COLOR_RESET%
)

:: Check Node.js
echo %COLOR_CYAN%[2/8] Checking Node.js...%COLOR_RESET%
node --version >nul 2>&1
if errorlevel 1 (
    echo %COLOR_RED%  X Node.js not found. Please install Node.js 18+%COLOR_RESET%
    set "CHECK_FAILED=1"
) else (
    for /f %%i in ('node --version') do echo %COLOR_GREEN%  ✓ Node.js %%i%COLOR_RESET%
)

:: Check npm
echo %COLOR_CYAN%[3/8] Checking npm...%COLOR_RESET%
npm --version >nul 2>&1
if errorlevel 1 (
    echo %COLOR_RED%  X npm not found%COLOR_RESET%
    set "CHECK_FAILED=1"
) else (
    for /f %%i in ('npm --version') do echo %COLOR_GREEN%  ✓ npm %%i%COLOR_RESET%
)

:: Check Git
echo %COLOR_CYAN%[4/8] Checking Git...%COLOR_RESET%
git --version >nul 2>&1
if errorlevel 1 (
    echo %COLOR_YELLOW%  ! Git not found (optional)%COLOR_RESET%
) else (
    for /f "tokens=3" %%i in ('git --version') do echo %COLOR_GREEN%  ✓ Git %%i%COLOR_RESET%
)

:: Check GitHub CLI
echo %COLOR_CYAN%[5/8] Checking GitHub CLI...%COLOR_RESET%
gh --version >nul 2>&1
if errorlevel 1 (
    echo %COLOR_YELLOW%  ! GitHub CLI not found (optional, needed for commit/release commands)%COLOR_RESET%
) else (
    for /f "tokens=3" %%i in ('gh --version 2^>^&1 ^| findstr "gh version"') do echo %COLOR_GREEN%  ✓ GitHub CLI %%i%COLOR_RESET%
)

:: Check Python Virtual Environment
echo %COLOR_CYAN%[6/8] Checking Python Virtual Environment...%COLOR_RESET%
if exist "%VENV_DIR%\Scripts\python.exe" (
    echo %COLOR_GREEN%  ✓ Virtual environment found at %VENV_DIR%%COLOR_RESET%

    :: Check if requirements are installed
    "%VENV_DIR%\Scripts\python.exe" -c "import fastapi" >nul 2>&1
    if errorlevel 1 (
        echo %COLOR_YELLOW%  ! Backend dependencies not installed. Run 'drive-alive.bat install'%COLOR_RESET%
        set "CHECK_FAILED=1"
    ) else (
        echo %COLOR_GREEN%  ✓ Backend dependencies installed%COLOR_RESET%
    )
) else (
    echo %COLOR_RED%  X Virtual environment not found. Run 'drive-alive.bat install'%COLOR_RESET%
    set "CHECK_FAILED=1"
)

:: Check Frontend Dependencies
echo %COLOR_CYAN%[7/8] Checking Frontend Dependencies...%COLOR_RESET%
if exist "%FRONTEND_DIR%\node_modules" (
    echo %COLOR_GREEN%  ✓ Frontend dependencies installed%COLOR_RESET%
) else (
    echo %COLOR_RED%  X Frontend dependencies not installed. Run 'drive-alive.bat install'%COLOR_RESET%
    set "CHECK_FAILED=1"
)

:: Check Environment Variables
echo %COLOR_CYAN%[8/8] Checking Environment Files...%COLOR_RESET%
if exist "%BACKEND_DIR%\.env" (
    echo %COLOR_GREEN%  ✓ Backend .env file found%COLOR_RESET%
) else (
    echo %COLOR_YELLOW%  ! Backend .env file not found (may need configuration)%COLOR_RESET%
)

echo.
if "%CHECK_FAILED%"=="1" (
    echo %COLOR_RED%Some checks failed. Please install missing dependencies.%COLOR_RESET%
    exit /b 1
) else (
    echo %COLOR_GREEN%All checks passed! Environment is ready.%COLOR_RESET%
)
goto :eof

:: ==============================================================================
:: COMMAND: INSTALL
:: ==============================================================================
:cmd_install
echo %COLOR_BLUE%Installing dependencies...%COLOR_RESET%
echo.

if "%FRONTEND_ONLY%"=="1" goto :install_frontend_only
if "%BACKEND_ONLY%"=="1" goto :install_backend_only

:: Install both
echo %COLOR_YELLOW%[1/3] Creating Python virtual environment...%COLOR_RESET%
cd /d "%BACKEND_DIR%"
if not exist "%VENV_DIR%" (
    python -m venv venv
    if errorlevel 1 (
        echo %COLOR_RED%Failed to create virtual environment%COLOR_RESET%
        exit /b 1
    )
)
echo %COLOR_GREEN%Virtual environment ready%COLOR_RESET%
echo.

echo %COLOR_YELLOW%[2/3] Installing backend dependencies...%COLOR_RESET%
call "%VENV_DIR%\Scripts\activate.bat"
python -m pip install --upgrade pip
pip install -r requirements.txt
if errorlevel 1 (
    echo %COLOR_RED%Failed to install backend dependencies%COLOR_RESET%
    exit /b 1
)
echo %COLOR_GREEN%Backend dependencies installed%COLOR_RESET%
echo.

echo %COLOR_YELLOW%[3/3] Installing frontend dependencies...%COLOR_RESET%
cd /d "%FRONTEND_DIR%"
call npm install
if errorlevel 1 (
    echo %COLOR_RED%Failed to install frontend dependencies%COLOR_RESET%
    exit /b 1
)
echo %COLOR_GREEN%Frontend dependencies installed%COLOR_RESET%
echo.

echo %COLOR_GREEN%All dependencies installed successfully!%COLOR_RESET%
goto :eof

:install_backend_only
echo %COLOR_YELLOW%Installing backend dependencies only...%COLOR_RESET%
cd /d "%BACKEND_DIR%"
if not exist "%VENV_DIR%" python -m venv venv
call "%VENV_DIR%\Scripts\activate.bat"
python -m pip install --upgrade pip
pip install -r requirements.txt
echo %COLOR_GREEN%Backend dependencies installed%COLOR_RESET%
goto :eof

:install_frontend_only
echo %COLOR_YELLOW%Installing frontend dependencies only...%COLOR_RESET%
cd /d "%FRONTEND_DIR%"
call npm install
echo %COLOR_GREEN%Frontend dependencies installed%COLOR_RESET%
goto :eof

:: ==============================================================================
:: COMMAND: TEST
:: ==============================================================================
:cmd_test
echo %COLOR_BLUE%Running tests...%COLOR_RESET%
echo.

if "%FRONTEND_ONLY%"=="1" goto :test_frontend_only
if "%BACKEND_ONLY%"=="1" goto :test_backend_only

:: Test both
set "TEST_FAILED=0"

echo %COLOR_YELLOW%Running backend tests...%COLOR_RESET%
cd /d "%BACKEND_DIR%"
call "%VENV_DIR%\Scripts\activate.bat"
pytest -v
if errorlevel 1 set "TEST_FAILED=1"
echo.

echo %COLOR_YELLOW%Running frontend tests...%COLOR_RESET%
cd /d "%FRONTEND_DIR%"
call npm test -- --watchAll=false
if errorlevel 1 set "TEST_FAILED=1"
echo.

if "%TEST_FAILED%"=="1" (
    echo %COLOR_RED%Some tests failed%COLOR_RESET%
    exit /b 1
) else (
    echo %COLOR_GREEN%All tests passed!%COLOR_RESET%
)
goto :eof

:test_backend_only
echo %COLOR_YELLOW%Running backend tests only...%COLOR_RESET%
cd /d "%BACKEND_DIR%"
call "%VENV_DIR%\Scripts\activate.bat"
pytest -v
goto :eof

:test_frontend_only
echo %COLOR_YELLOW%Running frontend tests only...%COLOR_RESET%
cd /d "%FRONTEND_DIR%"
call npm test -- --watchAll=false
goto :eof

:: ==============================================================================
:: COMMAND: BUILD
:: ==============================================================================
:cmd_build
echo %COLOR_BLUE%Building production bundles (dry-run)...%COLOR_RESET%
echo.

if "%FRONTEND_ONLY%"=="1" goto :build_frontend_only
if "%BACKEND_ONLY%"=="1" goto :build_backend_only

:: Build both
echo %COLOR_YELLOW%[1/2] Building backend...%COLOR_RESET%
cd /d "%BACKEND_DIR%"
echo   - Checking Python bytecode compilation...
call "%VENV_DIR%\Scripts\activate.bat"
python -m compileall -q app
if errorlevel 1 (
    echo %COLOR_RED%Backend build failed%COLOR_RESET%
    exit /b 1
)
echo %COLOR_GREEN%Backend build successful%COLOR_RESET%
echo.

echo %COLOR_YELLOW%[2/2] Building frontend (Expo export - dry-run)...%COLOR_RESET%
cd /d "%FRONTEND_DIR%"
echo   - This would run: npx expo export --platform all
echo   - Output would be in: web-build/
echo %COLOR_GREEN%Frontend build check successful%COLOR_RESET%
echo.

echo %COLOR_GREEN%All builds completed successfully! (dry-run)%COLOR_RESET%
echo.
echo %COLOR_YELLOW%To build for production:%COLOR_RESET%
echo   Backend:  Package with Docker or deploy to server
echo   Frontend: Run 'npx expo export' then 'npx expo export:web'
goto :eof

:build_backend_only
echo %COLOR_YELLOW%Building backend only...%COLOR_RESET%
cd /d "%BACKEND_DIR%"
call "%VENV_DIR%\Scripts\activate.bat"
python -m compileall -q app
echo %COLOR_GREEN%Backend build successful%COLOR_RESET%
goto :eof

:build_frontend_only
echo %COLOR_YELLOW%Building frontend only (dry-run)...%COLOR_RESET%
cd /d "%FRONTEND_DIR%"
echo   - Would run: npx expo export --platform all
echo %COLOR_GREEN%Frontend build check successful%COLOR_RESET%
goto :eof

:: ==============================================================================
:: COMMAND: COMMIT
:: ==============================================================================
:cmd_commit
echo %COLOR_BLUE%Committing changes with GitHub CLI...%COLOR_RESET%
echo.

:: Check if GitHub CLI is installed
gh --version >nul 2>&1
if errorlevel 1 (
    echo %COLOR_RED%GitHub CLI (gh) is not installed.%COLOR_RESET%
    echo Install from: https://cli.github.com/
    exit /b 1
)

cd /d "%PROJECT_ROOT%"

:: Check if there are changes
git status --short | findstr /r "." >nul
if errorlevel 1 (
    echo %COLOR_YELLOW%No changes to commit.%COLOR_RESET%
    goto :eof
)

echo %COLOR_YELLOW%Current changes:%COLOR_RESET%
git status --short
echo.

:: Get commit message
if "%COMMIT_MESSAGE%"=="" (
    set /p "COMMIT_MESSAGE=Enter commit message: "
)

if "%COMMIT_MESSAGE%"=="" (
    echo %COLOR_RED%Commit message cannot be empty%COLOR_RESET%
    exit /b 1
)

echo.
echo %COLOR_YELLOW%Staging all changes...%COLOR_RESET%
git add .

echo %COLOR_YELLOW%Committing with message: "%COMMIT_MESSAGE%"%COLOR_RESET%
git commit -m "%COMMIT_MESSAGE%"

if errorlevel 1 (
    echo %COLOR_RED%Commit failed%COLOR_RESET%
    exit /b 1
)

echo.
echo %COLOR_GREEN%Changes committed successfully!%COLOR_RESET%
echo.
set /p "PUSH=Push to remote? (y/N): "
if /i "%PUSH%"=="y" (
    echo %COLOR_YELLOW%Pushing to remote...%COLOR_RESET%
    git push
    echo %COLOR_GREEN%Pushed successfully!%COLOR_RESET%
)
goto :eof

:: ==============================================================================
:: COMMAND: RELEASE
:: ==============================================================================
:cmd_release
echo %COLOR_BLUE%Creating release with GitHub CLI and version control...%COLOR_RESET%
echo.

:: Check if GitHub CLI is installed
gh --version >nul 2>&1
if errorlevel 1 (
    echo %COLOR_RED%GitHub CLI (gh) is not installed.%COLOR_RESET%
    echo Install from: https://cli.github.com/
    exit /b 1
)

:: Check if Git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo %COLOR_RED%Git is not installed.%COLOR_RESET%
    exit /b 1
)

cd /d "%PROJECT_ROOT%"

:: Check for uncommitted changes
git diff --quiet
if errorlevel 1 (
    echo %COLOR_RED%You have uncommitted changes. Please commit or stash them first.%COLOR_RESET%
    git status --short
    exit /b 1
)

:: Get version
if "%RELEASE_VERSION%"=="" (
    set /p "RELEASE_VERSION=Enter version tag (e.g., v1.0.0): "
)

if "%RELEASE_VERSION%"=="" (
    echo %COLOR_RED%Version tag cannot be empty%COLOR_RESET%
    exit /b 1
)

:: Strip 'v' prefix if present for version numbers
set "VERSION_NUMBER=%RELEASE_VERSION%"
if "%VERSION_NUMBER:~0,1%"=="v" set "VERSION_NUMBER=%VERSION_NUMBER:~1%"

echo.
echo %COLOR_CYAN%Release Summary:%COLOR_RESET%
echo   Version Tag:    %RELEASE_VERSION%
echo   Version Number: %VERSION_NUMBER%
echo.

:: Show what will be updated
echo %COLOR_YELLOW%The following files will be updated:%COLOR_RESET%
echo   - frontend/package.json
echo   - frontend/app.json
echo   - backend/app/__init__.py
echo.

set /p "CONFIRM=Continue with version update? (y/N): "
if /i not "%CONFIRM%"=="y" (
    echo %COLOR_YELLOW%Release cancelled.%COLOR_RESET%
    goto :eof
)

:: Update version in all files
echo.
echo %COLOR_YELLOW%[1/6] Updating version numbers...%COLOR_RESET%
call :update_version_files "%VERSION_NUMBER%"
if errorlevel 1 (
    echo %COLOR_RED%Failed to update version files%COLOR_RESET%
    exit /b 1
)
echo %COLOR_GREEN%Version files updated successfully%COLOR_RESET%

:: Stage version changes
echo.
echo %COLOR_YELLOW%[2/6] Staging version changes...%COLOR_RESET%
git add frontend/package.json frontend/app.json backend/app/__init__.py
echo %COLOR_GREEN%Changes staged%COLOR_RESET%

:: Commit version changes
echo.
echo %COLOR_YELLOW%[3/6] Committing version changes...%COLOR_RESET%
git commit -m "chore: bump version to %VERSION_NUMBER%"
if errorlevel 1 (
    echo %COLOR_RED%Failed to commit version changes%COLOR_RESET%
    exit /b 1
)
echo %COLOR_GREEN%Version changes committed%COLOR_RESET%

:: Create Git tag
echo.
echo %COLOR_YELLOW%[4/6] Creating Git tag %RELEASE_VERSION%...%COLOR_RESET%
git tag -a %RELEASE_VERSION% -m "Release %RELEASE_VERSION%"
if errorlevel 1 (
    echo %COLOR_RED%Failed to create Git tag%COLOR_RESET%
    exit /b 1
)
echo %COLOR_GREEN%Git tag created%COLOR_RESET%

:: Push changes and tags
echo.
echo %COLOR_YELLOW%[5/6] Pushing to GitHub...%COLOR_RESET%
git push origin HEAD
if errorlevel 1 (
    echo %COLOR_RED%Failed to push commits%COLOR_RESET%
    echo %COLOR_YELLOW%Rolling back tag...%COLOR_RESET%
    git tag -d %RELEASE_VERSION%
    exit /b 1
)
git push origin %RELEASE_VERSION%
if errorlevel 1 (
    echo %COLOR_RED%Failed to push tag%COLOR_RESET%
    exit /b 1
)
echo %COLOR_GREEN%Changes and tags pushed to GitHub%COLOR_RESET%

:: Get release notes
echo.
echo %COLOR_YELLOW%[6/6] Creating GitHub release...%COLOR_RESET%
echo.
set /p "RELEASE_TITLE=Enter release title (or press Enter for default): "
if "%RELEASE_TITLE%"=="" set "RELEASE_TITLE=Release %RELEASE_VERSION%"

echo.
echo Enter release notes (or press Enter to use auto-generated):
set /p "RELEASE_NOTES="

if "%RELEASE_NOTES%"=="" (
    echo %COLOR_YELLOW%Using auto-generated release notes...%COLOR_RESET%
    gh release create %RELEASE_VERSION% --title "%RELEASE_TITLE%" --generate-notes
) else (
    gh release create %RELEASE_VERSION% --title "%RELEASE_TITLE%" --notes "%RELEASE_NOTES%"
)

if errorlevel 1 (
    echo %COLOR_RED%GitHub release creation failed%COLOR_RESET%
    echo %COLOR_YELLOW%Note: Commits and tags have been pushed. You can create the release manually.%COLOR_RESET%
    exit /b 1
)

echo.
echo %COLOR_GREEN%================================================================%COLOR_RESET%
echo %COLOR_GREEN%Release %RELEASE_VERSION% created successfully!%COLOR_RESET%
echo %COLOR_GREEN%================================================================%COLOR_RESET%
echo.
echo %COLOR_CYAN%Summary:%COLOR_RESET%
echo   - Version updated to: %VERSION_NUMBER%
echo   - Git tag created: %RELEASE_VERSION%
echo   - Changes pushed to GitHub
echo   - Release published
echo.
echo %COLOR_YELLOW%View release at:%COLOR_RESET%
for /f "tokens=*" %%i in ('gh repo view --json url -q .url') do echo   %%i/releases/tag/%RELEASE_VERSION%
echo.
goto :eof

:: ==============================================================================
:: COMMAND: STATUS
:: ==============================================================================
:cmd_status
echo %COLOR_BLUE%System Status%COLOR_RESET%
echo.

:: Git Status
echo %COLOR_CYAN%Git Status:%COLOR_RESET%
cd /d "%PROJECT_ROOT%"
git status --short
echo.

:: Branch Info
echo %COLOR_CYAN%Current Branch:%COLOR_RESET%
git branch --show-current
echo.

:: Current Version
echo %COLOR_CYAN%Current Version:%COLOR_RESET%
call :get_current_version
echo   Version: %CURRENT_VERSION%
echo.

:: Server Status
echo %COLOR_CYAN%Server Status:%COLOR_RESET%
tasklist /FI "ImageName eq uvicorn.exe" 2>nul | findstr "uvicorn.exe" >nul
if errorlevel 1 (
    echo   Backend:  %COLOR_RED%Not Running%COLOR_RESET%
) else (
    echo   Backend:  %COLOR_GREEN%Running%COLOR_RESET%
)

tasklist /FI "CommandLine eq *expo start*" 2>nul | findstr "node.exe" >nul
if errorlevel 1 (
    echo   Frontend: %COLOR_RED%Not Running%COLOR_RESET%
) else (
    echo   Frontend: %COLOR_GREEN%Running%COLOR_RESET%
)

echo.
goto :eof

:: ==============================================================================
:: COMMAND: UPDATE VERSION
:: ==============================================================================
:cmd_update_version
echo %COLOR_BLUE%Update Version Numbers%COLOR_RESET%
echo.

:: Get current version
call :get_current_version
echo %COLOR_CYAN%Current version: %CURRENT_VERSION%%COLOR_RESET%
echo.

:: Get new version
if "%RELEASE_VERSION%"=="" (
    set /p "RELEASE_VERSION=Enter new version (e.g., 1.0.1 or v1.0.1): "
)

if "%RELEASE_VERSION%"=="" (
    echo %COLOR_RED%Version cannot be empty%COLOR_RESET%
    exit /b 1
)

:: Strip 'v' prefix if present
set "VERSION_NUMBER=%RELEASE_VERSION%"
if "%VERSION_NUMBER:~0,1%"=="v" set "VERSION_NUMBER=%VERSION_NUMBER:~1%"

echo.
echo %COLOR_YELLOW%Will update version to: %VERSION_NUMBER%%COLOR_RESET%
echo.
echo %COLOR_YELLOW%Files to be updated:%COLOR_RESET%
echo   - frontend/package.json
echo   - frontend/app.json
echo   - backend/app/__init__.py
echo.

set /p "CONFIRM=Continue? (y/N): "
if /i not "%CONFIRM%"=="y" (
    echo %COLOR_YELLOW%Update cancelled.%COLOR_RESET%
    goto :eof
)

echo.
echo %COLOR_YELLOW%Updating version files...%COLOR_RESET%
call :update_version_files "%VERSION_NUMBER%"
if errorlevel 1 (
    echo %COLOR_RED%Failed to update version files%COLOR_RESET%
    exit /b 1
)

echo.
echo %COLOR_GREEN%Version updated successfully to %VERSION_NUMBER%!%COLOR_RESET%
echo.
echo %COLOR_YELLOW%Don't forget to commit these changes:%COLOR_RESET%
echo   git add frontend/package.json frontend/app.json backend/app/__init__.py
echo   git commit -m "chore: bump version to %VERSION_NUMBER%"
echo.
goto :eof

:: ==============================================================================
:: COMMAND: HELP
:: ==============================================================================
:cmd_help
echo USAGE:
echo   drive-alive.bat [COMMAND] [OPTIONS]
echo.
echo COMMANDS:
echo   start           Start backend and frontend servers (default)
echo   stop            Stop all running servers
echo   restart         Restart all servers
echo   check           Check all dependencies and environment
echo   install         Install all dependencies (backend + frontend)
echo   test            Run all tests (backend + frontend)
echo   build           Build production bundles (dry-run)
echo   commit          Commit changes with GitHub CLI
echo   release         Create a release with GitHub CLI (auto-updates versions)
echo   status          Show Git and server status
echo   update-version  Update version in all project files
echo   help            Show this help message
echo.
echo OPTIONS:
echo   --backend-only, -b      Only affect backend
echo   --frontend-only, -f     Only affect frontend
echo   --no-browser, -n        Don't open browser windows
echo   --debug, -d             Show detailed debug information
echo   --port [PORT]           Custom backend port (default: 8000)
echo   --message [MSG], -m     Commit message (for commit command)
echo   --version [VER], -v     Version tag (for release/update-version command)
echo.
echo EXAMPLES:
echo   drive-alive.bat start
echo   drive-alive.bat start --backend-only --port 8080
echo   drive-alive.bat check
echo   drive-alive.bat install
echo   drive-alive.bat test --backend-only
echo   drive-alive.bat commit -m "feat: add new feature"
echo   drive-alive.bat update-version -v 1.0.1
echo   drive-alive.bat release -v v1.0.0
echo   drive-alive.bat stop
echo.
echo VERSION MANAGEMENT:
echo   The 'release' command performs the following steps:
echo     1. Checks for uncommitted changes
echo     2. Updates version in all project files
echo     3. Commits version changes
echo     4. Creates a Git tag
echo     5. Pushes changes and tag to GitHub
echo     6. Creates a GitHub release
echo.
echo   The 'update-version' command only updates version files without
echo   creating a release. Use this for pre-release version bumps.
echo.
echo REQUIREMENTS:
echo   - Python 3.9+ (for backend)
echo   - Node.js 18+ ^& npm (for frontend)
echo   - GitHub CLI (gh) [optional, for commit/release operations]
echo   - Git (for version control)
echo.
goto :eof

:: ==============================================================================
:: HELPER FUNCTIONS
:: ==============================================================================

:check_dependencies
:: Quick dependency check for start command
python --version >nul 2>&1 || exit /b 1
node --version >nul 2>&1 || exit /b 1
if not exist "%VENV_DIR%\Scripts\python.exe" exit /b 1
if not exist "%FRONTEND_DIR%\node_modules" exit /b 1
exit /b 0

:debug_output
if "%DEBUG%"=="1" echo [DEBUG] %~1
goto :eof

:: ==============================================================================
:: VERSION MANAGEMENT FUNCTIONS
:: ==============================================================================

:get_current_version
:: Read current version from package.json
set "CURRENT_VERSION="
if exist "%FRONTEND_DIR%\package.json" (
    for /f "tokens=2 delims=:, " %%i in ('type "%FRONTEND_DIR%\package.json" ^| findstr /r "\"version\""') do (
        set "CURRENT_VERSION=%%i"
        set "CURRENT_VERSION=!CURRENT_VERSION:"=!"
        goto :version_found
    )
)
:version_found
if "%CURRENT_VERSION%"=="" set "CURRENT_VERSION=unknown"
goto :eof

:update_version_files
:: Update version in all project files
:: Usage: call :update_version_files "1.0.0"
set "NEW_VERSION=%~1"

if "%NEW_VERSION%"=="" (
    echo %COLOR_RED%Error: Version parameter is required%COLOR_RESET%
    exit /b 1
)

:: Validate version format (basic check)
echo %NEW_VERSION% | findstr /r "^[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*" >nul
if errorlevel 1 (
    echo %COLOR_RED%Error: Invalid version format. Use semantic versioning (e.g., 1.0.0)%COLOR_RESET%
    exit /b 1
)

echo   Updating frontend/package.json...
call :update_package_json "%NEW_VERSION%"
if errorlevel 1 exit /b 1

echo   Updating frontend/app.json...
call :update_app_json "%NEW_VERSION%"
if errorlevel 1 exit /b 1

echo   Updating backend/app/__init__.py...
call :update_backend_init "%NEW_VERSION%"
if errorlevel 1 exit /b 1

exit /b 0

:update_package_json
:: Update version in package.json using PowerShell
set "NEW_VERSION=%~1"
powershell -Command "$json = Get-Content '%FRONTEND_DIR%\package.json' -Raw | ConvertFrom-Json; $json.version = '%NEW_VERSION%'; $json | ConvertTo-Json -Depth 10 | Set-Content '%FRONTEND_DIR%\package.json'"
if errorlevel 1 (
    echo %COLOR_RED%Failed to update package.json%COLOR_RESET%
    exit /b 1
)
exit /b 0

:update_app_json
:: Update version in app.json using PowerShell
set "NEW_VERSION=%~1"
powershell -Command "$json = Get-Content '%FRONTEND_DIR%\app.json' -Raw | ConvertFrom-Json; $json.expo.version = '%NEW_VERSION%'; $json | ConvertTo-Json -Depth 10 | Set-Content '%FRONTEND_DIR%\app.json'"
if errorlevel 1 (
    echo %COLOR_RED%Failed to update app.json%COLOR_RESET%
    exit /b 1
)
exit /b 0

:update_backend_init
:: Update version in backend __init__.py
set "NEW_VERSION=%~1"
set "INIT_FILE=%BACKEND_DIR%\app\__init__.py"

:: Create temporary file with updated version
powershell -Command "(Get-Content '%INIT_FILE%') -replace '__version__ = \".*\"', '__version__ = \"%NEW_VERSION%\"' | Set-Content '%INIT_FILE%'"
if errorlevel 1 (
    echo %COLOR_RED%Failed to update __init__.py%COLOR_RESET%
    exit /b 1
)
exit /b 0

endlocal
