@echo off
REM Start Browser with remote debugging enabled
REM This allows VS Code to attach and monitor the console

echo Detecting running browser...
echo.

REM Check if Edge is running
tasklist /FI "IMAGENAME eq msedge.exe" 2>NUL | find /I /N "msedge.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo Edge browser detected - launching Edge with debugging...
    echo.
    echo Once Edge opens:
    echo 1. Navigate to http://localhost:8081
    echo 2. In VS Code, press F5 and select "Attach to Edge (Port 9222)"
    echo 3. All console messages will appear in VS Code Debug Console
    echo.
    start msedge --remote-debugging-port=9222 --user-data-dir="%TEMP%\edge-debug" http://localhost:8081
    goto :end
)

REM Check if Chrome is running
tasklist /FI "IMAGENAME eq chrome.exe" 2>NUL | find /I /N "chrome.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo Chrome browser detected - launching Chrome with debugging...
    echo.
    echo Once Chrome opens:
    echo 1. Navigate to http://localhost:8081
    echo 2. In VS Code, press F5 and select "Attach to Chrome (Port 9222)"
    echo 3. All console messages will appear in VS Code Debug Console
    echo.
    start chrome --remote-debugging-port=9222 --user-data-dir="%TEMP%\chrome-debug" http://localhost:8081
    goto :end
)

REM Default to Edge (most common on Windows)
echo No browser detected - defaulting to Edge...
echo.
echo Once Edge opens:
echo 1. Navigate to http://localhost:8081
echo 2. In VS Code, press F5 and select "Attach to Edge (Port 9222)"
echo 3. All console messages will appear in VS Code Debug Console
echo.
start msedge --remote-debugging-port=9222 --user-data-dir="%TEMP%\edge-debug" http://localhost:8081

:end
echo.
echo Browser launched! Press any key to close...
pause >nul
