@echo off
setlocal enabledelayedexpansion
REM s.bat - Quick start wrapper for Drive Alive
REM Check if help is requested
if "%~1"=="-h" goto :show_help
if "%~1"=="--help" goto :show_help
if "%~1"=="/?" goto :show_help

REM Check for -l (localhost/HTTPS) or -m (mobile/network) mode switches
REM These run switch-env.ps1 first, then continue startup
set "MODE_SWITCH="
set "REMAINING_ARGS="

for %%a in (%*) do (
    if /i "%%a"=="-l" (
        set "MODE_SWITCH=loc"
    ) else if /i "%%a"=="-m" (
        set "MODE_SWITCH=net"
    ) else (
        set "REMAINING_ARGS=!REMAINING_ARGS! %%a"
    )
)

REM Apply mode switch if requested
if defined MODE_SWITCH (
    echo.
    if "!MODE_SWITCH!"=="loc" (
        echo Switching to LOCALHOST mode ^(HTTPS^)...
    ) else (
        echo Switching to NETWORK mode ^(mobile^)...
    )
    powershell -ExecutionPolicy Bypass -File "%~dp0backend\switch-env.ps1" -Env !MODE_SWITCH!
    echo.
)

REM First-run bootstrap: auto-setup if .installed marker is missing
if not exist "%~dp0.installed" (
    echo.
    echo ============================================
    echo  First-run detected - running auto-setup...
    echo ============================================
    echo.
    python "%~dp0bootstrap.py"
    if errorlevel 1 (
        echo.
        echo [WARN] Bootstrap had issues - attempting to continue...
        echo.
    )
)

REM Run with arguments passed through, or default to standard start
REM Strip -l and -m from args (already handled above)
set "ARGS=!REMAINING_ARGS!"

REM Trim leading space
if defined ARGS set "ARGS=!ARGS:~1!"

if not defined ARGS (
    .\scripts\drive-alive.bat start
) else if "!ARGS:~0,2!"=="-d" (
    .\scripts\drive-alive.bat start !ARGS!
) else if "!ARGS:~0,2!"=="-b" (
    .\scripts\drive-alive.bat start !ARGS!
) else if "!ARGS:~0,2!"=="-f" (
    .\scripts\drive-alive.bat start !ARGS!
) else if "!ARGS:~0,2!"=="-n" (
    .\scripts\drive-alive.bat start !ARGS!
) else (
    .\scripts\drive-alive.bat !ARGS!
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
echo   -l               Switch to localhost mode (HTTPS) before starting
echo   -m               Switch to mobile/network mode (HTTP) before starting
echo   -d               Open frontend in Edge with developer tools
echo   -h, --help, /?   Show this help message
echo.
echo   Flags can be combined: s.bat -l -d
echo.
echo EXAMPLES:
echo   s.bat                 # Auto-detect localhost/network mode from .env
echo   s.bat -l              # Switch to localhost (HTTPS) and start
echo   s.bat -m              # Switch to network/mobile (HTTP) and start
echo   s.bat -l -d           # Localhost HTTPS + open Edge with dev tools
echo   s.bat -m -d           # Network mode + open Edge with dev tools
echo   s.bat -d              # Start with dev tools (auto-detects mode)
echo   s.bat -n              # Start without opening browser
echo   s.bat -b              # Start backend only
echo   s.bat -f              # Start frontend only (auto-detects mode)
echo.
echo ENVIRONMENT MODE:
echo   -l and -m flags auto-switch the .env before starting.
echo   The script reads backend\.env to determine:
echo   - FRONTEND_URL=http://localhost:8081    ^=^> localhost + HTTPS
echo   - FRONTEND_URL=http://10.0.0.121:8081   ^=^> network + HTTP
echo.
echo   You can also switch manually:
echo   cd backend
echo   .\switch-env.ps1 -Env loc    # Switch to localhost
echo   .\switch-env.ps1 -Env net    # Switch to network (mobile)
echo.
echo For more options, see:
echo   scripts\drive-alive.bat -h
echo.
