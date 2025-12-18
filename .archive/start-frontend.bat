@echo off
title Frontend - Expo Dev Server
color 0E

echo ========================================
echo  STARTING FRONTEND SERVER
echo ========================================
echo.

REM Get the project root directory
set PROJECT_ROOT=%~dp0..
cd /d "%PROJECT_ROOT%\frontend"

REM Check if node_modules exists
if not exist "node_modules" (
    echo [WARNING] node_modules not found!
    echo.
    echo Installing dependencies...
    call npm install
    echo.
)

echo Starting Expo Dev Server...
echo.
echo After starting, press 'w' to open in web browser
echo.
call npm start

pause
