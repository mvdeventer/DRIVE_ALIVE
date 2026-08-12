#!/usr/bin/env python3
"""
da.py  –  Drive Alive project manager
======================================
Single entry-point that replaces all bat/ps1 scripts.

    python scripts/da.py <command> [options]
    s.bat                 <command> [options]   (thin wrapper)

Run `s.bat help` for the complete, always-up-to-date command reference:
it is generated from the argument parser itself, so any newly implemented
command or flag appears there automatically.
"""

from __future__ import annotations

import argparse
import webbrowser
import os
import re
import shutil
import socket
import subprocess
import sys
import time
from pathlib import Path

from release_workflow import ReleaseError, execute_release

# ── Console encoding ───────────────────────────────────────────────────────────
# Every banner in this file contains box-drawing characters, arrows and emoji.
# When stdout is a pipe rather than a console (CI, `| tail`, log capture),
# Windows Python falls back to cp1252 and the first such character raises
# UnicodeEncodeError — killing the command *before* it does any work. Force
# UTF-8 and degrade gracefully instead of crashing.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        try:
            _stream.reconfigure(encoding="utf-8", errors="replace")
        except (ValueError, OSError):
            pass

# ── Constants ──────────────────────────────────────────────────────────────────

ROOT = Path(__file__).resolve().parent.parent       # repo root
BACKEND_DIR = ROOT / "backend"
FRONTEND_DIR = ROOT / "frontend"
VENV_DIR = BACKEND_DIR / "venv"
VENV_PYTHON = VENV_DIR / "Scripts" / "python.exe"
VENV_PIP = VENV_DIR / "Scripts" / "pip.exe"
VENV_ACTIVATE = VENV_DIR / "Scripts" / "activate.bat"
REQUIREMENTS = BACKEND_DIR / "requirements.txt"
ENV_FILE = BACKEND_DIR / ".env"
ENV_EXAMPLE = BACKEND_DIR / ".env.example"
INSTALLED_MARKER = ROOT / ".installed"
BACKEND_PID_FILE = BACKEND_DIR / ".backend.pid"
FRONTEND_PID_FILE = FRONTEND_DIR / ".frontend.pid"
BACKEND_PORT = 8000
FRONTEND_PORT = 8081

# ── Colour helpers (Windows 10+ ANSI) ─────────────────────────────────────────

_COLOURS = {
    "reset": "\033[0m",
    "green": "\033[92m",
    "yellow": "\033[93m",
    "red": "\033[91m",
    "cyan": "\033[96m",
    "blue": "\033[94m",
}


def _c(colour: str, text: str) -> str:
    return f"{_COLOURS.get(colour, '')}{text}{_COLOURS['reset']}"


def ok(msg: str) -> None:
    print(_c("green", f"  [OK] {msg}"))


def info(msg: str) -> None:
    print(_c("cyan", f"  [INFO] {msg}"))


def warn(msg: str) -> None:
    print(_c("yellow", f"  [WARN] {msg}"))


def err(msg: str) -> None:
    print(_c("red", f"  [ERROR] {msg}"), file=sys.stderr)


def header(title: str) -> None:
    bar = "=" * 60
    print(f"\n{_c('cyan', bar)}")
    print(_c("cyan", f"  {title}"))
    print(_c("cyan", bar))


def step(n: int, total: int, title: str) -> None:
    print(f"\n{_c('blue', f'--- Step {n}/{total}: {title} ---')}")


# ── Subprocess helpers ─────────────────────────────────────────────────────────


def run(cmd: list[str], cwd: Path | None = None, check: bool = True,
        capture: bool = False, shell: bool = False) -> subprocess.CompletedProcess:
    """Run a command, streaming output unless capture=True."""
    return subprocess.run(
        cmd, cwd=cwd or ROOT,
        capture_output=capture,
        text=True,
        check=check,
        shell=shell,
    )


def run_silent(cmd: list[str], cwd: Path | None = None) -> bool:
    """Return True if command exits 0."""
    try:
        subprocess.run(cmd, cwd=cwd or ROOT, capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def open_new_window(title: str, cmd_str: str, cwd: Path) -> int | None:
    """
    Open a new Command Prompt window with *title* running *cmd_str*.
    Returns the PID of the new cmd.exe process.
    """
    ps = (
        f"$p = Start-Process cmd "
        f"-ArgumentList '/k','title {title} && {cmd_str}' "
        f"-WorkingDirectory '{cwd}' "
        f"-WindowStyle Normal -PassThru; "
        f"Write-Output $p.Id"
    )
    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command", ps],
        capture_output=True, text=True
    )
    try:
        return int(result.stdout.strip())
    except ValueError:
        return None


# ── PostgreSQL helpers ─────────────────────────────────────────────────────────

def _find_pg_service() -> str | None:
    """Return the name of the first postgres* Windows service, or None."""
    ps = (
        "$svc = Get-Service | Where-Object {$_.Name -like '*postgres*'} "
        "| Select-Object -First 1 -ExpandProperty Name; "
        "if ($svc) { Write-Output $svc }"
    )
    try:
        r = subprocess.run(
            ["powershell", "-NoProfile", "-Command", ps],
            capture_output=True, text=True, timeout=10
        )
        name = r.stdout.strip()
        return name if name else None
    except Exception:
        return None


def ensure_postgres_running() -> None:
    """Start the PostgreSQL Windows service if it exists and is stopped."""
    header("PostgreSQL")
    svc = _find_pg_service()
    if not svc:
        info("No PostgreSQL Windows service found – assuming it is already running or managed externally.")
        return

    info(f"Service detected: {svc}")
    # Check if running
    ps_check = f"(Get-Service -Name '{svc}').Status"
    r = subprocess.run(
        ["powershell", "-NoProfile", "-Command", ps_check],
        capture_output=True, text=True
    )
    status = r.stdout.strip()
    if status.lower() == "running":
        ok(f"{svc} is already running.")
        return

    info(f"Starting {svc} …")
    try:
        subprocess.run(
            ["powershell", "-NoProfile", "-Command", f"Start-Service -Name '{svc}'"],
            check=True, capture_output=True
        )
        ok(f"{svc} started.")
    except subprocess.CalledProcessError:
        err(f"Could not start {svc}. Start PostgreSQL manually and retry.")


DB_APP_NAME = "driving_school_db"


def _find_psql() -> Path | None:
    """Find psql.exe in PATH or common install locations."""
    if shutil.which("psql"):
        return Path(shutil.which("psql"))  # type: ignore[arg-type]
    for v in range(17, 12, -1):
        p = Path(f"C:/Program Files/PostgreSQL/{v}/bin/psql.exe")
        if p.exists():
            return p
    return None


def _detect_pg_port() -> str:
    """Read the port PostgreSQL is actually listening on from postgresql.conf."""
    for v in range(17, 12, -1):
        conf = Path(f"C:/Program Files/PostgreSQL/{v}/data/postgresql.conf")
        if conf.exists():
            for line in conf.read_text(encoding="utf-8", errors="ignore").splitlines():
                m = re.match(r"^\s*port\s*=\s*(\d+)", line)
                if m:
                    return m.group(1)
    return "5432"


def _pg_env(password: str) -> dict:
    """Return OS environment with PGPASSWORD set (or cleared)."""
    env = os.environ.copy()
    if password:
        env["PGPASSWORD"] = password
    else:
        env.pop("PGPASSWORD", None)
    return env


def _pg_authenticate(psql: Path, host: str, port: str) -> str | None:
    """
    Try to connect as 'postgres' superuser.  Tries the default password first,
    then prompts up to 3 times.  Returns the working password, or None on failure.
    """
    import getpass
    for candidate in ("postgres", ""):
        r = subprocess.run(
            [str(psql), "-U", "postgres", "-h", host, "-p", port,
             "-c", "SELECT 1", "-t", "postgres"],
            capture_output=True, text=True, env=_pg_env(candidate),
        )
        if r.returncode == 0:
            return candidate
    print()
    warn("Cannot connect as 'postgres' with the default password.")
    warn("Enter the PostgreSQL superuser password once to provision the database.")
    for _ in range(3):
        attempt = getpass.getpass("  postgres password: ")
        r = subprocess.run(
            [str(psql), "-U", "postgres", "-h", host, "-p", port,
             "-c", "SELECT 1", "-t", "postgres"],
            capture_output=True, text=True, env=_pg_env(attempt),
        )
        if r.returncode == 0:
            return attempt
        err("Incorrect password, try again.")
    return None


def _psql_run(psql: Path, host: str, port: str, pg_env: dict, sql: str) -> subprocess.CompletedProcess:
    """Run a single SQL statement as the postgres superuser."""
    return subprocess.run(
        [str(psql), "-U", "postgres", "-h", host, "-p", port, "-c", sql, "postgres"],
        capture_output=True, text=True, env=pg_env,
    )


def provision_database(force: bool = False) -> bool:
    """
    Auto-create a dedicated PostgreSQL role + database with generated credentials
    and write DATABASE_URL to backend/.env.  Fully zero-interaction on a fresh
    install (tries default password 'postgres' first).  Idempotent – skipped if
    credentials are already valid unless force=True.
    """
    import secrets as _secrets

    psql = _find_psql()
    if not psql:
        warn("psql not found – skipping automatic database provisioning.")
        warn("Install PostgreSQL and re-run, or configure the DB manually via the setup wizard.")
        return False

    pg_host = "localhost"
    pg_port = _detect_pg_port()

    # ── Already provisioned? ───────────────────────────────────────────────────
    existing_url = read_env().get("DATABASE_URL", "")
    is_placeholder = not existing_url or "user:password@" in existing_url
    if not is_placeholder and not force:
        ok(f"Database already provisioned.")
        info(f"  {existing_url.split('@')[-1] if '@' in existing_url else existing_url}")
        return True

    # ── Connect as superuser ───────────────────────────────────────────────────
    info(f"Connecting to PostgreSQL on port {pg_port} as superuser…")
    su_pass = _pg_authenticate(psql, pg_host, pg_port)
    if su_pass is None:
        err("Could not authenticate to PostgreSQL – database provisioning skipped.")
        return False
    ok(f"Connected to PostgreSQL on port {pg_port}.")
    pg_e = _pg_env(su_pass)

    # ── Generate app credentials ───────────────────────────────────────────────
    app_user = f"drivalive_{_secrets.token_hex(4)}"
    app_pass = _secrets.token_urlsafe(24)

    # ── --force: drop existing DB + old role ──────────────────────────────────
    if force:
        for sql in [
            f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='{DB_APP_NAME}';",
            f"DROP DATABASE IF EXISTS {DB_APP_NAME};",
        ]:
            _psql_run(psql, pg_host, pg_port, pg_e, sql)
        if "://" in existing_url:
            old_user = existing_url.split("://")[1].split(":")[0]
            if old_user not in ("postgres", "user", ""):
                _psql_run(psql, pg_host, pg_port, pg_e, f"DROP ROLE IF EXISTS {old_user};")

    # ── Create role ───────────────────────────────────────────────────────────
    r = _psql_run(psql, pg_host, pg_port, pg_e,
                  f"CREATE ROLE {app_user} WITH LOGIN PASSWORD '{app_pass}';")
    if r.returncode != 0 and "already exists" not in r.stderr:
        err(f"Could not create DB role: {r.stderr.strip()}")
        return False
    ok(f"DB role created: {app_user}")

    # ── Create database ───────────────────────────────────────────────────────
    r = _psql_run(psql, pg_host, pg_port, pg_e,
                  f"CREATE DATABASE {DB_APP_NAME} OWNER {app_user};")
    if r.returncode != 0:
        if "already exists" in r.stderr:
            _psql_run(psql, pg_host, pg_port, pg_e,
                      f"GRANT ALL PRIVILEGES ON DATABASE {DB_APP_NAME} TO {app_user};")
            ok(f"Database '{DB_APP_NAME}' already exists – permissions granted to {app_user}.")
        else:
            err(f"Could not create database: {r.stderr.strip()}")
            return False
    else:
        ok(f"Database '{DB_APP_NAME}' created.")

    # ── Write DATABASE_URL to .env ─────────────────────────────────────────────
    db_url = f"postgresql://{app_user}:{app_pass}@{pg_host}:{pg_port}/{DB_APP_NAME}"
    write_env_value("DATABASE_URL", db_url)
    ok("DATABASE_URL written to backend/.env  (credentials are auto-generated & encoded).")
    info(f"  DB host  : {pg_host}:{pg_port}")
    info(f"  DB name  : {DB_APP_NAME}")
    info(f"  DB user  : {app_user}")
    return True


# ── Venv helpers ───────────────────────────────────────────────────────────────

def _venv_is_healthy() -> bool:
    """Return True only if the venv has both python.exe AND pyvenv.cfg."""
    return VENV_PYTHON.exists() and (VENV_DIR / "pyvenv.cfg").exists()


def _create_venv() -> None:
    """
    Create the venv, working around Python 3.14's venvlauncher.exe copy bug.
    Falls back to 'virtualenv' package when the built-in venv fails.
    """
    info(f"Python executable : {sys.executable}")
    info(f"Venv target       : {VENV_DIR}")
    # First attempt: built-in venv
    info("Running: python -m venv …")
    result = subprocess.run(
        [sys.executable, "-m", "venv", str(VENV_DIR)],
        capture_output=True, text=True
    )
    if result.returncode == 0 and _venv_is_healthy():
        return

    # Built-in venv failed (common on Python 3.14 on Windows).
    warn("Built-in venv failed – installing 'virtualenv' as fallback …")
    if VENV_DIR.exists():
        shutil.rmtree(VENV_DIR, ignore_errors=True)

    subprocess.run(
        [sys.executable, "-m", "pip", "install", "--quiet", "virtualenv"],
        check=True
    )
    subprocess.run(
        [sys.executable, "-m", "virtualenv", str(VENV_DIR)],
        check=True
    )


def ensure_venv(fresh: bool = False) -> None:
    """Create venv if missing or corrupted; install/verify deps.

    Pass fresh=True when the caller has already removed the directory
    (e.g. --force install) so the status message is accurate.
    """
    header("Python Virtual Environment")
    if not _venv_is_healthy():
        if fresh:
            info("Creating fresh virtual environment …")
        elif VENV_DIR.exists():
            warn("Virtual environment is corrupted – recreating …")
            shutil.rmtree(VENV_DIR, ignore_errors=True)
        else:
            warn("Virtual environment missing – creating …")
        _create_venv()
        ok("Virtual environment created.")
    else:
        ok("Virtual environment exists.")

    # Verify fastapi importable; install if not
    if not run_silent([str(VENV_PYTHON), "-c", "import fastapi"]):
        info(f"Installing backend dependencies …")
        info(f"  Requirements : {REQUIREMENTS}")
        info(f"  Pip          : {VENV_PIP}")
        result = run(
            [str(VENV_PYTHON), "-m", "pip", "install", "-r", str(REQUIREMENTS)],
            check=False,
        )
        if result.returncode != 0:
            # Retry once with --force-reinstall in case of locked/partial files
            warn("First pip attempt failed – retrying with --force-reinstall …")
            result2 = run(
                [str(VENV_PYTHON), "-m", "pip", "install",
                 "--force-reinstall", "-r", str(REQUIREMENTS)],
                check=False,
            )
            if result2.returncode != 0:
                err("pip install failed. If you see 'Access is denied', stop running servers first.")
                err("Run: s.bat stop  then  s.bat install --force")
                sys.exit(1)
        ok("Backend dependencies installed.")
    else:
        ok("Backend dependencies already satisfied.")


def install_backend_deps(quiet: bool = False) -> None:
    """Force pip install."""
    flags = ["--quiet"] if quiet else []
    run([str(VENV_PYTHON), "-m", "pip", "install"] + flags + ["-r", str(REQUIREMENTS)])
    ok("Backend dependencies installed.")


# ── Frontend helpers ───────────────────────────────────────────────────────────

def ensure_node_modules() -> None:
    """npm install if expo package is absent."""
    header("Frontend Dependencies")
    expo_check = FRONTEND_DIR / "node_modules" / "expo"
    if expo_check.exists():
        ok("Frontend node_modules present.")
        return

    if not shutil.which("node"):
        err("Node.js not found. Install from https://nodejs.org and re-run.")
        sys.exit(1)

    info("Running npm install (this may take a minute) …")
    # npm/npx are .cmd wrappers on Windows – require shell=True
    run(["npm", "install", "--legacy-peer-deps"], cwd=FRONTEND_DIR, shell=True)
    ok("Frontend dependencies installed.")


# ── Git hooks ──────────────────────────────────────────────────────────────────

def ensure_git_hooks() -> None:
    """
    Point git at the tracked .githooks/ directory.

    The pre-commit secret scan used to live in .git/hooks, which is not
    tracked — so it existed only on the machine that created it and was lost
    on every fresh clone. Setting core.hooksPath makes the hook travel with
    the repo.
    """
    header("Git Hooks")
    hooks_dir = ROOT / ".githooks"
    if not hooks_dir.is_dir():
        warn(".githooks/ not found – skipping hook setup.")
        return
    if not (ROOT / ".git").exists():
        info("Not a git checkout – skipping hook setup.")
        return

    r = subprocess.run(
        ["git", "config", "core.hooksPath", ".githooks"],
        cwd=ROOT, capture_output=True, text=True,
    )
    if r.returncode != 0:
        warn(f"Could not set core.hooksPath: {r.stderr.strip()}")
        return
    ok("Pre-commit secret scan enabled (core.hooksPath -> .githooks).")


# ── .env helpers ───────────────────────────────────────────────────────────────

def ensure_env_file() -> None:
    """Create .env from .env.example if missing, auto-generating required secrets."""
    import secrets as _secrets

    def _patch_env(content: str) -> tuple[str, list[str]]:
        """Fill in any empty generated fields; return (patched_content, list_of_changes)."""
        changes: list[str] = []

        # Auto-generate SECRET_KEY if blank
        if re.search(r"^SECRET_KEY\s*=\s*$", content, re.MULTILINE):
            secret_key = _secrets.token_urlsafe(48)
            content = re.sub(
                r"^(SECRET_KEY\s*=)\s*$", f"\\g<1>{secret_key}", content, flags=re.MULTILINE
            )
            changes.append("SECRET_KEY")

        # Auto-generate ENCRYPTION_KEY if blank or still placeholder
        if re.search(r"^ENCRYPTION_KEY\s*=\s*(your-.*)?$", content, re.MULTILINE):
            try:
                from cryptography.fernet import Fernet
                enc_key = Fernet.generate_key().decode()
            except ImportError:
                enc_key = _secrets.token_urlsafe(32)
            content = re.sub(
                r"^(ENCRYPTION_KEY\s*=)\s*(your-.*)?$", f"\\g<1>{enc_key}", content, flags=re.MULTILINE
            )
            changes.append("ENCRYPTION_KEY")

        return content, changes

    if ENV_FILE.exists():
        existing = ENV_FILE.read_text(encoding="utf-8")
        patched, changes = _patch_env(existing)
        if changes:
            ENV_FILE.write_text(patched, encoding="utf-8")
            ok(f".env updated – auto-generated: {', '.join(changes)}")
        else:
            ok(".env file present.")
        return

    if ENV_EXAMPLE.exists():
        content = ENV_EXAMPLE.read_text(encoding="utf-8")
        content, changes = _patch_env(content)
        ENV_FILE.write_text(content, encoding="utf-8")
        ok(f".env created with auto-generated: {', '.join(changes) or 'secrets'}.")
        info("Edit backend/.env to add your DATABASE_URL, SMTP, and other credentials.")
        info("Or visit http://localhost:8000/db-setup after starting to configure via the wizard.")
    else:
        warn(".env.example not found – .env must be created manually.")


def read_env() -> dict[str, str]:
    """Parse .env into a dict."""
    result: dict[str, str] = {}
    if not ENV_FILE.exists():
        return result
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            result[k.strip()] = v.strip()
    return result


def write_env_value(key: str, value: str) -> None:
    """Update or append a key in .env."""
    if not ENV_FILE.exists():
        ENV_FILE.write_text(f"{key}={value}\n", encoding="utf-8")
        return
    lines = ENV_FILE.read_text(encoding="utf-8").splitlines()
    found = False
    new_lines = []
    for line in lines:
        if re.match(rf"^\s*{re.escape(key)}\s*=", line):
            new_lines.append(f"{key}={value}")
            found = True
        else:
            new_lines.append(line)
    if not found:
        new_lines.append(f"{key}={value}")
    ENV_FILE.write_text("\n".join(new_lines) + "\n", encoding="utf-8")


def detect_local_ip() -> str | None:
    """Return the machine's LAN IPv4 address."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return None


def _find_chromium_browser() -> Path | None:
    """
    Find Chrome or Edge executable (searches PATH then common Windows install dirs).
    Returns the first one found, or None.
    """
    # PATH search first
    for name in ("google-chrome", "chrome", "chromium", "msedge", "microsoft-edge"):
        if shutil.which(name):
            return Path(shutil.which(name))  # type: ignore[arg-type]

    # Common Windows install locations
    candidates = [
        Path(os.environ.get("ProgramFiles", r"C:\Program Files"))
        / "Google" / "Chrome" / "Application" / "chrome.exe",
        Path(os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)"))
        / "Google" / "Chrome" / "Application" / "chrome.exe",
        Path(os.environ.get("LOCALAPPDATA", "")) / "Google" / "Chrome" / "Application" / "chrome.exe",
        Path(os.environ.get("ProgramFiles", r"C:\Program Files"))
        / "Microsoft" / "Edge" / "Application" / "msedge.exe",
        Path(os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)"))
        / "Microsoft" / "Edge" / "Application" / "msedge.exe",
        Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "Edge" / "Application" / "msedge.exe",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


def _open_with_devtools(url: str) -> None:
    """Open url in Chrome/Edge with DevTools pre-opened; fall back to default browser."""
    browser = _find_chromium_browser()
    if browser:
        info(f"Opening {browser.name} with DevTools: {url}")
        subprocess.Popen(
            [str(browser), "--auto-open-devtools-for-tabs", url]
        )
    else:
        warn("Chrome/Edge not found in common locations – opening default browser (no DevTools).")
        webbrowser.open(url)


# ── Environment switcher ───────────────────────────────────────────────────────

def cmd_env(target: str) -> None:
    """Switch FRONTEND_URL / ALLOWED_ORIGINS in backend/.env."""
    aliases = {
        "loc": "local", "local": "local",
        "net": "network", "network": "network",
        "prod": "production", "production": "production",
    }
    mode = aliases.get(target.lower())
    if not mode:
        err(f"Unknown environment '{target}'. Use: loc | net | prod")
        sys.exit(1)

    header(f"Switching environment → {mode.upper()}")
    ensure_env_file()

    if mode == "local":
        frontend_url = "http://localhost:8081"
        origins = "http://localhost:3000,http://localhost:8081,https://localhost:3000,https://localhost:8081,https://localhost:8443"
        ok(f"FRONTEND_URL = {frontend_url}")

    elif mode == "network":
        ip = detect_local_ip()
        if not ip:
            err("Could not detect local IP address.")
            sys.exit(1)
        frontend_url = f"http://{ip}:8081"
        origins = (
            f"http://localhost:3000,http://localhost:8081,"
            f"http://{ip}:3000,http://{ip}:8081"
        )
        ok(f"Detected IP: {ip}")
        ok(f"FRONTEND_URL = {frontend_url}")

    else:  # production
        info("For production set these in your Render Dashboard or .env:")
        print("  FRONTEND_URL=https://drive-alive-web.onrender.com")
        print("  ALLOWED_ORIGINS=https://drive-alive-web.onrender.com")
        print("  ENVIRONMENT=production")
        print("  DEBUG=False")
        return

    write_env_value("FRONTEND_URL", frontend_url)
    write_env_value("ALLOWED_ORIGINS", origins)
    write_env_value("ENVIRONMENT", "development")
    ok("Environment updated. Restart servers for changes to take effect.")


# ── PID file helpers ───────────────────────────────────────────────────────────

def _write_pid(pid_file: Path, pid: int) -> None:
    pid_file.write_text(str(pid), encoding="utf-8")


def _read_pid(pid_file: Path) -> int | None:
    try:
        return int(pid_file.read_text(encoding="utf-8").strip())
    except Exception:
        return None


def _kill_pid(pid: int) -> bool:
    try:
        subprocess.run(
            ["taskkill", "/T", "/PID", str(pid)],
            capture_output=True, check=False
        )
        time.sleep(0.5)
        subprocess.run(
            ["taskkill", "/F", "/T", "/PID", str(pid)],
            capture_output=True, check=False
        )
        return True
    except Exception:
        return False


def _port_in_use(port: int) -> list[int]:
    """Return list of PIDs listening on port."""
    pids: list[int] = []
    try:
        r = subprocess.run(
            ["netstat", "-ano"],
            capture_output=True, text=True
        )
        for line in r.stdout.splitlines():
            if f":{port} " in line and "LISTENING" in line:
                parts = line.split()
                if parts:
                    try:
                        pids.append(int(parts[-1]))
                    except ValueError:
                        pass
    except Exception:
        pass
    return pids


def _kill_port(port: int) -> None:
    for pid in _port_in_use(port):
        _kill_pid(pid)


# ── Stop ───────────────────────────────────────────────────────────────────────

def cmd_stop(silent: bool = False) -> None:
    if not silent:
        header("Stopping servers")

    for label, pid_file, ports in [
        ("Backend", BACKEND_PID_FILE, [BACKEND_PORT]),
        ("Frontend", FRONTEND_PID_FILE, [FRONTEND_PORT, 19000, 8443]),
    ]:
        pid = _read_pid(pid_file) if pid_file.exists() else None
        if pid:
            _kill_pid(pid)
            try:
                pid_file.unlink()
            except FileNotFoundError:
                pass
            if not silent:
                ok(f"{label} process stopped (PID {pid}).")

        for p in ports:
            _kill_port(p)

    if not silent:
        ok("All servers stopped.")


# ── Start ──────────────────────────────────────────────────────────────────────

def _detect_env_mode() -> tuple[str, str]:
    """
    Returns (mode, expo_flag): mode is 'local'|'network', expo_flag is
    '--localhost' or '--host lan'.
    """
    env = read_env()
    url = env.get("FRONTEND_URL", "http://localhost:8081")
    if "localhost" in url or "127.0.0.1" in url:
        return "local", "--localhost"
    return "network", "--host lan"


def cmd_start(
    backend_only: bool = False,
    frontend_only: bool = False,
    dev_mode: bool = False,
    debug_mode: bool = False,
    switch_env: str | None = None,
) -> None:
    """Start backend and/or frontend servers."""

    # Optionally switch env first
    if switch_env:
        cmd_env(switch_env)

    # Health checks
    if not frontend_only:
        ensure_postgres_running()
    ensure_venv()
    ensure_node_modules()
    ensure_env_file()

    # Stop any existing servers first
    cmd_stop(silent=True)

    header("Starting servers")

    if debug_mode:
        print(_c("yellow", "  ⚠  DEBUG MODE ACTIVE — verbose logging enabled, forms pre-filled"))
        print(_c("yellow", "     Do NOT use this in production."))
        print()

    env_mode, expo_flag = _detect_env_mode()
    info(f"Environment mode: {env_mode.upper()}")

    # ── Backend ────────────────────────────────────────────────────────────────
    if not frontend_only:
        uvicorn_log_level = "debug" if debug_mode else "info"
        debug_env = 'set "DEBUG=True" && set "LOG_LEVEL=debug" && ' if debug_mode else ""
        backend_cmd = (
            f"{debug_env}"
            f"call venv\\Scripts\\activate.bat && "
            f"python -m uvicorn app.main:app --reload --log-level {uvicorn_log_level}"
            f" --host 0.0.0.0 --port {BACKEND_PORT}"
        )
        pid = open_new_window("Drive Alive - Backend", backend_cmd, BACKEND_DIR)
        if pid:
            _write_pid(BACKEND_PID_FILE, pid)
            ok(f"Backend started (PID {pid}) → http://localhost:{BACKEND_PORT}")
            info(f"  API docs: http://localhost:{BACKEND_PORT}/docs")
            if debug_mode:
                info(f"  Debug: LOG_LEVEL=debug | DEBUG=True | --reload")
        else:
            warn("Could not determine backend PID.")

        info("Waiting for backend to initialise …")
        time.sleep(4)

    # ── Frontend ───────────────────────────────────────────────────────────────
    if not backend_only:
        # Use quoted set syntax: set "VAR=value" prevents cmd.exe from
        # including trailing spaces (before &&) in the variable value.
        # EXPO_OFFLINE must be "1" not "true" – Expo uses getenv.boolish().
        # In dev mode set BROWSER=none so Expo doesn't auto-open; we open
        # Chrome with DevTools ourselves instead.
        expo_env = 'set "EXPO_OFFLINE=1" && '
        if debug_mode:
            expo_env += 'set "EXPO_PUBLIC_DEBUG_MODE=true" && '
        if dev_mode:
            expo_env += 'set "BROWSER=none" && '
        frontend_cmd = (
            f"{expo_env}npx expo start --web {expo_flag}"
        )
        pid = open_new_window("Drive Alive - Frontend", frontend_cmd, FRONTEND_DIR)
        if pid:
            _write_pid(FRONTEND_PID_FILE, pid)
            ok(f"Frontend started (PID {pid}) → http://localhost:{FRONTEND_PORT}")
            if debug_mode:
                info(f"  Debug: EXPO_PUBLIC_DEBUG_MODE=true (forms pre-filled)")
        else:
            warn("Could not determine frontend PID.")

        # In dev mode open Chrome with DevTools; in normal mode Expo handles
        # auto-opening the browser, so we don't open a second tab here.
        if dev_mode:
            time.sleep(3)
            _open_with_devtools(f"http://localhost:{FRONTEND_PORT}")

    print()
    print(_c("green", "  Servers are starting in separate windows."))
    print(_c("cyan",  f"  Frontend : http://localhost:{FRONTEND_PORT}"))
    print(_c("cyan",  f"  Backend  : http://localhost:{BACKEND_PORT}"))
    print(_c("cyan",  f"  API docs : http://localhost:{BACKEND_PORT}/docs"))
    print()
    print(_c("yellow", "  Run  's.bat stop'  to stop all servers."))
    print()


# ── Install ────────────────────────────────────────────────────────────────────

def cmd_install(force: bool = False, offline: bool = False) -> None:
    header("Drive Alive – Full Install")

    if INSTALLED_MARKER.exists() and not force:
        ok("Already installed. Run with --force to reinstall.")
        print(f"\n  Start the app:  s.bat\n")
        return

    # Stop any running servers before touching venv/node_modules files
    if force:
        info("Stopping any running servers before reinstall …")
        cmd_stop(silent=True)
        time.sleep(1)

    total_steps = 6
    errors: list[str] = []

    # ── Step 1: Python ──────────────────────────────────────────────────────────
    step(1, total_steps, "Python")
    ver = sys.version_info
    if ver < (3, 9):
        err(f"Python 3.9+ required (found {ver.major}.{ver.minor}).")
        sys.exit(1)
    ok(f"Python {ver.major}.{ver.minor}.{ver.micro}")
    info(f"  Executable : {sys.executable}")

    # ── Step 2: Node.js ─────────────────────────────────────────────────────────
    step(2, total_steps, "Node.js")
    if shutil.which("node"):
        r = subprocess.run(["node", "--version"], capture_output=True, text=True)
        ok(f"Node.js {r.stdout.strip()}")
        info(f"  Executable : {shutil.which('node')}")
        npm_path = shutil.which("npm")
        if npm_path:
            info(f"  npm        : {npm_path}")
    else:
        err("Node.js not found. Install from https://nodejs.org")
        errors.append("Node.js missing")

    # ── Step 3: PostgreSQL ──────────────────────────────────────────────────────
    step(3, total_steps, "PostgreSQL")
    psql = _find_psql()
    if psql:
        r = subprocess.run([str(psql), "--version"], capture_output=True, text=True)
        ok(f"{r.stdout.strip()}")
        info(f"  psql path  : {psql}")
        info(f"  Port       : {_detect_pg_port()}")
    else:
        warn("psql not found in PATH or common locations.")
        warn("If PostgreSQL is installed, ensure its bin folder is in PATH.")
        warn("Download: https://www.postgresql.org/download/windows/")
        errors.append("psql not in PATH – database provisioning skipped")

    ensure_postgres_running()

    # ── Step 4: Backend setup ───────────────────────────────────────────────────
    step(4, total_steps, "Backend – venv + dependencies")
    info(f"  Venv path  : {VENV_DIR}")
    info(f"  Backend    : {BACKEND_DIR}")
    force_venv = VENV_DIR.exists() and force
    if force_venv:
        info("--force: removing existing venv …")
        shutil.rmtree(VENV_DIR, ignore_errors=True)
    ensure_venv(fresh=force_venv)
    ensure_env_file()

    # ── Step 5: Database provisioning ──────────────────────────────────────────
    step(5, total_steps, "Database – auto-provision")
    if not provision_database(force=force):
        errors.append("Database provisioning failed – configure manually via /db-setup")

    # ── Step 6: Frontend setup ──────────────────────────────────────────────────
    step(6, total_steps, "Frontend – npm install")
    info(f"  Frontend   : {FRONTEND_DIR}")
    if (FRONTEND_DIR / "node_modules").exists() and force:
        info("--force: removing existing node_modules …")
        shutil.rmtree(FRONTEND_DIR / "node_modules", ignore_errors=True)
    ensure_node_modules()

    # ── Git hooks ───────────────────────────────────────────────────────────────
    ensure_git_hooks()

    # ── Mark installed ──────────────────────────────────────────────────────────
    INSTALLED_MARKER.write_text("installed", encoding="utf-8")

    print()
    bar = "=" * 60
    print(_c("green", bar))
    if errors:
        print(_c("yellow", "  INSTALL COMPLETE  (with warnings – see above)"))
    else:
        print(_c("green", "  INSTALL COMPLETE"))
    print(_c("green", bar))
    print()
    print("  Next steps:")
    print("    1. Start the app:")
    print("       s.bat start")
    print()
    print("    2. Open http://localhost:8081 in a browser")
    print("       Complete the setup wizard:")
    print("         - Create your admin account")
    print("         - Configure Email (SMTP), WhatsApp (Twilio), PayFast, Stripe")
    print()
    if errors:
        print(_c("yellow", "  Warnings encountered:"))
        for e in errors:
            print(_c("yellow", f"    - {e}"))
        print()


# ── Uninstall ──────────────────────────────────────────────────────────────────

def cmd_uninstall(yes: bool = False, full: bool = False) -> None:
    header("Drive Alive – Uninstall" + (" (FULL)" if full else ""))

    print("  This will remove:")
    print(f"    - {VENV_DIR}")
    print(f"    - {FRONTEND_DIR / 'node_modules'}")
    print(f"    - {ROOT / 'build'}, {ROOT / 'dist'}, {BACKEND_DIR / 'dist'}")
    print(f"    - {INSTALLED_MARKER}")
    if full:
        print(f"    - {ENV_FILE}")
        print(f"    - DROP the {DB_APP_NAME} PostgreSQL database + app role")
    else:
        print(f"    - Optionally: {ENV_FILE}")
        print(f"    - Optionally: DROP the {DB_APP_NAME} PostgreSQL database")
    print()

    if not yes and not full:
        ans = input("  Continue? (y/N): ").strip().lower()
        if ans != "y":
            print("  Aborted.")
            return
    elif full:
        warn("Full uninstall: .env will be deleted and the database dropped.")
        ans = input("  Continue? (y/N): ").strip().lower()
        if ans != "y":
            print("  Aborted.")
            return

    # ── Stop servers ────────────────────────────────────────────────────────────
    cmd_stop()

    # Capture DATABASE_URL now — the .env file may be deleted before the
    # database section needs it to identify the app role to drop.
    saved_db_url = read_env().get("DATABASE_URL", "")

    # ── Remove files ────────────────────────────────────────────────────────────
    header("Removing files")

    def _tracked_under(p: Path) -> list[str]:
        """Git-tracked files inside p. Uninstall must never delete these."""
        try:
            r = subprocess.run(
                ["git", "ls-files", "-z", "--", str(p)],
                cwd=str(ROOT), capture_output=True, text=True,
            )
        except OSError:
            return []
        if r.returncode != 0:
            return []
        return [f for f in r.stdout.split("\0") if f]

    def rm(p: Path, label: str) -> None:
        if p.exists():
            # `dist/` is gitignored, yet dist/install-manifest.json was
            # force-added at some point. Blindly deleting the directory left a
            # staged deletion of a tracked file that `git commit -a` would
            # quietly pick up. Preserve anything git knows about.
            tracked = _tracked_under(p)
            if tracked:
                warn(f"{label} contains git-tracked files – skipping to avoid deleting them:")
                for f in tracked[:5]:
                    info(f"    {f}")
                if len(tracked) > 5:
                    info(f"    … and {len(tracked) - 5} more")
                return
            info(f"Removing {label} …")
            info(f"  Path : {p}")
            if p.is_dir():
                shutil.rmtree(p, ignore_errors=True)
            else:
                p.unlink(missing_ok=True)
            ok(f"{label} removed.")
        else:
            info(f"{label} not found – skipping.")
            info(f"  Path : {p}")

    rm(VENV_DIR, "backend/venv")
    rm(FRONTEND_DIR / "node_modules", "frontend/node_modules")
    rm(ROOT / "build", "build/")
    rm(ROOT / "dist", "dist/")
    rm(BACKEND_DIR / "dist", "backend/dist/")
    rm(INSTALLED_MARKER, ".installed marker")

    # ── .env ────────────────────────────────────────────────────────────────────
    header(".env configuration")
    if ENV_FILE.exists():
        info(f"  Path : {ENV_FILE}")
        if full:
            del_env = "y"
        elif yes:
            del_env = "n"
        else:
            del_env = input("  Delete backend/.env? (y/N): ").strip().lower()
        if del_env == "y":
            ENV_FILE.unlink()
            ok(".env removed.")
        else:
            info(".env kept (database credentials and secrets preserved).")
    else:
        info(".env not found – skipping.")
        info(f"  Path : {ENV_FILE}")

    # ── Database ────────────────────────────────────────────────────────────────
    header("PostgreSQL database")
    psql = _find_psql()
    if psql:
        pg_host = "localhost"
        pg_port = _detect_pg_port()
        info(f"  psql path : {psql}")
        info(f"  Host/port : {pg_host}:{pg_port}")
        info(f"  Database  : {DB_APP_NAME}")
        db_url = saved_db_url
        app_role = ""
        if "://" in db_url:
            app_role = db_url.split("://")[1].split(":")[0]
        if app_role and app_role not in ("postgres", "user", ""):
            info(f"  DB role   : {app_role}")
        if full:
            drop = "y"
        elif yes:
            drop = "n"
        else:
            drop = input(f"  Drop PostgreSQL database '{DB_APP_NAME}'? (y/N): ").strip().lower()
        if drop == "y":
            info(f"Authenticating to PostgreSQL on port {pg_port} …")
            su_pass = _pg_authenticate(psql, pg_host, pg_port)
            if su_pass is None:
                err("Could not authenticate – database NOT dropped. Remove it manually.")
            else:
                ok(f"Connected to PostgreSQL on port {pg_port}.")
                pg_e = _pg_env(su_pass)
                info(f"Terminating active connections to '{DB_APP_NAME}' …")
                _psql_run(psql, pg_host, pg_port, pg_e,
                          f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='{DB_APP_NAME}';")
                info(f"Dropping database '{DB_APP_NAME}' …")
                _psql_run(psql, pg_host, pg_port, pg_e, f"DROP DATABASE IF EXISTS {DB_APP_NAME};")
                ok(f"Database '{DB_APP_NAME}' dropped.")
                if app_role and app_role not in ("postgres", "user", ""):
                    info(f"Dropping DB role '{app_role}' …")
                    _psql_run(psql, pg_host, pg_port, pg_e, f"DROP ROLE IF EXISTS {app_role};")
                    ok(f"DB role '{app_role}' dropped.")
        else:
            info(f"Database '{DB_APP_NAME}' kept.")
    else:
        info("psql not found – skipping database drop.")

    print()
    ok("Uninstall complete.")
    print()


# ── Status ─────────────────────────────────────────────────────────────────────

def cmd_status() -> None:
    header("Drive Alive – Status")

    # Servers
    print("\n  Servers:")
    for label, pid_file, port in [
        ("Backend ", BACKEND_PID_FILE, BACKEND_PORT),
        ("Frontend", FRONTEND_PID_FILE, FRONTEND_PORT),
    ]:
        pid = _read_pid(pid_file) if pid_file.exists() else None
        listening = bool(_port_in_use(port))
        if listening:
            print(_c("green", f"    {label} RUNNING  (port {port}, PID {pid or 'unknown'})"))
        else:
            print(_c("yellow", f"    {label} STOPPED"))

    # Environment
    print("\n  Environment:")
    env = read_env()
    for k in ["FRONTEND_URL", "ENVIRONMENT", "DEBUG", "DATABASE_URL"]:
        v = env.get(k, _c("red", "(not set)"))
        if k == "DATABASE_URL" and v:
            # Mask the password rather than truncating. Truncating at 57 chars
            # happened to leave most of it visible, so `s.bat status` leaked the
            # database password into terminal scrollback and any captured log.
            v = re.sub(r"://([^:/@]+):[^@]*@", r"://\1:***@", v)
        print(f"    {k} = {v}")

    # Versions
    print("\n  Versions:")
    print(f"    Python   : {sys.version.split()[0]}")
    node_v = subprocess.run(["node", "--version"], capture_output=True, text=True).stdout.strip() if shutil.which("node") else "not found"
    print(f"    Node.js  : {node_v}")
    psql = _find_psql()
    pg_v = subprocess.run([str(psql), "--version"], capture_output=True, text=True).stdout.strip() if psql else "not found"
    print(f"    PostgreSQL: {pg_v}")
    venv_ok = VENV_PYTHON.exists()
    print(f"    venv     : {'✓ present' if venv_ok else '✗ missing'}")
    nm_ok = (FRONTEND_DIR / "node_modules" / "expo").exists()
    print(f"    node_modules: {'✓ present' if nm_ok else '✗ missing'}")
    print()


RELEASE_LOCK_FILE = ROOT / ".release.lock"


def _acquire_release_lock() -> bool:
    """Prevent two releases from racing each other (corrupts version files)."""
    if RELEASE_LOCK_FILE.exists():
        stale_pid = RELEASE_LOCK_FILE.read_text(encoding="utf-8", errors="replace").strip()
        err(f"Another release appears to be running (PID {stale_pid or 'unknown'}).")
        err(f"Wait for it to finish. If it crashed, delete {RELEASE_LOCK_FILE} and retry.")
        return False
    RELEASE_LOCK_FILE.write_text(str(os.getpid()), encoding="utf-8")
    return True


def _drop_release_lock() -> None:
    RELEASE_LOCK_FILE.unlink(missing_ok=True)


def cmd_release(bump_type: str, dry_run: bool = False, _lock_held: bool = False) -> None:
    """Release workflow entrypoint."""
    if not dry_run and not _lock_held and not _acquire_release_lock():
        sys.exit(1)
    action = "Dry-run release" if dry_run else "Release"
    header(f"Drive Alive – {action}")
    info(f"Requested bump: {bump_type}")
    try:
        execute_release(bump_type=bump_type, dry_run=dry_run)
    except ReleaseError as exc:
        err(str(exc))
        sys.exit(1)
    finally:
        if not dry_run and not _lock_held:
            _drop_release_lock()


def cmd_ship(bump_type: str, message: str | None = None, dry_run: bool = False) -> None:
    """
    One-command release: commit ALL pending work, then bump the version,
    tag and publish a GitHub release (s.bat minor / s.bat major).
    """
    if not dry_run and not _acquire_release_lock():
        sys.exit(1)
    try:
        header(f"Drive Alive – {bump_type.capitalize()} release (commit + bump + tag + publish)")

        status = subprocess.run(
            ["git", "status", "--porcelain"],
            capture_output=True, text=True, cwd=ROOT,
        )
        dirty = bool(status.stdout.strip())

        if dirty:
            if dry_run:
                warn("Working tree has uncommitted changes; dry-run will NOT commit them.")
                info("The real run would first execute: git add -A && git commit")
            else:
                info("Committing all pending changes …")
                subprocess.run(["git", "add", "-A"], cwd=ROOT, check=True)
                msg = message or f"chore: pre-release commit ({bump_type} bump)"
                r = subprocess.run(["git", "commit", "-m", msg], cwd=ROOT)
                if r.returncode != 0:
                    err("git commit failed – release aborted.")
                    sys.exit(1)
                ok(f"Pending changes committed: {msg}")
        else:
            info("Working tree clean – nothing to commit.")

        cmd_release(bump_type=bump_type, dry_run=dry_run, _lock_held=True)
    finally:
        if not dry_run:
            _drop_release_lock()


EXAMPLES = """
EXAMPLES
    s.bat                                Start backend + frontend (default)
    s.bat --debug                        Start in debug mode (pre-filled forms)
    s.bat -d                             Start and open the browser with DevTools
    s.bat start -b                       Start backend only
    s.bat start -f --debug               Frontend only, verbose debug
    s.bat start -m                       Switch to LAN/mobile env, then start
    s.bat stop                           Stop all running servers
    s.bat restart -e loc                 Restart on localhost env
    s.bat status                         Show servers, env and versions
    s.bat env net                        Point the app at your LAN IP
    s.bat install                        First-run setup (venv, deps, .env, DB)
    s.bat install --force                Drop + recreate DB, rewrite DATABASE_URL
    s.bat uninstall                      Remove venv/node_modules (prompts each step)
    s.bat uninstall --all                Complete teardown incl. .env + database
    s.bat webtest                        Clean install + Chrome visual test runner
    s.bat webtest --spec cypress/e2e/multi-role-smoke.cy.ts
    s.bat minor                          Commit everything, bump 7.1.0 -> 7.2.0,
                                         tag and publish a GitHub release
    s.bat major                          Same, but 7.x.x -> 8.0.0
    s.bat minor --dry-run                Preview the minor release, change nothing
    s.bat minor -m "feat: new screens"   Use a custom message for the pre-release commit
    s.bat release --minor                Release WITHOUT auto-committing first
    s.bat help                           This reference (always up to date)
"""


def cmd_help(parser: argparse.ArgumentParser) -> None:
    """
    Print the full command reference, generated live from the argument
    parser — newly implemented commands/flags always show up here.
    """
    header("Drive Alive – Command Reference")
    print("  USAGE: s.bat <command> [options]    (or: python scripts/da.py …)")
    print("  Running with no command is the same as: s.bat start\n")

    sub_action = next(
        a for a in parser._actions if isinstance(a, argparse._SubParsersAction)
    )
    # help= text for each subcommand lives on the pseudo-actions
    summaries = {ca.dest: (ca.help or "") for ca in sub_action._choices_actions}

    for name, sp in sub_action.choices.items():
        print(_c("cyan", f"  {name}") + (f"  –  {summaries.get(name, '')}" if summaries.get(name) else ""))
        for action in sp._actions:
            if isinstance(action, argparse._HelpAction):
                continue
            if action.option_strings:
                flags = ", ".join(action.option_strings)
                if action.metavar:
                    flags += f" {action.metavar}"
            else:
                flags = action.metavar or action.dest
            help_text = action.help or ""
            print(f"      {flags:<28} {help_text}")
        print()

    print(EXAMPLES)


def cmd_webtest(
    clean_install: bool = True,
    debug_mode: bool = True,
    spec: str | None = None,
) -> None:
    """Run full visual web test workflow in real Chrome with DevTools."""
    header("Drive Alive – Full Visual Web Tests")
    selected_spec = spec or "cypress/e2e/multi-role-smoke.cy.ts"

    if clean_install:
        info("Performing clean install (backend venv + frontend node_modules) …")
        cmd_stop(silent=True)
        time.sleep(1)

        if VENV_DIR.exists():
            shutil.rmtree(VENV_DIR, ignore_errors=True)
            ok("Removed backend/venv")
        if (FRONTEND_DIR / "node_modules").exists():
            shutil.rmtree(FRONTEND_DIR / "node_modules", ignore_errors=True)
            ok("Removed frontend/node_modules")

        info("Creating backend virtual environment …")
        run([sys.executable, "-m", "venv", "venv"], cwd=BACKEND_DIR)
        ok("Backend venv created")

        info("Installing backend dependencies …")
        run([str(VENV_PYTHON), "-m", "pip", "install", "-r", "requirements.txt"], cwd=BACKEND_DIR)
        ok("Backend dependencies installed")

        info("Installing frontend dependencies …")
        run(["npm", "install"], cwd=FRONTEND_DIR)
        ok("Frontend dependencies installed")
    else:
        info("Skipping clean install (--no-clean)")

    # Start both services; dev_mode opens real Chrome with DevTools.
    cmd_start(dev_mode=True, debug_mode=debug_mode)

    # Run smoke checks immediately in headed real Chrome.
    smoke_cmd = f"npx cypress run --e2e --browser chrome --headed --spec {selected_spec}"
    smoke_pid = open_new_window(
        "Drive Alive - Web Tests (Smoke Run)",
        smoke_cmd,
        FRONTEND_DIR,
    )
    if smoke_pid:
        ok(f"Cypress smoke run started (PID {smoke_pid})")
    else:
        warn("Could not determine Cypress smoke PID, but launch was attempted.")

    # Keep an interactive Chrome runner open for visual monitoring and re-runs.
    monitor_cmd = f"npx cypress open --e2e --browser chrome --spec {selected_spec}"
    monitor_pid = open_new_window(
        "Drive Alive - Web Tests (Interactive)",
        monitor_cmd,
        FRONTEND_DIR,
    )
    if monitor_pid:
        ok(f"Cypress interactive runner started (PID {monitor_pid})")
    else:
        warn("Could not determine Cypress interactive PID, but launch was attempted.")

    print()
    info("Visual test workflow is ready.")
    info(f"Auto-run spec: {selected_spec}")
    info("Smoke run starts immediately in headed Chrome.")
    info("Interactive Cypress Chrome runner stays open for ongoing monitoring and re-runs.")
    print()


# ── CLI ────────────────────────────────────────────────────────────────────────

class _FriendlyParser(argparse.ArgumentParser):
    """argparse that suggests the right invocation instead of just rejecting.

    Unknown arguments are still hard errors — silently ignoring them is how
    `uninstall all` used to run a plain uninstall. This only adds a hint, so
    the two mistakes people actually make are self-correcting:

        s.bat --uninstall     ->  subcommands take no leading dashes
        s.bat uninstall all   ->  flags do:  uninstall --all
    """

    _subparser_action = None

    def _known_subcommands(self) -> list[str]:
        act = self._subparser_action
        return sorted(act.choices) if act else []

    def _flags_for(self, command: str) -> list[str]:
        act = self._subparser_action
        if not act or command not in act.choices:
            return []
        flags: list[str] = []
        for a in act.choices[command]._actions:
            flags.extend(a.option_strings)
        return flags

    def _hint(self, message: str, argv: list[str]) -> str | None:
        import difflib

        # argparse reports a mistyped subcommand as "invalid choice" and a
        # stray token as "unrecognized arguments" — handle both.
        bad_choice = re.search(r"invalid choice:\s*'([^']+)'", message)
        if bad_choice:
            tok = bad_choice.group(1)
            close = difflib.get_close_matches(tok, self._known_subcommands(), n=1, cutoff=0.5)
            if close:
                return (f"  did you mean '{close[0]}'?  ->  s.bat {close[0]}\n"
                        "  Run 's.bat help' for the full reference with examples.")
            return None

        m = re.search(r"unrecognized arguments:\s*(.+)$", message)
        if not m:
            return None
        offenders = m.group(1).split()
        command = argv[0] if argv and not argv[0].startswith("-") else None
        subs = self._known_subcommands()
        tips: list[str] = []

        for tok in offenders:
            bare = tok.lstrip("-")
            # "--uninstall" when "uninstall" is a subcommand
            if tok.startswith("-") and bare in subs:
                tips.append(f"'{tok}' is a subcommand, not a flag — try:  s.bat {bare}")
                continue
            # "uninstall all" when "--all" is a flag of that subcommand
            if not tok.startswith("-") and command and f"--{tok}" in self._flags_for(command):
                tips.append(f"'{tok}' is a flag — try:  s.bat {command} --{tok}")
                continue
            # otherwise offer the closest thing we do know about
            pool = self._flags_for(command) if command else subs
            close = difflib.get_close_matches(tok, pool, n=1, cutoff=0.6)
            if close:
                tips.append(f"'{tok}' is not valid here — did you mean '{close[0]}'?")

        if not tips:
            return None
        tips.append("Run 's.bat help' for the full reference with examples.")
        return "\n".join("  " + t for t in tips)

    def error(self, message: str):  # noqa: A003 - argparse API
        hint = self._hint(message, sys.argv[1:])
        if hint:
            self.print_usage(sys.stderr)
            sys.stderr.write(f"\n{self.prog}: error: {message}\n\n{hint}\n")
            sys.exit(2)
        super().error(message)


def main() -> None:
    # Enable ANSI on Windows
    if sys.platform == "win32":
        os.system("")

    # Compatibility: allow top-level release flags without explicitly typing
    # the "release" subcommand (e.g. `s.bat --major`).
    raw_argv = sys.argv[1:]
    command_names = {
        "start", "stop", "restart", "webtest", "install", "uninstall",
        "env", "status", "release", "minor", "major", "help",
    }
    has_release_flag = any(flag in raw_argv for flag in ("--major", "--minor"))
    parsed_argv = raw_argv
    if raw_argv and raw_argv[0] not in command_names and has_release_flag:
        parsed_argv = ["release"] + raw_argv

    parser = _FriendlyParser(
        prog="da.py",
        description="Drive Alive project manager — run 'help' for the full reference with examples",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=EXAMPLES,
    )
    sub = parser.add_subparsers(dest="command")
    parser._subparser_action = sub  # used by _FriendlyParser for did-you-mean hints

    # start
    p_start = sub.add_parser("start", help="Start servers (default when no command given)")
    p_start.add_argument("-b", "--backend-only", action="store_true", help="Start the FastAPI backend only (port 8000)")
    p_start.add_argument("-f", "--frontend-only", action="store_true", help="Start the Expo frontend only (port 8081)")
    p_start.add_argument("-d", "--dev", action="store_true", help="Open browser with DevTools")
    p_start.add_argument("--debug", action="store_true", help="Enable verbose debug mode (DEBUG=True, log-level debug, pre-fill forms)")
    p_start.add_argument("-e", "--env", metavar="TARGET", help="Switch env before starting (loc|net|prod)")
    p_start.add_argument("-l", "--local", action="store_true", help="Switch to localhost env first (alias for -e loc)")
    p_start.add_argument("-m", "--mobile", action="store_true", help="Switch to network/mobile env first (alias for -e net)")

    # stop
    sub.add_parser("stop", help="Stop running servers")

    # restart
    p_restart = sub.add_parser("restart", help="Restart servers")
    p_restart.add_argument("-b", "--backend-only", action="store_true", help="Restart the backend only")
    p_restart.add_argument("-f", "--frontend-only", action="store_true", help="Restart the frontend only")
    p_restart.add_argument("-d", "--dev", action="store_true", help="Open browser with DevTools")
    p_restart.add_argument("--debug", action="store_true", help="Enable verbose debug mode")
    p_restart.add_argument("-e", "--env", metavar="TARGET", help="Switch env before restarting (loc|net|prod)")
    p_restart.add_argument("-l", "--local", action="store_true", help="Switch to localhost env first")
    p_restart.add_argument("-m", "--mobile", action="store_true", help="Switch to network/mobile env first")

    # webtest
    p_webtest = sub.add_parser("webtest", help="Clean install + start + open visual Chrome tests")
    p_webtest.add_argument("--no-clean", action="store_true", help="Skip clean install step")
    p_webtest.add_argument("--no-debug", action="store_true", help="Disable debug mode while running")
    p_webtest.add_argument("--spec", metavar="PATH", help="Optional Cypress spec path, e.g. cypress/e2e/foo.cy.ts")

    # install
    p_install = sub.add_parser("install", help="Full first-run setup (venv, deps, .env, database)")
    p_install.add_argument("--force", action="store_true", help="Re-run even if installed; drop + recreate the database and rewrite DATABASE_URL")
    p_install.add_argument("--offline", action="store_true", help="Install from the bundled vendor/ packages (no internet)")

    # uninstall
    p_uninstall = sub.add_parser("uninstall", help="Remove generated files")
    p_uninstall.add_argument("--yes", action="store_true", help="Skip prompts (keeps .env and database)")
    p_uninstall.add_argument(
        "--all", action="store_true", dest="all_",
        help="Complete uninstall: stop servers, remove generated files, "
             "delete backend/.env and drop the database (one confirmation)",
    )

    # env
    p_env = sub.add_parser("env", help="Switch environment")
    p_env.add_argument("target", nargs="?", help="loc | net | prod")

    # status
    sub.add_parser("status", help="Show status")

    # release
    p_release = sub.add_parser("release", help="Create and publish a GitHub release (requires clean tree)")
    bump_group = p_release.add_mutually_exclusive_group(required=True)
    bump_group.add_argument("--minor", action="store_true", help="Bump minor version and publish a release")
    bump_group.add_argument("--major", action="store_true", help="Bump major version and publish a release")
    p_release.add_argument("--dry-run", action="store_true", help="Preview release changes without writing, tagging, or publishing")

    # minor / major — one-command ship: commit + bump + tag + publish
    for bump_name, bump_help in (
        ("minor", "Commit ALL pending changes, bump minor version (x.Y.0), tag and publish a GitHub release"),
        ("major", "Commit ALL pending changes, bump major version (X.0.0), tag and publish a GitHub release"),
    ):
        p_bump = sub.add_parser(bump_name, help=bump_help)
        p_bump.add_argument("-m", "--message", help="Commit message for the pending changes (default: auto-generated)")
        p_bump.add_argument("--dry-run", action="store_true", help="Preview only — commits nothing, publishes nothing")

    # help
    sub.add_parser("help", help="Full command reference with examples (auto-generated, always current)")

    # If no subcommand given, default to "start".
    # Use parse_known_args() first so that start-only flags like --debug / -d
    # don't cause the top-level parser to error before we redirect to "start".
    args, _unknown = parser.parse_known_args(parsed_argv)
    if not args.command:
        args = parser.parse_args(["start"] + parsed_argv)
    else:
        # Strict re-parse: reject unknown arguments instead of silently
        # ignoring them (e.g. "uninstall all" must not run a plain uninstall)
        args = parser.parse_args(parsed_argv)

    if args.command == "start":
        switch = getattr(args, "env", None)
        if not switch and getattr(args, "local", False):
            switch = "loc"
        elif not switch and getattr(args, "mobile", False):
            switch = "net"
        cmd_start(
            backend_only=args.backend_only,
            frontend_only=args.frontend_only,
            dev_mode=args.dev,
            debug_mode=args.debug,
            switch_env=switch,
        )

    elif args.command == "stop":
        cmd_stop()

    elif args.command == "restart":
        switch = getattr(args, "env", None)
        if not switch and getattr(args, "local", False):
            switch = "loc"
        elif not switch and getattr(args, "mobile", False):
            switch = "net"
        cmd_stop()
        time.sleep(1)
        cmd_start(
            backend_only=args.backend_only,
            frontend_only=args.frontend_only,
            dev_mode=args.dev,
            debug_mode=args.debug,
            switch_env=switch,
        )

    elif args.command == "webtest":
        cmd_webtest(
            clean_install=not args.no_clean,
            debug_mode=not args.no_debug,
            spec=args.spec,
        )

    elif args.command == "install":
        cmd_install(force=args.force, offline=args.offline)

    elif args.command == "uninstall":
        cmd_uninstall(yes=args.yes, full=args.all_)

    elif args.command == "env":
        if not args.target:
            # Interactive menu
            print("\nSelect environment:")
            print("  [1] Local  (localhost:8081)")
            print("  [2] Network  (mobile, auto-IP)")
            print("  [3] Production  (show instructions)")
            choice = input("\nChoice [1-3]: ").strip()
            target = {"1": "loc", "2": "net", "3": "prod"}.get(choice)
            if not target:
                err("Invalid choice.")
                sys.exit(1)
            cmd_env(target)
        else:
            cmd_env(args.target)

    elif args.command == "status":
        cmd_status()

    elif args.command == "release":
        bump_type = "major" if args.major else "minor"
        cmd_release(bump_type=bump_type, dry_run=args.dry_run)

    elif args.command in ("minor", "major"):
        cmd_ship(bump_type=args.command, message=args.message, dry_run=args.dry_run)

    elif args.command == "help":
        cmd_help(parser)

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
