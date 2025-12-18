@echo off
cd /d C:\Projects\DRIVE_ALIVE\frontend
echo Current directory: %CD%
echo.
echo Checking npm version...
call npm --version
echo.
echo Checking Node version...
call node --version
echo.
echo Contents of package.json:
type package.json
echo.
echo ========================================
echo Running npm install...
echo ========================================
call npm install --loglevel verbose
echo.
echo Exit code: %ERRORLEVEL%
echo.
if exist node_modules (
    echo node_modules directory EXISTS
    dir node_modules | find "DIR"
) else (
    echo node_modules directory DOES NOT EXIST
)
echo.
pause
