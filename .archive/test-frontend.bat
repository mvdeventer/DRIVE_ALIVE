@echo off
echo ========================================
echo Testing Frontend (React Native + Expo)
echo ========================================
echo.

cd frontend

echo [1/3] Checking node_modules...
if exist "node_modules" (
    echo [OK] node_modules exists
) else (
    echo [ERROR] node_modules not found!
    echo Run: npm install
    pause
    exit /b 1
)

echo.
echo [2/3] Checking if Expo is installed...
if exist "node_modules\expo" (
    echo [OK] Expo is installed
) else (
    echo [ERROR] Expo not found!
    echo Run: npm install
    pause
    exit /b 1
)

echo.
echo [3/3] Starting Expo development server...
echo.
echo ========================================
echo Frontend will open at: http://localhost:8081
echo ========================================
echo.
echo Options:
echo   w - Open in web browser
echo   a - Open Android emulator
echo   i - Open iOS simulator (Mac)
echo   q - Quit
echo.
echo Press Ctrl+C to stop the server
echo.

npm start
