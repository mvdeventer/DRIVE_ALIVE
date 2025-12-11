@echo off
title Database Setup
color 0D

echo ========================================
echo  DATABASE SETUP
echo ========================================
echo.

set DB_NAME=driving_school_db

echo This script will create a PostgreSQL database for the application.
echo.
echo Database Name: %DB_NAME%
echo.

REM Check if PostgreSQL is installed
where psql >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] PostgreSQL is not installed or not in PATH.
    echo.
    echo Please install PostgreSQL from: https://www.postgresql.org/download/windows/
    echo.
    pause
    exit /b 1
)

echo PostgreSQL found!
echo.

REM Try to create database
echo Creating database '%DB_NAME%'...
echo.

psql -U postgres -c "CREATE DATABASE %DB_NAME%;" 2>nul

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Database created successfully!
) else (
    echo.
    echo [INFO] Database may already exist or there was an error.
    echo.
    echo Checking if database exists...
    psql -U postgres -lqt | find /i "%DB_NAME%" >nul
    if %errorlevel% equ 0 (
        echo [INFO] Database '%DB_NAME%' already exists.
    ) else (
        echo [ERROR] Failed to create database.
        echo Please create it manually using:
        echo   psql -U postgres
        echo   CREATE DATABASE %DB_NAME%;
    )
)

echo.
echo ========================================
echo.
echo Database Name: %DB_NAME%
echo Connection String: postgresql://postgres:password@localhost:5432/%DB_NAME%
echo.
echo Don't forget to update backend\.env with your database connection string!
echo.
pause
