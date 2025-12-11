@echo off
title Install Dependencies
color 0C

echo ========================================
echo  INSTALLING DEPENDENCIES
echo ========================================
echo.

REM Get the project root directory
set PROJECT_ROOT=%~dp0..
cd /d "%PROJECT_ROOT%"

echo Project Root: %PROJECT_ROOT%
echo.

REM Check Python
echo [1/4] Checking Python...
python --version >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python not found!
    echo Please install Python 3.10+ from: https://www.python.org/downloads/
    pause
    exit /b 1
)
python --version
echo.

REM Check Node.js
echo [2/4] Checking Node.js...
node --version >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js 18+ from: https://nodejs.org/
    pause
    exit /b 1
)
node --version
echo.

REM Setup Python venv
echo [3/4] Setting up Python virtual environment...
if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
)
echo Activating venv and installing Python packages...
call .venv\Scripts\activate.bat
cd backend
python -m pip install --upgrade pip
pip install -r requirements.txt
cd ..
echo.

REM Install npm packages
echo [4/4] Installing frontend dependencies...
cd frontend
call npm install
cd ..
echo.

echo ========================================
echo  INSTALLATION COMPLETE!
echo ========================================
echo.
echo Next steps:
echo   1. Setup database: scripts\setup-database.bat
echo   2. Configure backend\.env file
echo   3. Start application: scripts\start-all.bat
echo.
pause
