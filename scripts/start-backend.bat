@echo off
title Backend - FastAPI Server
color 0B

echo ========================================
echo  STARTING BACKEND SERVER
echo ========================================
echo.

REM Get the project root directory
set PROJECT_ROOT=%~dp0..
cd /d "%PROJECT_ROOT%"

REM Check if virtual environment exists
if not exist ".venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment not found!
    echo Please run setup_venv.ps1 first.
    echo.
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist "backend\.env" (
    echo [WARNING] .env file not found in backend directory!
    echo.
    echo Creating .env from .env.example...
    copy "backend\.env.example" "backend\.env" >nul
    echo.
    echo Please edit backend\.env with your configuration before continuing.
    echo.
    pause
)

echo Starting FastAPI Server...
echo.
cd "%PROJECT_ROOT%\backend\app"
"%PROJECT_ROOT%\.venv\Scripts\python.exe" -m uvicorn main:app --reload

pause
