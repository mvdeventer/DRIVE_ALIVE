@echo off
echo ========================================
echo Switching to Modern Expo CLI
echo ========================================
echo.

echo The legacy expo-cli is deprecated.
echo Using the modern Expo CLI built into your project.
echo.

echo Step 1: Uninstalling old expo-cli...
npm uninstall -g expo-cli
echo [OK] Old expo-cli removed

echo.
echo Step 2: Ensuring expo package is installed locally...
npm install

echo.
echo Step 3: Starting with modern Expo CLI...
echo.
echo ========================================
echo Starting Expo Development Server
echo ========================================
echo.

npx expo start

pause
