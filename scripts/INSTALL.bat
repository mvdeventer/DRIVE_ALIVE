@echo off
setlocal enabledelayedexpansion
title Drive Alive - Installer

:: ==============================================================================
:: DRIVE ALIVE - Full Project Installer
:: ==============================================================================
::  Run this script once after cloning the repository on a new PC.
::  It will automatically install everything needed to run the project:
::
::    - Python 3.11          (via winget if missing)
::    - Node.js 20 LTS       (via winget if missing)
::    - Git                  (via winget if missing)
::    - PostgreSQL 16        (handled by bootstrap.py)
::    - Python venv + all pip packages from requirements.txt
::    - All npm packages from package.json
::    - .env file with secure auto-generated keys
::    - Database + tables
::
::  USAGE:
::    Double-click INSTALL.bat
::    -- OR --
::    scripts\INSTALL.bat             (normal full install)
::    scripts\INSTALL.bat --force     (re-run even if already installed)
::    scripts\INSTALL.bat --offline   (use vendor/ packages, no internet needed)
::    scripts\INSTALL.bat --bundle    (download packages to vendor/ for offline use)
::
:: ==============================================================================

:: ── Resolve project root (one level up from scripts\) ──────────────────────
set "PROJECT_ROOT=%~dp0.."


:: ── Parse arguments ──────────────────────────────────────────────────────────
set "BOOTSTRAP_ARGS="
set "FORCE=0"
set "UNINSTALL=0"
for %%A in (%*) do (
    if /i "%%A"=="--force"   set "FORCE=1"   & set "BOOTSTRAP_ARGS=!BOOTSTRAP_ARGS! --force"
    if /i "%%A"=="--offline" set "BOOTSTRAP_ARGS=!BOOTSTRAP_ARGS! --offline"
    if /i "%%A"=="--bundle"  set "BOOTSTRAP_ARGS=!BOOTSTRAP_ARGS! --bundle"
    if /i "%%A"=="--uninstall" set "UNINSTALL=1"
)

call :header

:: ── Uninstall mode ───────────────────────────────────────────────────────────
if "!UNINSTALL!"=="1" goto :uninstall
:uninstall
echo -------------------------------------------------------------
echo  DRIVE ALIVE - UNINSTALLER
echo -------------------------------------------------------------
echo.
echo   This will REMOVE all generated files, environments, and config:
echo     - backend\venv
echo     - frontend\node_modules
echo     - build\, dist\, backend\dist\
echo     - .installed marker
echo     - Optionally: backend\.env
echo     - Optionally: DROP the PostgreSQL database
echo.
set /p "CONFIRM=Are you sure you want to uninstall everything? (y/N): "
if /i not "!CONFIRM!"=="y" (
    echo   Aborted.
    exit /b 1
)

echo   Removing backend\venv ...
rmdir /s /q "%PROJECT_ROOT%\backend\venv" 2>nul
echo   Removing frontend\node_modules ...
rmdir /s /q "%PROJECT_ROOT%\frontend\node_modules" 2>nul
echo   Removing build\ ...
rmdir /s /q "%PROJECT_ROOT%\build" 2>nul
echo   Removing dist\ ...
rmdir /s /q "%PROJECT_ROOT%\dist" 2>nul
echo   Removing backend\dist\ ...
rmdir /s /q "%PROJECT_ROOT%\backend\dist" 2>nul
echo   Removing .installed marker ...
del /f /q "%PROJECT_ROOT%\.installed" 2>nul

if exist "%PROJECT_ROOT%\backend\.env" (
    set /p "DELENV=Delete backend\.env file? (y/N): "
    if /i "!DELENV!"=="y" del /f /q "%PROJECT_ROOT%\backend\.env"
)

set /p "DROPDB=Drop the PostgreSQL database (driving_school_db)? (y/N): "
if /i "!DROPDB!"=="y" (
    echo   Attempting to drop database 'driving_school_db' (requires psql)...
    set "PGUSER=postgres"
    set "PGDB=driving_school_db"
    set /p "PGUSER=Enter PostgreSQL superuser (default: postgres): "
    if "!PGUSER!"=="" set "PGUSER=postgres"
    set /p "PGPORT=Enter PostgreSQL port (default: 5432): "
    if "!PGPORT!"=="" set "PGPORT=5432"
    set /p "PGHOST=Enter PostgreSQL host (default: localhost): "
    if "!PGHOST!"=="" set "PGHOST=localhost"
    set /p "PGPASS=Enter PostgreSQL password (leave blank to prompt): "
    set "PGPASSFILE=%TEMP%\pgpass.txt"
    if not "!PGPASS!"=="" echo !PGHOST!:!PGPORT!:*:%PGUSER%:!PGPASS! > !PGPASSFILE!
    set "PGPASSFILE_ARG="
    if exist "!PGPASSFILE!" set "PGPASSFILE_ARG=--no-password --username=%PGUSER% --host=%PGHOST% --port=%PGPORT% --file=!PGPASSFILE!"
    echo   Terminating connections and dropping database...
    setlocal
    set PGPASSWORD=!PGPASS!
    psql -U !PGUSER! -h !PGHOST! -p !PGPORT! -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='driving_school_db';" postgres
    psql -U !PGUSER! -h !PGHOST! -p !PGPORT! -c "DROP DATABASE IF EXISTS driving_school_db;" postgres
    endlocal
    if exist "!PGPASSFILE!" del /f /q "!PGPASSFILE!"
)

echo.
echo   Uninstall complete.
echo.
pause
exit /b 0

:: ── Check if already installed (skip unless --force) ─────────────────────────
if "!FORCE!"=="0" (
    if exist "%PROJECT_ROOT%\.installed" (
        echo.
        echo  Drive Alive is already installed on this machine.
        echo  Run "s.bat" to start the application.
        echo.
        echo  To re-run the installer:  scripts\INSTALL.bat --force
        echo.
        pause
        exit /b 0
    )
)

:: ── Winget availability ───────────────────────────────────────────────────────
set "HAS_WINGET=0"
winget --version >nul 2>&1
if !errorlevel! equ 0 set "HAS_WINGET=1"

:: ── STEP 1: Ensure Git is available ──────────────────────────────────────────
call :step_header "1" "5" "Checking Git"
git --version >nul 2>&1
if !errorlevel! equ 0 (
    for /f "tokens=*" %%v in ('git --version 2^>nul') do echo   [OK] %%v
) else (
    echo   [WARN] Git is not installed.
    if "!HAS_WINGET!"=="1" (
        echo   Installing Git via winget...
        winget install --id Git.Git -e --source winget --silent --accept-package-agreements --accept-source-agreements
        if !errorlevel! neq 0 (
            call :manual_install_prompt "Git" "https://git-scm.com/download/win"
        ) else (
            echo   [OK] Git installed - you may need to restart this script.
            :: Refresh PATH for current session
            for /f "skip=2 tokens=3*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do (
                set "PATH=%%a %%b;%PATH%"
            )
        )
    ) else (
        call :manual_install_prompt "Git" "https://git-scm.com/download/win"
    )
)

:: ── STEP 2: Ensure Python 3.9+ is available ──────────────────────────────────
call :step_header "2" "5" "Checking Python"
set "PYTHON_CMD="
set "PYTHON_OK=0"

:: Try common names in order of preference
for %%P in (python python3 py) do (
    if "!PYTHON_CMD!"=="" (
        %%P --version >nul 2>&1
        if !errorlevel! equ 0 (
            :: Verify version is 3.9+
            for /f "tokens=2" %%V in ('%%P --version 2^>^&1') do (
                for /f "tokens=1,2 delims=." %%M in ("%%V") do (
                    if %%M geq 3 (
                        if %%N geq 9 (
                            set "PYTHON_CMD=%%P"
                            set "PYTHON_OK=1"
                            echo   [OK] Python %%V ^(%%P^)
                        )
                    )
                )
            )
        )
    )
)

if "!PYTHON_OK!"=="0" (
    echo   [WARN] Python 3.9+ not found.
    if "!HAS_WINGET!"=="1" (
        echo   Installing Python 3.11 via winget...
        winget install --id Python.Python.3.11 -e --source winget --silent --accept-package-agreements --accept-source-agreements
        if !errorlevel! neq 0 (
            call :manual_install_prompt "Python 3.11" "https://www.python.org/downloads/"
            goto :python_missing
        )
        echo   [OK] Python installed.
        :: Refresh PATH
        for /f "skip=2 tokens=3*" %%a in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "PATH=%%a %%b;%PATH%"
        set "PYTHON_CMD=python"
        set "PYTHON_OK=1"
    ) else (
        call :manual_install_prompt "Python 3.11" "https://www.python.org/downloads/"
        goto :python_missing
    )
)
goto :python_ready

:python_missing
echo.
echo  [ERROR] Python is required to continue. Install it and re-run INSTALL.bat.
echo.
pause
exit /b 1

:python_ready

:: ── STEP 3: Ensure Node.js 18+ is available ──────────────────────────────────
call :step_header "3" "5" "Checking Node.js"
set "NODE_OK=0"
node --version >nul 2>&1
if !errorlevel! equ 0 (
    for /f "tokens=1" %%V in ('node --version 2^>^&1') do (
        set "NODE_VER=%%V"
        set "NODE_VER=!NODE_VER:v=!"
    )
    for /f "tokens=1 delims=." %%M in ("!NODE_VER!") do (
        if %%M geq 18 (
            set "NODE_OK=1"
            echo   [OK] Node.js v!NODE_VER!
        ) else (
            echo   [WARN] Node.js v!NODE_VER! found but v18+ required.
        )
    )
)

if "!NODE_OK!"=="0" (
    if "!HAS_WINGET!"=="1" (
        echo   Installing Node.js 20 LTS via winget...
        winget install --id OpenJS.NodeJS.LTS -e --source winget --silent --accept-package-agreements --accept-source-agreements
        if !errorlevel! neq 0 (
            call :manual_install_prompt "Node.js 20 LTS" "https://nodejs.org/en/download"
        ) else (
            echo   [OK] Node.js installed.
            :: Hard-add known Node.js install locations to current session PATH
            if exist "C:\Program Files\nodejs\npm.cmd" (
                set "PATH=C:\Program Files\nodejs;!PATH!"
            )
            if exist "C:\Program Files\nodejs\npx.cmd" (
                set "PATH=C:\Program Files\nodejs;!PATH!"
            )
            :: Also try refreshing from registry
            for /f "skip=2 tokens=3*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "PATH=%%a %%b;!PATH!"
            set "NODE_OK=1"
        )
    ) else (
        call :manual_install_prompt "Node.js 20 LTS" "https://nodejs.org/en/download"
        echo   [WARN] Frontend setup may fail without Node.js.
    )
)

:: ── STEP 4: Install Expo CLI globally (needed for frontend) ──────────────────
call :step_header "4" "5" "Installing Expo CLI"
npm list -g eas-cli >nul 2>&1
if !errorlevel! equ 0 (
    echo   [OK] eas-cli already installed globally.
) else (
    where npm >nul 2>&1
    if !errorlevel! equ 0 (
        echo   Installing eas-cli globally via npm (may take a minute)...
        call npm install -g eas-cli
        if !errorlevel! equ 0 (
            echo   [OK] eas-cli installed.
        ) else (
            echo   [WARN] eas-cli install failed - this is optional, continuing...
        )
    ) else (
        echo   [WARN] npm not in PATH yet.
        echo         If Node.js was just installed, please restart this script.
        echo         Or install manually:  npm install -g eas-cli
    )
)
echo   Note: expo-cli is used via npx - no global install needed.

:: ── STEP 5: Run bootstrap.py (handles everything else) ─────────────────────
call :step_header "5" "5" "Running Drive Alive bootstrap"
echo.
echo   This handles:
echo     - PostgreSQL install (if needed)
echo     - Python venv creation
echo     - pip install -r requirements.txt
echo     - npm install (frontend packages)
echo     - .env file generation with secure keys
echo     - Database creation ^& table init
echo.

if "!PYTHON_CMD!"=="" (
    echo   [WARN] Python command not detected in earlier steps.
    echo         Trying 'python' as fallback...
    set "PYTHON_CMD=python"
)

echo   Running: !PYTHON_CMD! bootstrap.py!BOOTSTRAP_ARGS!
echo.
!PYTHON_CMD! "%PROJECT_ROOT%\bootstrap.py"!BOOTSTRAP_ARGS!
set "BOOTSTRAP_EXIT=!errorlevel!"

:: ── Done ─────────────────────────────────────────────────────────────────────
echo.
echo ============================================================
if "!BOOTSTRAP_EXIT!"=="0" (
    echo   INSTALLATION COMPLETE
    echo ============================================================
    echo.
    echo   How to start the app:
    echo.
    echo     s.bat              Start both servers ^(auto-detect mode^)
    echo     s.bat -l           Start in localhost/HTTPS mode
    echo     s.bat -m           Start in mobile/network mode
    echo     s.bat -l -d        Start + open Edge with DevTools
    echo.
    echo   IMPORTANT - Before starting for the first time:
    echo     1. Open  backend\.env  and fill in your credentials:
    echo           DATABASE_URL  - your PostgreSQL connection string
    echo           SECRET_KEY    - auto-generated ^(already done^)
    echo           SMTP settings - for email verification
    echo           Twilio keys   - for WhatsApp reminders ^(optional^)
    echo           PayFast keys  - for payments ^(optional^)
    echo.
    echo     2. Run database migrations:
    echo           cd backend
    echo           venv\Scripts\activate
    echo           alembic upgrade head
    echo.
    echo     3. Then run:  s.bat
    echo.
) else (
    echo   INSTALLATION COMPLETED WITH WARNINGS
    echo ============================================================
    echo.
    echo   Some components may need manual attention (see details above).
    echo   Common fixes:
    echo     - PostgreSQL not installed: https://www.postgresql.org/download/windows/
    echo     - Node.js not installed:    https://nodejs.org/en/download
    echo.
    echo   After fixing any issues, re-run:  scripts\INSTALL.bat --force
    echo.
)

echo ============================================================
echo.
pause
exit /b !BOOTSTRAP_EXIT!


:: ==============================================================================
:: Helper subroutines
:: ==============================================================================

:header
echo.
echo  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
echo  @@                                                        @@
echo  @@          DRIVE ALIVE  -  Project Installer             @@
echo  @@                                                        @@
echo  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
echo.
echo  This script sets up everything needed to run Drive Alive
echo  on a fresh Windows PC.
echo.
goto :eof

:step_header
echo.
echo -------------------------------------------------------------
echo  STEP %~1 of %~2:  %~3
echo -------------------------------------------------------------
goto :eof

:manual_install_prompt
echo.
echo   ╔══════════════════════════════════════════════════════╗
echo   ║  ACTION REQUIRED: Install %~1
echo   ║  Download: %~2
echo   ║
echo   ║  After installation, close and re-run INSTALL.bat
echo   ╚══════════════════════════════════════════════════════╝
echo.
start "" "%~2"
goto :eof
