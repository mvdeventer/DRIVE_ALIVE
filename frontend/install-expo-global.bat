@echo off
echo ========================================
echo Installing Expo CLI Globally
echo ========================================
echo.

echo This will install expo-cli globally on your system.
echo You'll be able to use 'expo' command from anywhere.
echo.
echo Installing...
echo.

npm install -g expo-cli

if errorlevel 1 (
    echo.
    echo [ERROR] Installation failed!
    echo.
    echo Try running this as Administrator or check your internet connection.
    pause
    exit /b 1
)

echo.
echo ========================================
echo SUCCESS! Expo CLI installed globally
echo ========================================
echo.

echo Verifying installation...
expo --version

echo.
echo Now you can start the app with:
echo   cd C:\Projects\DRIVE_ALIVE\frontend
echo   expo start
echo.
echo Or simply:
echo   npm start
echo.
pause
