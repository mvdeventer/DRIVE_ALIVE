@echo off
setlocal enabledelayedexpansion

:: ============================================================================
:: Drive Alive - Simple Development Manager
:: ============================================================================

set "PROJECT_ROOT=%~dp0.."
set "BACKEND_DIR=%PROJECT_ROOT%\backend"
set "FRONTEND_DIR=%PROJECT_ROOT%\frontend"
set "SCRIPTS_DIR=%PROJECT_ROOT%\scripts"

:: Colors
set "COLOR_RESET=[0m"
set "COLOR_RED=[91m"
set "COLOR_GREEN=[92m"
set "COLOR_YELLOW=[93m"
set "COLOR_BLUE=[94m"
set "COLOR_CYAN=[96m"

:: ============================================================================
:: Main Menu
:: ============================================================================
:main
cls
echo.
echo %COLOR_CYAN%============================================================================%COLOR_RESET%
echo %COLOR_CYAN%  Drive Alive - Development Manager%COLOR_RESET%
echo %COLOR_CYAN%============================================================================%COLOR_RESET%
echo.
echo  1. Commit Changes (Auto-generated message)
echo  2. Build Installer
echo  3. Release (Commit + Version + Tag + GitHub Release)
echo  4. Exit
echo.
set /p "choice=Select option (1-4): "

if "%choice%"=="1" goto commit
if "%choice%"=="2" goto build_installer
if "%choice%"=="3" goto release
if "%choice%"=="4" goto end
echo %COLOR_RED%Invalid choice%COLOR_RESET%
timeout /t 2 >nul
goto main

:: ============================================================================
:: COMMIT - Auto-generate commit message from changes
:: ============================================================================
:commit
cls
echo %COLOR_BLUE%======================================%COLOR_RESET%
echo %COLOR_BLUE%  Auto-Commit with Smart Message%COLOR_RESET%
echo %COLOR_BLUE%======================================%COLOR_RESET%
echo.

cd /d "%PROJECT_ROOT%"

:: Check for changes
git status --short | findstr /r "." >nul
if errorlevel 1 (
    echo %COLOR_YELLOW%No changes to commit%COLOR_RESET%
    pause
    goto main
)

echo %COLOR_YELLOW%Analyzing changes...%COLOR_RESET%
echo.

:: Show changes
git status --short

echo.
echo %COLOR_CYAN%Generating commit message...%COLOR_RESET%

:: Get changed files and analyze
set "HAS_FRONTEND=0"
set "HAS_BACKEND=0"
set "HAS_SCRIPTS=0"
set "HAS_DOCS=0"
set "HAS_CONFIG=0"
set "HAS_TESTS=0"
set "FILE_COUNT=0"

for /f "tokens=*" %%f in ('git status --short') do (
    set /a FILE_COUNT+=1
    echo %%f | findstr /i "frontend" >nul && set "HAS_FRONTEND=1"
    echo %%f | findstr /i "backend" >nul && set "HAS_BACKEND=1"
    echo %%f | findstr /i "scripts" >nul && set "HAS_SCRIPTS=1"
    echo %%f | findstr /i "\.md" >nul && set "HAS_DOCS=1"
    echo %%f | findstr /i "package.json\|app.json\|config" >nul && set "HAS_CONFIG=1"
    echo %%f | findstr /i "test" >nul && set "HAS_TESTS=1"
)

:: Determine commit type and message
set "COMMIT_TYPE=chore"
set "COMMIT_SCOPE="
set "COMMIT_DESC=update project files"

if "!HAS_TESTS!"=="1" (
    set "COMMIT_TYPE=test"
    set "COMMIT_DESC=update test files"
)

if "!HAS_DOCS!"=="1" (
    set "COMMIT_TYPE=docs"
    set "COMMIT_DESC=update documentation"
)

if "!HAS_CONFIG!"=="1" (
    set "COMMIT_TYPE=chore"
    set "COMMIT_DESC=update configuration"
)

if "!HAS_SCRIPTS!"=="1" (
    set "COMMIT_TYPE=build"
    set "COMMIT_SCOPE=scripts"
    set "COMMIT_DESC=update build scripts"
)

if "!HAS_BACKEND!"=="1" (
    set "COMMIT_TYPE=feat"
    set "COMMIT_SCOPE=backend"
    set "COMMIT_DESC=update backend"
)

if "!HAS_FRONTEND!"=="1" (
    set "COMMIT_TYPE=feat"
    set "COMMIT_SCOPE=frontend"
    set "COMMIT_DESC=update frontend"
)

if "!HAS_FRONTEND!"=="1" if "!HAS_BACKEND!"=="1" (
    set "COMMIT_SCOPE=app"
    set "COMMIT_DESC=update application"
)

:: Build message
if "!COMMIT_SCOPE!"=="" (
    set "COMMIT_MSG=!COMMIT_TYPE!: !COMMIT_DESC! (!FILE_COUNT! files)"
) else (
    set "COMMIT_MSG=!COMMIT_TYPE!(!COMMIT_SCOPE!): !COMMIT_DESC! (!FILE_COUNT! files)"
)

echo.
echo %COLOR_GREEN%Generated message:%COLOR_RESET%
echo   !COMMIT_MSG!
echo.

set /p "confirm=Commit with this message? (Y/n): "
if /i "!confirm!"=="n" goto main

echo.
echo %COLOR_YELLOW%Staging all changes...%COLOR_RESET%
git add .

echo %COLOR_YELLOW%Committing...%COLOR_RESET%
git commit -m "!COMMIT_MSG!"

if errorlevel 1 (
    echo %COLOR_RED%Commit failed!%COLOR_RESET%
    pause
    goto main
)

echo %COLOR_GREEN%Committed successfully!%COLOR_RESET%
echo.

set /p "push=Push to GitHub? (Y/n): "
if /i not "!push!"=="n" (
    echo %COLOR_YELLOW%Pushing to GitHub...%COLOR_RESET%
    git push
    if errorlevel 1 (
        echo %COLOR_RED%Push failed!%COLOR_RESET%
    ) else (
        echo %COLOR_GREEN%Pushed successfully!%COLOR_RESET%
    )
)

echo.
pause
goto main

:: ============================================================================
:: BUILD INSTALLER - Create Windows installer package
:: ============================================================================
:build_installer
cls
echo %COLOR_BLUE%======================================%COLOR_RESET%
echo %COLOR_BLUE%  Build Windows Installer%COLOR_RESET%
echo %COLOR_BLUE%======================================%COLOR_RESET%
echo.

cd /d "%PROJECT_ROOT%"

:: Check if VERSION file exists
if not exist "VERSION" (
    echo 1.0.0> VERSION
    echo %COLOR_YELLOW%Created VERSION file with 1.0.0%COLOR_RESET%
)

for /f "tokens=*" %%v in (VERSION) do set "VERSION=%%v"
echo Current version: %COLOR_CYAN%!VERSION!%COLOR_RESET%
echo.

echo %COLOR_YELLOW%Step 1/3: Building backend executable...%COLOR_RESET%
cd /d "%BACKEND_DIR%"

if not exist "venv\Scripts\activate.bat" (
    echo %COLOR_RED%Virtual environment not found!%COLOR_RESET%
    echo Run: python -m venv venv
    pause
    goto main
)

call venv\Scripts\activate.bat
pip install -q pyinstaller
pyinstaller drive-alive.spec --clean --noconfirm

if not exist "dist\drive-alive-api.exe" (
    echo %COLOR_RED%Backend build failed!%COLOR_RESET%
    pause
    goto main
)

echo %COLOR_GREEN%Backend built successfully!%COLOR_RESET%
echo.

echo %COLOR_YELLOW%Step 2/3: Building frontend web bundle...%COLOR_RESET%
cd /d "%FRONTEND_DIR%"

if not exist "node_modules" (
    echo %COLOR_YELLOW%Installing dependencies...%COLOR_RESET%
    call npm install
)

call npx expo export:web

if not exist "web-build\index.html" (
    echo %COLOR_RED%Frontend build failed!%COLOR_RESET%
    pause
    goto main
)

echo %COLOR_GREEN%Frontend built successfully!%COLOR_RESET%
echo.

echo %COLOR_YELLOW%Step 3/3: Creating installer...%COLOR_RESET%
cd /d "%SCRIPTS_DIR%"

where iscc >nul 2>&1
if errorlevel 1 (
    echo %COLOR_RED%Inno Setup not found!%COLOR_RESET%
    echo Install from: https://jrsoftware.org/isdl.php
    pause
    goto main
)

iscc /DMyAppVersion=!VERSION! installer.iss

if not exist "..\DriveAlive-Setup-!VERSION!.exe" (
    echo %COLOR_RED%Installer creation failed!%COLOR_RESET%
    pause
    goto main
)

echo.
echo %COLOR_GREEN%========================================%COLOR_RESET%
echo %COLOR_GREEN%  Installer created successfully!%COLOR_RESET%
echo %COLOR_GREEN%========================================%COLOR_RESET%
echo.
echo   File: DriveAlive-Setup-!VERSION!.exe
echo   Location: %PROJECT_ROOT%
echo.

pause
goto main

:: ============================================================================
:: RELEASE - Full release workflow
:: ============================================================================
:release
cls
echo %COLOR_BLUE%======================================%COLOR_RESET%
echo %COLOR_BLUE%  Create GitHub Release%COLOR_RESET%
echo %COLOR_BLUE%======================================%COLOR_RESET%
echo.

cd /d "%PROJECT_ROOT%"

:: Check GitHub CLI
where gh >nul 2>&1
if errorlevel 1 (
    echo %COLOR_RED%GitHub CLI not installed!%COLOR_RESET%
    echo Install from: https://cli.github.com/
    pause
    goto main
)

:: Auto-commit if changes exist
git status --short | findstr /r "." >nul
if not errorlevel 1 (
    echo %COLOR_YELLOW%Uncommitted changes detected...%COLOR_RESET%

    :: Generate commit message
    set "HAS_FRONTEND=0"
    set "HAS_BACKEND=0"
    set "HAS_SCRIPTS=0"
    set "FILE_COUNT=0"

    for /f "tokens=*" %%f in ('git status --short') do (
        set /a FILE_COUNT+=1
        echo %%f | findstr /i "frontend" >nul && set "HAS_FRONTEND=1"
        echo %%f | findstr /i "backend" >nul && set "HAS_BACKEND=1"
        echo %%f | findstr /i "scripts" >nul && set "HAS_SCRIPTS=1"
    )

    set "COMMIT_TYPE=chore"
    set "COMMIT_SCOPE="

    if "!HAS_SCRIPTS!"=="1" set "COMMIT_TYPE=build" & set "COMMIT_SCOPE=scripts"
    if "!HAS_BACKEND!"=="1" set "COMMIT_TYPE=feat" & set "COMMIT_SCOPE=backend"
    if "!HAS_FRONTEND!"=="1" set "COMMIT_TYPE=feat" & set "COMMIT_SCOPE=frontend"

    if "!COMMIT_SCOPE!"=="" (
        set "PRE_MSG=!COMMIT_TYPE!: prepare for release"
    ) else (
        set "PRE_MSG=!COMMIT_TYPE!(!COMMIT_SCOPE!): prepare for release"
    )

    echo %COLOR_CYAN%Auto-committing: !PRE_MSG!%COLOR_RESET%
    git add .
    git commit -m "!PRE_MSG!"
    echo.
)

:: Get version
if not exist "VERSION" echo 1.0.0> VERSION
for /f "tokens=*" %%v in (VERSION) do set "CURRENT_VER=%%v"

echo Current version: %COLOR_CYAN%!CURRENT_VER!%COLOR_RESET%
echo.
set /p "NEW_VER=Enter new version (or press Enter to keep !CURRENT_VER!): "
if "!NEW_VER!"=="" set "NEW_VER=!CURRENT_VER!"

echo !NEW_VER!> VERSION

echo.
echo %COLOR_YELLOW%Updating version in project files...%COLOR_RESET%

:: Update package.json
powershell -Command "$json = Get-Content '%FRONTEND_DIR%\package.json' -Raw | ConvertFrom-Json; $json.version = '!NEW_VER!'; $json | ConvertTo-Json -Depth 10 | Set-Content '%FRONTEND_DIR%\package.json'"

:: Update app.json
powershell -Command "$json = Get-Content '%FRONTEND_DIR%\app.json' -Raw | ConvertFrom-Json; $json.expo.version = '!NEW_VER!'; $json | ConvertTo-Json -Depth 10 | Set-Content '%FRONTEND_DIR%\app.json'"

echo %COLOR_GREEN%Version updated to !NEW_VER!%COLOR_RESET%
echo.

:: Commit version bump
echo %COLOR_YELLOW%Committing version bump...%COLOR_RESET%
git add VERSION frontend/package.json frontend/app.json
git commit -m "chore: bump version to !NEW_VER!"

:: Create tag
echo %COLOR_YELLOW%Creating git tag v!NEW_VER!...%COLOR_RESET%
git tag -a "v!NEW_VER!" -m "Release v!NEW_VER!"

:: Push
echo %COLOR_YELLOW%Pushing to GitHub...%COLOR_RESET%
git push origin main
git push origin "v!NEW_VER!"

echo.
echo %COLOR_GREEN%Creating GitHub release...%COLOR_RESET%
gh release create "v!NEW_VER!" --title "Release v!NEW_VER!" --generate-notes

if errorlevel 1 (
    echo %COLOR_RED%Release creation failed!%COLOR_RESET%
    pause
    goto main
)

echo.
echo %COLOR_GREEN%========================================%COLOR_RESET%
echo %COLOR_GREEN%  Release v!NEW_VER! created!%COLOR_RESET%
echo %COLOR_GREEN%========================================%COLOR_RESET%
echo.

pause
goto main

:: ============================================================================
:: END
:: ============================================================================
:end
echo.
echo %COLOR_CYAN%Goodbye!%COLOR_RESET%
timeout /t 1 >nul
endlocal
exit /b 0
