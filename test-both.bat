@echo off
echo ========================================
echo Starting Backend + Frontend
echo ========================================
echo.

echo This will open TWO terminal windows:
echo   1. Backend (FastAPI) on port 8000
echo   2. Frontend (Expo) on port 8081
echo.
pause

echo Starting backend in new window...
start "Backend API" cmd /k "cd /d C:\Projects\DRIVE_ALIVE && test-backend.bat"

timeout /t 5 /nobreak >nul

echo Starting frontend in new window...
start "Frontend Expo" cmd /k "cd /d C:\Projects\DRIVE_ALIVE && test-frontend.bat"

echo.
echo ========================================
echo Both servers starting!
echo ========================================
echo.
echo Backend: http://localhost:8000/docs
echo Frontend: http://localhost:8081
echo.
echo Close the terminal windows to stop the servers.
echo.
pause
