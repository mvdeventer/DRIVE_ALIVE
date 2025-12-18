@echo off
title Driving School App Launcher
color 0A

echo ========================================
echo  DRIVING SCHOOL APP LAUNCHER
echo ========================================
echo.
echo Starting Backend and Frontend...
echo.

REM Get the project root directory (parent of scripts folder)
set PROJECT_ROOT=%~dp0..
cd /d "%PROJECT_ROOT%"

echo Project Root: %PROJECT_ROOT%
echo.

REM Check if virtual environment exists
if not exist ".venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment not found!
    echo Please run setup_venv.ps1 first.
    echo.
    pause
    exit /b 1
)

echo [1/2] Starting Backend Server...
start "Backend - FastAPI" cmd /k "cd /d "%PROJECT_ROOT%\backend" && "%PROJECT_ROOT%\.venv\Scripts\python.exe" -m uvicorn app.main:app --reload --port 8000"

timeout /t 2 /nobreak >nul

echo [2/2] Starting Frontend Server...
echo.
echo NOTE: Frontend requires npm packages to be installed first.
echo If this fails, you need to reinstall Node.js (npm is broken on your system).
echo.
start "Frontend - Expo" cmd /k "cd /d "%PROJECT_ROOT%\frontend" && npm start"

echo.
echo ========================================
echo  LAUNCH COMPLETE!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo Frontend: http://localhost:19006 (opens automatically)
echo.
echo Press 'w' in the Expo terminal to open in web browser
echo.
echo Two terminal windows have been opened:
echo   1. Backend - FastAPI (port 8000)
echo   2. Frontend - Expo (port 19006)
echo.
echo To stop servers: Close the terminal windows or press Ctrl+C
echo.
pause
