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
for %%A in (%*) do (
    if /i "%%A"=="--force"   set "FORCE=1"   & set "BOOTSTRAP_ARGS=!BOOTSTRAP_ARGS! --force"
    if /i "%%A"=="--offline" set "BOOTSTRAP_ARGS=!BOOTSTRAP_ARGS! --offline"
    if /i "%%A"=="--bundle"  set "BOOTSTRAP_ARGS=!BOOTSTRAP_ARGS! --bundle"
)

call :header

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
            :: Refresh PATH
            for /f "skip=2 tokens=3*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "PATH=%%a %%b;%PATH%"
            set "NODE_OK=1"
        )
    ) else (
        call :manual_install_prompt "Node.js 20 LTS" "https://nodejs.org/en/download"
        echo   [WARN] Frontend setup may fail without Node.js.
    )
)

:: ── STEP 4: Install Expo CLI globally (needed for frontend) ──────────────────
call :step_header "4" "5" "Installing Expo CLI"
npm list -g expo-cli >nul 2>&1
if !errorlevel! equ 0 (
    echo   [OK] expo-cli already installed globally.
) else (
    where npx >nul 2>&1
    if !errorlevel! equ 0 (
        echo   Installing expo-cli globally via npm...
        call npm install -g expo-cli --silent 2>nul
        call npm install -g eas-cli --silent 2>nul
        echo   [OK] expo-cli and eas-cli installed.
    ) else (
        echo   [WARN] npm not available - Expo CLI not installed.
        echo         Install Node.js first, then run: npm install -g expo-cli
    )
)

:: ── STEP 5: Run bootstrap.py (handles everything else) ───────────────────────
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
echo ─────────────────────────────────────────────────────────────
echo  STEP %~1 of %~2:  %~3
echo ─────────────────────────────────────────────────────────────
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
