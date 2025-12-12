@echo off
echo ========================================
echo Testing Backend (FastAPI)
echo ========================================
echo.

cd backend

echo [1/4] Checking virtual environment...
if exist "venv\Scripts\activate.bat" (
    echo [OK] Virtual environment exists
) else (
    echo [ERROR] Virtual environment not found!
    echo Run: cd backend ^&^& python -m venv venv ^&^& venv\Scripts\activate ^&^& pip install -r requirements.txt
    pause
    exit /b 1
)

echo.
echo [2/4] Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo [3/4] Checking if FastAPI is installed...
python -c "import fastapi" 2>nul
if errorlevel 1 (
    echo [ERROR] FastAPI not installed!
    echo Run: pip install -r requirements.txt
    pause
    exit /b 1
)
echo [OK] FastAPI is installed

echo.
echo [4/4] Starting backend server...
echo.
echo ========================================
echo Backend will start at: http://localhost:8000
echo API Docs at: http://localhost:8000/docs
echo ========================================
echo.
echo Press Ctrl+C to stop the server
echo.

cd app
uvicorn main:app --reload --host 0.0.0.0 --port 8000
