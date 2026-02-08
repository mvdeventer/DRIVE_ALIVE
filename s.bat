@echo off
REM s.bat - Quick start wrapper for Drive Alive
REM Check if help is requested
if "%~1"=="-h" goto :show_help
if "%~1"=="--help" goto :show_help
if "%~1"=="/?" goto :show_help

REM Run with arguments passed through, or default to standard start
if "%~1"=="" (
    .\scripts\drive-alive.bat start
) else if "%~1"=="-d" (
    .\scripts\drive-alive.bat start -d %~2 %~3 %~4 %~5 %~6
) else if "%~1"=="-b" (
    .\scripts\drive-alive.bat start -b %~2 %~3 %~4 %~5 %~6
) else if "%~1"=="-f" (
    .\scripts\drive-alive.bat start -f %~2 %~3 %~4 %~5 %~6
) else if "%~1"=="-n" (
    .\scripts\drive-alive.bat start -n %~2 %~3 %~4 %~5 %~6
) else (
    .\scripts\drive-alive.bat %*
)
goto :eof

:show_help
echo.
echo DRIVE ALIVE - Quick Start Commands
echo ====================================
echo.
echo USAGE:
echo   s.bat [OPTIONS]
echo.
echo OPTIONS:
echo   (no args)        Start servers - auto-detect mode from .env (default)
echo   -d               Open frontend in Edge with developer tools
echo   -h, --help, /?   Show this help message
echo.
echo EXAMPLES:
echo   s.bat                 # Auto-detect localhost/network mode from .env
echo   s.bat -d              # Start with dev tools (auto-detects mode)
echo   s.bat -n              # Start without opening browser
echo   s.bat -b              # Start backend only
echo   s.bat -f              # Start frontend only (auto-detects mode)
echo.
echo ENVIRONMENT MODE:
echo   The script automatically reads backend\.env to determine:
echo   - If FRONTEND_URL=http://localhost:8081    ^=^> localhost mode
echo   - If FRONTEND_URL=http://10.0.0.121:8081   ^=^> network mode (mobile)
echo.
echo   To switch modes, use:
echo   cd backend
echo   .\switch-env.ps1 -Env loc    # Switch to localhost
echo   .\switch-env.ps1 -Env net    # Switch to network (mobile)
echo.
echo For more options, see:
echo   scripts\drive-alive.bat -h
echo.
