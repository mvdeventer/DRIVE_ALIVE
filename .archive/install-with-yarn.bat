@echo off
cd /d C:\Projects\DRIVE_ALIVE\frontend
echo Installing with yarn (npm alternative)...
echo.
call corepack enable
call yarn install
echo.
echo Exit code: %ERRORLEVEL%
echo.
if exist node_modules (
    echo SUCCESS - node_modules directory created!
    echo.
    echo Packages installed:
    dir node_modules\react 2>nul && echo   - react
    dir node_modules\react-native 2>nul && echo   - react-native
    dir node_modules\expo 2>nul && echo   - expo
    echo.
    echo Now reload VS Code: Ctrl+Shift+P then "Reload Window"
) else (
    echo FAILED - node_modules directory was not created
)
echo.
pause
