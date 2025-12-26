@echo off
REM ============================================================================
REM Drive Alive Version Manager
REM Handles automatic version detection and incrementing using Git tags
REM ============================================================================

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."
set "VERSION_FILE=%ROOT_DIR%\VERSION"
set "VERSION_JSON=%ROOT_DIR%\version.json"
set "FRONTEND_PACKAGE=%ROOT_DIR%\frontend\package.json"

:PARSE_ARGS
if "%~1"=="" goto :SHOW_USAGE
if /i "%~1"=="get" goto :GET_VERSION
if /i "%~1"=="major" goto :INCREMENT_MAJOR
if /i "%~1"=="minor" goto :INCREMENT_MINOR
if /i "%~1"=="patch" goto :INCREMENT_PATCH
if /i "%~1"=="set" goto :SET_VERSION
goto :SHOW_USAGE

:SHOW_USAGE
echo.
echo Drive Alive Version Manager
echo ===========================
echo.
echo Usage: version-manager.bat [command] [options]
echo.
echo Commands:
echo   get                    - Get current version
echo   major                  - Increment major version (x.0.0)
echo   minor                  - Increment minor version (0.x.0)
echo   patch                  - Increment patch version (0.0.x)
echo   set [version]          - Set specific version (e.g., 2.1.3)
echo.
echo Examples:
echo   version-manager.bat get
echo   version-manager.bat major
echo   version-manager.bat minor
echo   version-manager.bat patch
echo   version-manager.bat set 2.0.0
echo.
goto :EOF

:GET_VERSION
REM Get version from git tags or VERSION file
git describe --tags --abbrev=0 >nul 2>&1
if !errorlevel! equ 0 (
    for /f "tokens=*" %%v in ('git describe --tags --abbrev=0') do set "GIT_VERSION=%%v"
    set "GIT_VERSION=!GIT_VERSION:v=!"
    echo !GIT_VERSION!
) else (
    if exist "%VERSION_FILE%" (
        for /f "tokens=*" %%v in (%VERSION_FILE%) do echo %%v
    ) else (
        echo 1.0.0
    )
)
goto :EOF

:INCREMENT_MAJOR
call :GET_CURRENT_VERSION
for /f "tokens=1,2,3 delims=." %%a in ("!CURRENT_VERSION!") do (
    set /a "MAJOR=%%a+1"
    set "MINOR=0"
    set "PATCH=0"
)
set "NEW_VERSION=!MAJOR!.!MINOR!.!PATCH!"
call :UPDATE_VERSION "!NEW_VERSION!" "Major"
goto :EOF

:INCREMENT_MINOR
call :GET_CURRENT_VERSION
for /f "tokens=1,2,3 delims=." %%a in ("!CURRENT_VERSION!") do (
    set "MAJOR=%%a"
    set /a "MINOR=%%b+1"
    set "PATCH=0"
)
set "NEW_VERSION=!MAJOR!.!MINOR!.!PATCH!"
call :UPDATE_VERSION "!NEW_VERSION!" "Minor"
goto :EOF

:INCREMENT_PATCH
call :GET_CURRENT_VERSION
for /f "tokens=1,2,3 delims=." %%a in ("!CURRENT_VERSION!") do (
    set "MAJOR=%%a"
    set "MINOR=%%b"
    set /a "PATCH=%%c+1"
)
set "NEW_VERSION=!MAJOR!.!MINOR!.!PATCH!"
call :UPDATE_VERSION "!NEW_VERSION!" "Patch"
goto :EOF

:SET_VERSION
set "NEW_VERSION=%~2"
if "!NEW_VERSION!"=="" (
    echo Error: Version number required
    echo Usage: version-manager.bat set [version]
    exit /b 1
)
REM Validate version format (x.y.z)
echo !NEW_VERSION! | findstr /r "^[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*$" >nul
if !errorlevel! neq 0 (
    echo Error: Invalid version format. Use x.y.z format
    exit /b 1
)
call :UPDATE_VERSION "!NEW_VERSION!" "Manual"
goto :EOF

:GET_CURRENT_VERSION
REM Get current version from git or file
git describe --tags --abbrev=0 >nul 2>&1
if !errorlevel! equ 0 (
    for /f "tokens=*" %%v in ('git describe --tags --abbrev=0') do set "CURRENT_VERSION=%%v"
    set "CURRENT_VERSION=!CURRENT_VERSION:v=!"
) else if exist "%VERSION_FILE%" (
    for /f "tokens=*" %%v in (%VERSION_FILE%) do set "CURRENT_VERSION=%%v"
) else (
    set "CURRENT_VERSION=1.0.0"
)
goto :EOF

:UPDATE_VERSION
set "VERSION=%~1"
set "TYPE=%~2"

echo.
echo Updating version to: %VERSION% [%TYPE% update]
echo ================================================

REM Update VERSION file
echo %VERSION%> "%VERSION_FILE%"
echo [+] Updated VERSION file

REM Update version.json
for /f "tokens=2 delims=:." %%d in ('echo %date%') do set day=%%d
for /f "tokens=1 delims=:." %%m in ('echo %date%') do set month=%%m
for /f "tokens=3 delims=:." %%y in ('echo %date%') do set year=%%y
set "RELEASE_DATE=%year%-%month%-%day%"

(
echo {
echo   "version": "%VERSION%",
echo   "build": "1",
echo   "release_date": "%RELEASE_DATE%",
echo   "codename": "%TYPE% Release"
echo }
) > "%VERSION_JSON%"
echo [+] Updated version.json

REM Update frontend package.json
if exist "%FRONTEND_PACKAGE%" (
    powershell -Command "(Get-Content '%FRONTEND_PACKAGE%') -replace '\"version\": \".*\"', '\"version\": \"%VERSION%\"' | Set-Content '%FRONTEND_PACKAGE%'"
    echo [+] Updated frontend package.json
)

REM Update backend __init__.py or main.py with version
set "BACKEND_INIT=%ROOT_DIR%\backend\app\__init__.py"
if exist "%BACKEND_INIT%" (
    findstr /C:"__version__" "%BACKEND_INIT%" >nul
    if !errorlevel! equ 0 (
        powershell -Command "(Get-Content '%BACKEND_INIT%') -replace '__version__ = \".*\"', '__version__ = \"%VERSION%\"' | Set-Content '%BACKEND_INIT%'"
    ) else (
        echo __version__ = "%VERSION%" >> "%BACKEND_INIT%"
    )
    echo [+] Updated backend version
)

echo.
echo Version updated successfully!
echo Current version: %VERSION%
echo.
echo Next steps:
echo   1. Review changes with: git diff
echo   2. Commit changes with: drive-alive.bat commit
echo   3. Git tag will be created automatically: v%VERSION%
echo.

goto :EOF
