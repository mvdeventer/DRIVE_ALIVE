@echo off
:: ==============================================================================
:: Android SDK Environment Setup Script
:: ==============================================================================
:: This script sets up the Android SDK environment variables for React Native
:: development on Windows.
::
:: USAGE: Run this script AFTER installing Android Studio
:: ==============================================================================

echo.
echo ============================================================
echo   Android SDK Environment Setup
echo ============================================================
echo.

:: Default Android SDK path
set "DEFAULT_SDK_PATH=%LOCALAPPDATA%\Android\Sdk"

:: Check if Android Studio is installed
if exist "%DEFAULT_SDK_PATH%" (
    echo [OK] Android SDK found at: %DEFAULT_SDK_PATH%
    set "ANDROID_SDK_ROOT=%DEFAULT_SDK_PATH%"
) else (
    echo [!] Android SDK not found at default location.
    echo.
    echo Please install Android Studio from:
    echo https://developer.android.com/studio
    echo.
    echo Or enter your Android SDK path:
    set /p "ANDROID_SDK_ROOT=SDK Path: "
)

echo.
echo Setting up environment variables...
echo.

:: Set user environment variables permanently
setx ANDROID_HOME "%ANDROID_SDK_ROOT%"
setx ANDROID_SDK_ROOT "%ANDROID_SDK_ROOT%"

:: Set PATH to include Android tools
setx PATH "%PATH%;%ANDROID_SDK_ROOT%\platform-tools;%ANDROID_SDK_ROOT%\tools;%ANDROID_SDK_ROOT%\tools\bin;%ANDROID_SDK_ROOT%\emulator"

echo.
echo ============================================================
echo   Environment Variables Set Successfully!
echo ============================================================
echo.
echo ANDROID_HOME=%ANDROID_SDK_ROOT%
echo ANDROID_SDK_ROOT=%ANDROID_SDK_ROOT%
echo.
echo Added to PATH:
echo   - %ANDROID_SDK_ROOT%\platform-tools
echo   - %ANDROID_SDK_ROOT%\tools
echo   - %ANDROID_SDK_ROOT%\tools\bin
echo   - %ANDROID_SDK_ROOT%\emulator
echo.
echo ============================================================
echo   IMPORTANT: Close and reopen your terminal/VS Code
echo   for changes to take effect!
echo ============================================================
echo.
echo Press any key to exit...
pause >nul
