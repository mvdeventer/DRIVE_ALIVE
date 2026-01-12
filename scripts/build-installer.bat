@echo off
REM ============================================================================
REM Drive Alive Build Installer Script
REM Creates a complete Windows installer with backend and frontend
REM ============================================================================

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."
set "BUILD_DIR=%ROOT_DIR%\build"
set "DIST_DIR=%ROOT_DIR%\dist"
set "BACKEND_DIR=%ROOT_DIR%\backend"
set "FRONTEND_DIR=%ROOT_DIR%\frontend"

echo.
echo ============================================================================
echo Drive Alive - Build Installer
echo ============================================================================
echo.

REM Get current version
call "%SCRIPT_DIR%\version-manager.bat" get > temp_version.txt
set /p VERSION=<temp_version.txt
del temp_version.txt

echo Building version: %VERSION%
echo.

REM Create build directories
if not exist "%BUILD_DIR%" mkdir "%BUILD_DIR%"
if not exist "%DIST_DIR%" mkdir "%DIST_DIR%"

echo Step 1: Building Backend Executable
echo ------------------------------------
cd /d "%BACKEND_DIR%"

REM Check virtual environment
if not exist "venv\Scripts\python.exe" (
    echo Error: Virtual environment not found
    echo Please run: python -m venv venv
    exit /b 1
)

REM Use venv Python directly
set "VENV_PYTHON=%BACKEND_DIR%\venv\Scripts\python.exe"
set "VENV_PYINSTALLER=%BACKEND_DIR%\venv\Scripts\pyinstaller.exe"

echo Checking PyInstaller...

REM Install PyInstaller if not present
"%VENV_PYTHON%" -m pip show pyinstaller >nul 2>&1
if !errorlevel! neq 0 (
    echo Installing PyInstaller...
    "%VENV_PYTHON%" -m pip install pyinstaller
)

REM Build backend executable
echo Building backend executable...

REM Use PyInstaller from venv
if exist "%VENV_PYINSTALLER%" (
    "%VENV_PYINSTALLER%" drive-alive.spec --clean --noconfirm
) else (
    "%VENV_PYTHON%" -m PyInstaller drive-alive.spec --clean --noconfirm
)

if !errorlevel! neq 0 (
    echo Error: Backend build failed
    exit /b 1
)
echo [+] Backend executable built successfully

echo.
echo Step 2: Building Frontend Web Bundle
echo -------------------------------------
cd /d "%FRONTEND_DIR%"

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
)

REM Build web version
echo Building frontend web bundle...
call npx expo export:web

if !errorlevel! neq 0 (
    echo Error: Frontend build failed
    exit /b 1
)
echo [+] Frontend web bundle built successfully

echo.
echo Step 3: Creating Installer Package
echo -----------------------------------
cd /d "%ROOT_DIR%"

REM Check if Inno Setup is installed
where iscc >nul 2>&1
if !errorlevel! neq 0 (
    echo.
    echo Warning: Inno Setup not found
    echo Please install from: https://jrsoftware.org/isinfo.php
    echo.
    echo Skipping installer creation...
    echo You can manually create installer later using: scripts\installer.iss
) else (
    echo Creating Windows installer...
    iscc "scripts\installer.iss" /DAPP_VERSION=%VERSION%

    if !errorlevel! equ 0 (
        echo [+] Installer created successfully
        echo.
        echo Installer location: %DIST_DIR%\DriveAlive-Setup-%VERSION%.exe
    ) else (
        echo Error: Installer creation failed
        exit /b 1
    )
)

echo.
echo ============================================================================
echo Build Complete!
echo ============================================================================
echo.
echo Version: %VERSION%
echo Backend: %BACKEND_DIR%\dist\drive-alive-api.exe
echo Frontend: %FRONTEND_DIR%\web-build\
echo Installer: %DIST_DIR%\DriveAlive-Setup-%VERSION%.exe
echo.
echo Next steps:
echo   1. Test the installer on a clean machine
echo   2. Upload to release server
echo   3. Update documentation
echo.

cd /d "%ROOT_DIR%"
goto :EOF
