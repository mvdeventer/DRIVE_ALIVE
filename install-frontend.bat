@echo off
echo Installing frontend dependencies...
cd /d "%~dp0frontend"
call npm install
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS! Dependencies installed.
    echo ========================================
    echo.
    echo Packages installed - reload VS Code now:
    echo   Ctrl+Shift+P then "Reload Window"
    echo.
) else (
    echo.
    echo ========================================
    echo ERROR! Installation failed.
    echo ========================================
    echo.
    echo Try manually:
    echo   cd frontend
    echo   npm install
    echo.
)
pause
