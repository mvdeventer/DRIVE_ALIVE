@echo off
echo Reinstalling npm...
echo.
cd /d "C:\Program Files\nodejs"
echo Backing up old npm...
if exist npm.cmd ren npm.cmd npm.cmd.bak
if exist npm.ps1 ren npm.ps1 npm.ps1.bak
if exist npx.cmd ren npx.cmd npx.cmd.bak
if exist npx.ps1 ren npx.ps1 npx.ps1.bak

echo.
echo Downloading npm...
node -e "console.log('Node is working: v' + process.version)"
echo.
echo Installing npm via npx...
node "%APPDATA%\npm\node_modules\npm\bin\npm-cli.js" install -g npm@latest

echo.
echo Testing npm...
call npm --version

echo.
if errorlevel 1 (
    echo npm reinstall FAILED
    echo.
    echo Please reinstall Node.js from: https://nodejs.org/
) else (
    echo npm reinstall SUCCESS
    echo.
    echo Now try installing packages:
    echo   cd C:\Projects\DRIVE_ALIVE\frontend
    echo   npm install
)
echo.
pause
