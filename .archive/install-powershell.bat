@echo off
echo ========================================
echo Installing PowerShell 7+ (Latest)
echo ========================================
echo.

echo This will install PowerShell 7 using winget (Windows Package Manager)
echo.
echo Checking if winget is available...
winget --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] winget is not available on your system.
    echo.
    echo Please install PowerShell manually from:
    echo https://aka.ms/powershell
    echo.
    echo Or download the MSI installer from:
    echo https://github.com/PowerShell/PowerShell/releases
    echo.
    pause
    exit /b 1
)

echo [OK] winget is available
echo.
echo Installing PowerShell 7...
echo.

winget install --id Microsoft.Powershell --source winget

if errorlevel 1 (
    echo.
    echo [ERROR] Installation failed!
    echo.
    echo Please try manual installation from:
    echo https://aka.ms/powershell
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo SUCCESS! PowerShell 7 Installed
echo ========================================
echo.
echo To use PowerShell 7, open a new terminal and type:
echo   pwsh
echo.
echo Or search for "PowerShell 7" in the Start menu.
echo.
echo After installation, close and reopen VS Code to use the new PowerShell.
echo.
pause
