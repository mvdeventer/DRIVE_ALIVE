@echo off
REM Drive Alive - Create Project Directory Structure

echo Creating Drive Alive project structure...
echo.

mkdir frontend\assets\images 2>nul
mkdir frontend\assets\icons 2>nul
mkdir frontend\assets\fonts 2>nul
mkdir frontend\components\common 2>nul
mkdir frontend\components\instructor 2>nul
mkdir frontend\components\student 2>nul
mkdir frontend\screens\auth 2>nul
mkdir frontend\screens\instructor 2>nul
mkdir frontend\screens\student 2>nul
mkdir frontend\screens\booking 2>nul
mkdir frontend\screens\payment 2>nul
mkdir frontend\navigation 2>nul
mkdir frontend\services\api 2>nul
mkdir frontend\services\firebase 2>nul
mkdir frontend\utils 2>nul

mkdir backend\app\models 2>nul
mkdir backend\app\routes 2>nul
mkdir backend\app\services 2>nul
mkdir backend\app\utils 2>nul
mkdir backend\app\middleware 2>nul
mkdir backend\tests 2>nul

mkdir docs 2>nul
mkdir config 2>nul
mkdir tests\frontend 2>nul
mkdir tests\backend 2>nul
mkdir .vscode 2>nul
mkdir .github\workflows 2>nul

echo Directory structure created successfully!
echo.
echo Run setup_project_files.bat to create all configuration files.
pause
