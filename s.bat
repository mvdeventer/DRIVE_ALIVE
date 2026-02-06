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
echo   (no args)        Start servers - open default browser (default)
echo   -d               Open frontend in Edge with developer tools
echo   -h, --help, /?   Show this help message
echo.
echo EXAMPLES:
echo   s.bat                 # Start servers - open default browser (default)
echo   s.bat -d              # Start servers - open Edge with dev tools
echo   s.bat -n              # Start servers - don't open browser
echo   s.bat -b              # Start backend only
echo   s.bat -f              # Start frontend only
echo   s.bat start -f -d     # Start frontend only with dev tools
echo   s.bat start -b -n     # Start backend only without opening browser
echo.
echo For more options, see:
echo   scripts\drive-alive.bat -h
echo.
