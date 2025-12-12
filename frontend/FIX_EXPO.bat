@echo off
echo ========================================
echo Fixing Expo Installation
echo ========================================
echo.

echo Step 1: Checking if node_modules exists...
if exist node_modules (
    echo [OK] node_modules folder exists
) else (
    echo [!] node_modules folder missing
)

echo.
echo Step 2: Checking if expo is installed...
if exist "node_modules\expo" (
    echo [OK] Expo folder exists
) else (
    echo [!] Expo NOT found in node_modules
)

echo.
echo Step 3: Cleaning up old installation...
rmdir /s /q node_modules 2>nul
del package-lock.json 2>nul
echo [OK] Cleaned up

echo.
echo Step 4: Fresh install of all dependencies...
npm install
if errorlevel 1 (
    echo [ERROR] npm install failed!
    pause
    exit /b 1
)

echo.
echo Step 5: Verifying expo installation...
if exist "node_modules\expo" (
    echo [SUCCESS] Expo is now installed!
) else (
    echo [ERROR] Expo still not found!
    pause
    exit /b 1
)

echo.
echo Step 6: Testing expo command...
npx expo --version
if errorlevel 1 (
    echo [ERROR] npx expo command failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo SUCCESS! Expo is ready to use
echo ========================================
echo.
echo To start the app, run:
echo   npm start
echo.
echo Or press any key to start now...
pause

npm start
