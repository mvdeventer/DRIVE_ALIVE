@echo off
echo Opening API Documentation...
start http://localhost:8000/docs
echo.
echo If the page doesn't load, make sure the backend server is running.
echo Run start-backend.bat to start the backend.
timeout /t 2 >nul
