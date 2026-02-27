@echo off
setlocal enabledelayedexpansion
REM s.bat - Quick start wrapper for Drive Alive
REM Check if help is requested
if "%~1"=="-h" goto :show_help
if "%~1"=="--help" goto :show_help
if "%~1"=="/?" goto :show_help

REM Check for -l (localhost/HTTPS) or -m (mobile/network) mode switches
REM These run switch-env.ps1 first, then continue startup
set "MODE_SWITCH="
set "REMAINING_ARGS="

for %%a in (%*) do (
    if /i "%%a"=="-l" (
        set "MODE_SWITCH=loc"
    ) else if /i "%%a"=="-m" (
        set "MODE_SWITCH=net"
    ) else (
        set "REMAINING_ARGS=!REMAINING_ARGS! %%a"
    )
)

REM Apply mode switch if requested
if defined MODE_SWITCH (
    echo.
    if "!MODE_SWITCH!"=="loc" (
        echo Switching to LOCALHOST mode ^(HTTPS^)...
    ) else (
        echo Switching to NETWORK mode ^(mobile^)...
    )
    powershell -ExecutionPolicy Bypass -File "%~dp0backend\switch-env.ps1" -Env !MODE_SWITCH!
    echo.
)


REM --- Ensure PostgreSQL is running ---

call :start_postgres_service
goto :continue_startup_after_pg

:ensure_docker_postgres
setlocal enabledelayedexpansion
REM Check if a Windows PostgreSQL service exists first - if so, skip Docker
set "PGSERVICE="
powershell -NoProfile -Command "$svc = Get-Service | Where-Object {$_.Name -like '*postgres*'} | Select-Object -First 1; if ($svc) { Set-Content -Path '%TEMP%\_pgservice2.tmp' -Value $svc.Name }" 2>nul
if exist "%TEMP%\_pgservice2.tmp" (
    set /p PGSERVICE=<"%TEMP%\_pgservice2.tmp"
    del "%TEMP%\_pgservice2.tmp" >nul 2>&1
)
if defined PGSERVICE goto :docker_pg_skip

echo.
echo ============================================
echo  Checking PostgreSQL Docker container...
echo ============================================
docker info >nul 2>&1
if not errorlevel 1 goto :docker_ready
echo   [INFO] Docker not running - starting Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
echo   Waiting for Docker to start (up to 60 seconds)...
call :wait_for_docker
if errorlevel 1 goto :docker_pg_skip

:docker_ready
docker inspect drivealive_postgres_local >nul 2>&1
if not errorlevel 1 goto :docker_check_running
echo   [INFO] Starting PostgreSQL Docker container...
docker run -d --name drivealive_postgres_local -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=driving_school_db -p 5432:5432 --restart unless-stopped postgres:14-alpine >nul 2>&1
if errorlevel 1 (
    echo   [WARN] Could not start PostgreSQL container.
    goto :docker_pg_skip
)
echo   [OK] PostgreSQL container started - waiting for it to be ready...
call :wait_for_postgres
goto :docker_pg_skip

:docker_check_running
set "_pgrunning="
for /f "tokens=*" %%i in ('docker ps -q --filter "name=drivealive_postgres_local" --filter "status=running" 2^>nul') do set "_pgrunning=%%i"
if defined _pgrunning (
    echo   [OK] PostgreSQL Docker container already running.
    goto :docker_pg_skip
)
echo   [INFO] Starting existing PostgreSQL container...
docker start drivealive_postgres_local >nul 2>&1
echo   [OK] PostgreSQL container started - waiting for it to be ready...
call :wait_for_postgres

:docker_pg_skip
endlocal
goto :EOF

:wait_for_docker
setlocal enabledelayedexpansion
set /a _dw=0
:docker_daemon_loop
if !_dw! geq 60 (
    echo   [WARN] Docker did not start in time - database may not be available.
    endlocal & exit /b 1
)
timeout /t 5 /nobreak >nul 2>&1
set /a _dw+=5
docker info >nul 2>&1
if errorlevel 1 goto :docker_daemon_loop
echo   [OK] Docker is ready.
endlocal & exit /b 0

:wait_for_postgres
setlocal enabledelayedexpansion
set /a _pw=0
:pg_ready_loop
if !_pw! geq 30 (
    echo   [WARN] PostgreSQL did not become ready in time.
    endlocal
    goto :EOF
)
docker exec drivealive_postgres_local pg_isready -U postgres >nul 2>&1
if not errorlevel 1 (
    echo   [OK] PostgreSQL is ready.
    endlocal
    goto :EOF
)
timeout /t 2 /nobreak >nul 2>&1
set /a _pw+=2
goto :pg_ready_loop

:continue_startup_after_pg
call :ensure_docker_postgres
goto :continue_startup

:start_postgres_service
setlocal enabledelayedexpansion
echo.
echo ============================================
echo  Checking PostgreSQL service status...
echo ============================================
set "PGSERVICE="
powershell -NoProfile -Command "$svc = Get-Service | Where-Object {$_.Name -like '*postgres*'} | Select-Object -First 1; if ($svc) { Set-Content -Path '%TEMP%\_pgservice.tmp' -Value $svc.Name }" 2>nul
if exist "%TEMP%\_pgservice.tmp" (
    set /p PGSERVICE=<"%TEMP%\_pgservice.tmp"
    del "%TEMP%\_pgservice.tmp" >nul 2>&1
)
if defined PGSERVICE goto :pg_found

echo   [INFO] No PostgreSQL Windows service detected - skipping auto-start.
echo   ^(PostgreSQL may be running via Docker or another method^)
endlocal
goto :EOF

:pg_found
echo   [INFO] Using PostgreSQL service: !PGSERVICE!
net start | find /I "!PGSERVICE!" >nul 2>&1
if errorlevel 1 (
    echo   Starting PostgreSQL service: !PGSERVICE! ...
    net start !PGSERVICE!
    if errorlevel 1 (
        echo   [ERROR] Could not start PostgreSQL ^(!PGSERVICE!^). Start it manually.
        pause
    ) else (
        echo   PostgreSQL service started: !PGSERVICE!.
    )
) else (
    echo   PostgreSQL service is already running: !PGSERVICE!.
)
endlocal
goto :EOF
:continue_startup

REM First-run bootstrap: auto-setup if .installed marker is missing
if not exist "%~dp0.installed" (
    echo.
    echo ============================================
    echo  First-run detected - running auto-setup...
    echo ============================================
    echo.

    REM --- Ensure PostgreSQL is installed before bootstrap ---
    call :ensure_postgresql_install

    python "%~dp0bootstrap.py"
    if errorlevel 1 (
        echo.
        echo [WARN] Bootstrap had issues - attempting to continue...
        echo.
    )
)

REM Venv health check: re-run bootstrap if venv is missing/corrupted (even after first-run)
if not exist "%~dp0backend\venv\Scripts\python.exe" (
    echo.
    echo ============================================
    echo  Virtual environment missing - repairing...
    echo ============================================
    echo.
    python "%~dp0bootstrap.py"
    if errorlevel 1 (
        echo.
        echo [WARN] Bootstrap repair had issues - attempting to continue...
        echo.
    )
)

REM Run with arguments passed through, or default to standard start
REM Strip -l and -m from args (already handled above)
set "ARGS=!REMAINING_ARGS!"

REM Trim leading space
if defined ARGS set "ARGS=!ARGS:~1!"

if not defined ARGS (
    .\scripts\drive-alive.bat start
) else if "!ARGS:~0,2!"=="-d" (
    .\scripts\drive-alive.bat start !ARGS!
) else if "!ARGS:~0,2!"=="-b" (
    .\scripts\drive-alive.bat start !ARGS!
) else if "!ARGS:~0,2!"=="-f" (
    .\scripts\drive-alive.bat start !ARGS!
) else if "!ARGS:~0,2!"=="-n" (
    .\scripts\drive-alive.bat start !ARGS!
) else (
    .\scripts\drive-alive.bat !ARGS!
)
goto :eof

:ensure_postgresql_install
echo.
echo ============================================
echo  Checking PostgreSQL installation...
echo ============================================
where psql >nul 2>&1
if not errorlevel 1 goto :pg_install_ok
REM Check common install directories (17 down to 13)
if exist "C:\Program Files\PostgreSQL\17\bin\psql.exe" set "PATH=C:\Program Files\PostgreSQL\17\bin;!PATH!" & goto :pg_install_ok
if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" set "PATH=C:\Program Files\PostgreSQL\16\bin;!PATH!" & goto :pg_install_ok
if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" set "PATH=C:\Program Files\PostgreSQL\15\bin;!PATH!" & goto :pg_install_ok
if exist "C:\Program Files\PostgreSQL\14\bin\psql.exe" set "PATH=C:\Program Files\PostgreSQL\14\bin;!PATH!" & goto :pg_install_ok
if exist "C:\Program Files\PostgreSQL\13\bin\psql.exe" set "PATH=C:\Program Files\PostgreSQL\13\bin;!PATH!" & goto :pg_install_ok
REM Not found - try winget install
echo   [WARN] PostgreSQL not found. Attempting install via winget...
winget --version >nul 2>&1
if errorlevel 1 goto :pg_no_winget
winget install --id PostgreSQL.PostgreSQL.16 -e --source winget --silent --accept-package-agreements --accept-source-agreements
if errorlevel 1 goto :pg_winget_failed
echo   [OK] PostgreSQL installed via winget.
if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" set "PATH=C:\Program Files\PostgreSQL\16\bin;!PATH!"
if exist "C:\Program Files\PostgreSQL\17\bin\psql.exe" set "PATH=C:\Program Files\PostgreSQL\17\bin;!PATH!"
goto :pg_install_ok

:pg_no_winget
echo   [WARN] winget not available.
echo         bootstrap.py will attempt to download and install PostgreSQL.
echo         Or install manually: https://www.postgresql.org/download/windows/
goto :eof

:pg_winget_failed
echo   [WARN] winget install failed.
echo         bootstrap.py will attempt to download and install PostgreSQL.
echo         Or install manually: https://www.postgresql.org/download/windows/
goto :eof

:pg_install_ok
for /f "tokens=*" %%v in ('psql --version 2^>nul') do echo   [OK] %%v
goto :eof

:show_help
echo.
echo DRIVE ALIVE - Quick Start Commands
echo ====================================
echo.
echo USAGE:
echo   s.bat [OPTIONS]
echo.
echo OPTIONS:
echo   (no args)        Start servers - auto-detect mode from .env (default)
echo   -l               Switch to localhost mode (HTTPS) before starting
echo   -m               Switch to mobile/network mode (HTTP) before starting
echo   -d               Open frontend in Edge with developer tools
echo   -h, --help, /?   Show this help message
echo.
echo   Flags can be combined: s.bat -l -d
echo.
echo EXAMPLES:
echo   s.bat                 # Auto-detect localhost/network mode from .env
echo   s.bat -l              # Switch to localhost (HTTPS) and start
echo   s.bat -m              # Switch to network/mobile (HTTP) and start
echo   s.bat -l -d           # Localhost HTTPS + open Edge with dev tools
echo   s.bat -m -d           # Network mode + open Edge with dev tools
echo   s.bat -d              # Start with dev tools (auto-detects mode)
echo   s.bat -n              # Start without opening browser
echo   s.bat -b              # Start backend only
echo   s.bat -f              # Start frontend only (auto-detects mode)
echo.
echo ENVIRONMENT MODE:
echo   -l and -m flags auto-switch the .env before starting.
echo   The script reads backend\.env to determine:
echo   - FRONTEND_URL=http://localhost:8081    ^=^> localhost + HTTPS
echo   - FRONTEND_URL=http://10.0.0.121:8081   ^=^> network + HTTP
echo.
echo   You can also switch manually:
echo   cd backend
echo   .\switch-env.ps1 -Env loc    # Switch to localhost
echo   .\switch-env.ps1 -Env net    # Switch to network (mobile)
echo.
echo For more options, see:
echo   scripts\drive-alive.bat -h
echo.
