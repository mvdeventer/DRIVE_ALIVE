@echo off
echo ========================================
echo Driving School App - Quick Start
echo ========================================
echo.

echo Checking Python...
python --version
if %errorlevel% neq 0 (
    echo ERROR: Python not found. Please install Python 3.10+
    pause
    exit /b 1
)

echo.
echo Checking Node.js...
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Please install Node.js 18+
    pause
    exit /b 1
)

echo.
echo ========================================
echo Setting up Backend...
echo ========================================
cd backend

echo Creating Python virtual environment...
if not exist "venv" (
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing Python dependencies...
pip install -r requirements.txt

echo.
echo Setting up environment file...
if not exist ".env" (
    copy .env.example .env
    echo Please edit backend\.env with your configuration!
)

cd ..

echo.
echo ========================================
echo Setting up Frontend...
echo ========================================
cd frontend

if not exist "node_modules" (
    echo Installing Node.js dependencies...
    call npm install
) else (
    echo Dependencies already installed!
)

cd ..

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo To start the backend:
echo   cd backend
echo   venv\Scripts\activate
echo   cd app
echo   uvicorn main:app --reload
echo.
echo To start the frontend:
echo   cd frontend
echo   npm start
echo.
echo Don't forget to:
echo 1. Setup PostgreSQL database
echo 2. Configure backend\.env file
echo 3. Update frontend\config.ts with your API URL
echo.
pause
