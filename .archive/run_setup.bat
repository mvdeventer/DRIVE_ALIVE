@echo off
echo ========================================
echo Drive Alive - Running Setup Scripts
echo ========================================
echo.

echo [Step 1/2] Creating directory structure...
python create_dirs.py
if errorlevel 1 (
    echo [ERROR] Failed to create directories
    pause
    exit /b 1
)

echo.
echo [Step 2/2] Creating configuration files...
python setup_files.py
if errorlevel 1 (
    echo [ERROR] Failed to create configuration files
    pause
    exit /b 1
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. cd backend ^&^& python -m venv venv
echo 2. cd backend ^&^& venv\Scripts\activate ^&^& pip install -r requirements.txt
echo 3. cd frontend ^&^& npm install
echo 4. Open DRIVE_ALIVE.code-workspace in VS Code
echo.
pause
