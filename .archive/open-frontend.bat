@echo off
echo Opening Frontend Application...
start http://localhost:19006
echo.
echo If the page doesn't load, make sure the frontend server is running.
echo Run start-frontend.bat to start the frontend.
timeout /t 2 >nul
