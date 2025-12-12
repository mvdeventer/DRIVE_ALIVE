@echo off
echo ========================================
echo Drive Alive - Frontend Setup & Start
echo ========================================
echo.

echo [1/3] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js is installed
node --version

echo.
echo [2/3] Checking npm installation...
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed!
    pause
    exit /b 1
)
echo [OK] npm is installed
npm --version

echo.
echo [3/3] Installing/Updating dependencies...
npm install

echo.
echo ========================================
echo Starting Expo Development Server
echo ========================================
echo.
echo Press 'w' for web
echo Press 'a' for Android
echo Press 'i' for iOS (Mac only)
echo Press 'q' to quit
echo.

REM Use npx to run expo
npx expo start

pause
