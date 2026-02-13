@echo off
REM ============================================================================
REM Drive Alive - Bundle Packages for Offline Distribution
REM Downloads all dependencies into vendor/ for air-gapped installation
REM ============================================================================
REM
REM Usage:
REM   scripts\bundle-packages.bat          Download all packages for offline use
REM   scripts\bundle-packages.bat python   Download Python packages only
REM   scripts\bundle-packages.bat node     Download Node.js packages only
REM   scripts\bundle-packages.bat install  Download system installers only
REM
REM After bundling, copy the vendor/ directory to the target machine
REM and run: python bootstrap.py --offline
REM ============================================================================

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."
set "BACKEND_DIR=%ROOT_DIR%\backend"
set "FRONTEND_DIR=%ROOT_DIR%\frontend"
set "VENDOR_DIR=%ROOT_DIR%\vendor"
set "PYTHON_VENDOR=%VENDOR_DIR%\python"
set "NODE_VENDOR=%VENDOR_DIR%\node"
set "INSTALLER_VENDOR=%VENDOR_DIR%\installers"

echo.
echo ============================================================================
echo Drive Alive - Bundle Packages for Offline Distribution
echo ============================================================================
echo.

set "MODE=%~1"
if "%MODE%"=="" set "MODE=all"

REM ---- Python Packages ----
if /i "%MODE%"=="all" goto :bundle_python
if /i "%MODE%"=="python" goto :bundle_python
goto :skip_python

:bundle_python
echo [1/3] Downloading Python packages...
echo ----------------------------------------

if not exist "%PYTHON_VENDOR%" mkdir "%PYTHON_VENDOR%"

REM Get Python version for platform-specific downloads
for /f "tokens=2 delims= " %%v in ('python --version 2^>^&1') do set "PY_VERSION=%%v"
for /f "tokens=1,2 delims=." %%a in ("%PY_VERSION%") do (
    set "PY_MAJOR=%%a"
    set "PY_MINOR=%%b"
)

echo Python version: %PY_VERSION%
echo Downloading wheels for Python %PY_MAJOR%.%PY_MINOR% (win_amd64)...
echo.

REM Download binary wheels for Windows x64
python -m pip download ^
    -r "%BACKEND_DIR%\requirements.txt" ^
    -d "%PYTHON_VENDOR%" ^
    --platform win_amd64 ^
    --python-version %PY_MAJOR%.%PY_MINOR% ^
    --only-binary=:all: 2>nul

if !errorlevel! neq 0 (
    echo.
    echo Some binary-only downloads failed, retrying with source packages...
    python -m pip download ^
        -r "%BACKEND_DIR%\requirements.txt" ^
        -d "%PYTHON_VENDOR%"
)

REM Count downloaded files
set "PKG_COUNT=0"
for %%f in ("%PYTHON_VENDOR%\*.whl" "%PYTHON_VENDOR%\*.tar.gz" "%PYTHON_VENDOR%\*.zip") do set /a PKG_COUNT+=1
echo.
echo [OK] Downloaded %PKG_COUNT% Python packages to vendor\python\

:skip_python

REM ---- Node.js Packages ----
if /i "%MODE%"=="all" goto :bundle_node
if /i "%MODE%"=="node" goto :bundle_node
goto :skip_node

:bundle_node
echo.
echo [2/3] Creating Node.js packages archive...
echo ----------------------------------------

if not exist "%NODE_VENDOR%" mkdir "%NODE_VENDOR%"

if exist "%FRONTEND_DIR%\node_modules" (
    echo Compressing frontend\node_modules into vendor\node\node_modules.tar.gz...
    echo This may take several minutes...

    cd /d "%FRONTEND_DIR%"
    python -c "import tarfile; t = tarfile.open(r'%NODE_VENDOR%\node_modules.tar.gz', 'w:gz'); t.add('node_modules'); t.close(); print('Done')"

    if !errorlevel! equ 0 (
        for %%f in ("%NODE_VENDOR%\node_modules.tar.gz") do (
            set "SIZE=%%~zf"
            set /a "SIZE_MB=!SIZE! / 1048576"
            echo [OK] node_modules archived: !SIZE_MB! MB
        )
    ) else (
        echo [WARN] Failed to create node_modules archive
    )
) else (
    echo [WARN] frontend\node_modules not found
    echo        Run 'npm install' in frontend\ first, then re-run this script
)

:skip_node

REM ---- System Installers ----
if /i "%MODE%"=="all" goto :bundle_installers
if /i "%MODE%"=="install" goto :bundle_installers
goto :skip_installers

:bundle_installers
echo.
echo [3/3] Downloading system installers...
echo ----------------------------------------

if not exist "%INSTALLER_VENDOR%" mkdir "%INSTALLER_VENDOR%"

REM Download PostgreSQL installer
if not exist "%INSTALLER_VENDOR%\postgresql-installer.exe" (
    echo Downloading PostgreSQL 16.6 installer...
    python -c "import urllib.request; urllib.request.urlretrieve('https://get.enterprisedb.com/postgresql/postgresql-16.6-1-windows-x64.exe', r'%INSTALLER_VENDOR%\postgresql-installer.exe')"
    if !errorlevel! equ 0 (
        echo [OK] PostgreSQL installer downloaded
    ) else (
        echo [WARN] Failed to download PostgreSQL installer
    )
) else (
    echo [OK] PostgreSQL installer already present
)

REM Download Node.js installer
if not exist "%INSTALLER_VENDOR%\node-installer.msi" (
    echo Downloading Node.js v20.11.1 LTS installer...
    python -c "import urllib.request; urllib.request.urlretrieve('https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi', r'%INSTALLER_VENDOR%\node-installer.msi')"
    if !errorlevel! equ 0 (
        echo [OK] Node.js installer downloaded
    ) else (
        echo [WARN] Failed to download Node.js installer
    )
) else (
    echo [OK] Node.js installer already present
)

:skip_installers

REM ---- Summary ----
echo.
echo ============================================================================
echo Bundle Complete
echo ============================================================================

REM Calculate total size
set "TOTAL_SIZE=0"
if exist "%VENDOR_DIR%" (
    for /f "tokens=3" %%s in ('dir /s "%VENDOR_DIR%" 2^>nul ^| findstr /c:"File(s)"') do set "TOTAL_SIZE=%%s"
)

echo.
echo Contents:
if exist "%PYTHON_VENDOR%" (
    echo   vendor\python\       - Python wheel packages
)
if exist "%NODE_VENDOR%\node_modules.tar.gz" (
    echo   vendor\node\         - Node.js modules archive
)
if exist "%INSTALLER_VENDOR%" (
    echo   vendor\installers\   - PostgreSQL ^& Node.js installers
)
echo.
echo To install on a new machine:
echo   1. Copy the entire project folder (including vendor\) to the target
echo   2. Run: python bootstrap.py --offline
echo   3. Start: s.bat
echo.

cd /d "%ROOT_DIR%"
