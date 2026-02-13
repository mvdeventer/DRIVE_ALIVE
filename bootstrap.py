"""
Drive Alive - First-Run Bootstrap Script
=========================================
Automatically sets up the entire application on a fresh machine:
  - Python virtual environment + pip packages (online or offline from vendor/)
  - Node.js + npm packages (online or offline)
  - PostgreSQL database creation
  - .env file generation with secure defaults
  - Database table creation

Usage:
    python bootstrap.py              # Full auto-setup
    python bootstrap.py --force      # Re-run even if already installed
    python bootstrap.py --offline    # Force offline mode (use vendor/ packages)
    python bootstrap.py --bundle     # Download packages into vendor/ for offline use
"""

import json
import os
import platform
import secrets
import shutil
import subprocess
import sys
import time
from pathlib import Path

# ============================================================================
# Configuration
# ============================================================================

ROOT_DIR = Path(__file__).parent.resolve()
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"
VENV_DIR = BACKEND_DIR / "venv"
VENDOR_DIR = ROOT_DIR / "vendor"
BACKEND_VENDOR = VENDOR_DIR / "python"
FRONTEND_VENDOR = VENDOR_DIR / "node"
INSTALLER_VENDOR = VENDOR_DIR / "installers"
MARKER_FILE = ROOT_DIR / ".installed"
ENV_FILE = BACKEND_DIR / ".env"
ENV_EXAMPLE = BACKEND_DIR / ".env.example"
REQUIREMENTS_FILE = BACKEND_DIR / "requirements.txt"

if platform.system() == "Windows":
    VENV_PYTHON = VENV_DIR / "Scripts" / "python.exe"
    VENV_PIP = VENV_DIR / "Scripts" / "pip.exe"
else:
    VENV_PYTHON = VENV_DIR / "bin" / "python"
    VENV_PIP = VENV_DIR / "bin" / "pip"

DB_NAME = "driving_school_db"
DB_DEFAULT_USER = "postgres"
DB_DEFAULT_PASSWORD = "postgres"
DB_DEFAULT_HOST = "localhost"
DB_DEFAULT_PORT = "5432"

MIN_PYTHON_VERSION = (3, 9)
MIN_NODE_VERSION = 18

# Critical Python packages that must be importable for the app to run
CRITICAL_PACKAGES = [
    "fastapi", "uvicorn", "sqlalchemy", "psycopg2", "jose",
    "passlib", "pydantic_settings", "dotenv", "stripe", "twilio",
    "geopy", "slowapi", "cryptography", "bcrypt",
]


# ============================================================================
# Utility Helpers
# ============================================================================

class Colors:
    """ANSI color codes for terminal output."""
    RESET = "\033[0m"
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"


def log(msg, color=Colors.RESET):
    """Print a colored log message."""
    print(f"{color}{msg}{Colors.RESET}")


def log_step(step_num, total, msg):
    """Print a numbered step header."""
    log(f"\n[{step_num}/{total}] {msg}", Colors.CYAN)


def log_ok(msg):
    log(f"  ✓ {msg}", Colors.GREEN)


def log_warn(msg):
    log(f"  ! {msg}", Colors.YELLOW)


def log_err(msg):
    log(f"  ✗ {msg}", Colors.RED)


def run_cmd(cmd, cwd=None, check=True, capture=True, timeout=600):
    """Run a shell command and return the result."""
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            check=check,
            capture_output=capture,
            text=True,
            timeout=timeout,
            shell=isinstance(cmd, str),
        )
        return result
    except subprocess.CalledProcessError as exc:
        if capture:
            log_err(f"Command failed: {' '.join(cmd) if isinstance(cmd, list) else cmd}")
            if exc.stdout:
                print(f"  stdout: {exc.stdout[:500]}")
            if exc.stderr:
                print(f"  stderr: {exc.stderr[:500]}")
        if check:
            raise
        return exc
    except FileNotFoundError:
        log_err(f"Command not found: {cmd[0] if isinstance(cmd, list) else cmd.split()[0]}")
        return None
    except subprocess.TimeoutExpired:
        log_err(f"Command timed out after {timeout}s")
        return None
    except OSError as exc:
        log_err(f"OS error running command: {exc}")
        return None


def run_elevated(cmd_args, wait=True, timeout=600):
    """Run a command with UAC elevation on Windows via PowerShell Start-Process -Verb RunAs."""
    if platform.system() != "Windows":
        return run_cmd(cmd_args, check=False, timeout=timeout)

    exe = cmd_args[0]
    args = cmd_args[1:]
    args_str = " ".join(f"'{a}'" for a in args)

    ps_cmd = (
        f"Start-Process -FilePath '{exe}' "
        f"-ArgumentList {args_str} "
        f"-Verb RunAs -Wait -PassThru"
    )
    try:
        result = subprocess.run(
            ["powershell", "-Command", ps_cmd],
            capture_output=True, text=True, timeout=timeout,
        )
        return result
    except Exception as exc:
        log_err(f"Elevated execution failed: {exc}")
        return None


def cmd_exists(name):
    """Check if a command exists on the system PATH."""
    return shutil.which(name) is not None


def is_online():
    """Quick check for internet connectivity."""
    try:
        result = run_cmd(
            [sys.executable, "-c",
             "import urllib.request; urllib.request.urlopen('https://pypi.org', timeout=5)"],
            check=False, timeout=10,
        )
        return result is not None and result.returncode == 0
    except Exception:
        return False


# ============================================================================
# Step 1: Check Python Version
# ============================================================================

def check_python():
    """Verify Python version meets minimum requirements."""
    version = sys.version_info[:2]
    if version < MIN_PYTHON_VERSION:
        log_err(
            f"Python {MIN_PYTHON_VERSION[0]}.{MIN_PYTHON_VERSION[1]}+ required, "
            f"found {version[0]}.{version[1]}"
        )
        log_err("Download from: https://www.python.org/downloads/")
        return False
    log_ok(f"Python {version[0]}.{version[1]}.{sys.version_info[2]} OK")
    return True


# ============================================================================
# Step 2: Check / Install PostgreSQL
# ============================================================================

def _add_to_system_path(directory):
    """Permanently add a directory to the Windows system PATH via the registry."""
    if platform.system() != "Windows":
        return False
    dir_str = str(directory)
    try:
        import winreg
        key = winreg.OpenKey(
            winreg.HKEY_LOCAL_MACHINE,
            r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment",
            0, winreg.KEY_READ | winreg.KEY_WRITE,
        )
        try:
            current_path, _ = winreg.QueryValueEx(key, "Path")
        except FileNotFoundError:
            current_path = ""

        # Check if already in system PATH
        path_entries = [p.strip().rstrip("\\") for p in current_path.split(";") if p.strip()]
        if dir_str.rstrip("\\") in path_entries:
            winreg.CloseKey(key)
            return True

        new_path = current_path.rstrip(";") + ";" + dir_str
        winreg.SetValueEx(key, "Path", 0, winreg.REG_EXPAND_SZ, new_path)
        winreg.CloseKey(key)

        # Broadcast WM_SETTINGCHANGE so other processes pick up the new PATH
        try:
            import ctypes
            HWND_BROADCAST = 0xFFFF
            WM_SETTINGCHANGE = 0x001A
            SMTO_ABORTIFHUNG = 0x0002
            ctypes.windll.user32.SendMessageTimeoutW(
                HWND_BROADCAST, WM_SETTINGCHANGE, 0, "Environment",
                SMTO_ABORTIFHUNG, 5000, ctypes.byref(ctypes.c_ulong(0)),
            )
        except Exception:
            pass  # Non-critical — new terminals will pick it up after reboot

        log_ok(f"Added to system PATH: {dir_str}")
        return True
    except PermissionError:
        # No admin rights — fall back to user PATH
        try:
            key = winreg.OpenKey(
                winreg.HKEY_CURRENT_USER,
                r"Environment",
                0, winreg.KEY_READ | winreg.KEY_WRITE,
            )
            try:
                current_path, _ = winreg.QueryValueEx(key, "Path")
            except FileNotFoundError:
                current_path = ""

            path_entries = [p.strip().rstrip("\\") for p in current_path.split(";") if p.strip()]
            if dir_str.rstrip("\\") in path_entries:
                winreg.CloseKey(key)
                return True

            new_path = current_path.rstrip(";") + ";" + dir_str
            winreg.SetValueEx(key, "Path", 0, winreg.REG_EXPAND_SZ, new_path)
            winreg.CloseKey(key)
            log_ok(f"Added to user PATH: {dir_str}")
            return True
        except Exception as exc:
            log_warn(f"Could not add to PATH permanently: {exc}")
            log_warn(f"  Add manually: {dir_str}")
            return False
    except Exception as exc:
        log_warn(f"Could not modify system PATH: {exc}")
        return False


def _find_psql_in_common_paths():
    """Search common PostgreSQL install directories and add to PATH if found."""
    if platform.system() != "Windows":
        return False
    pg_search_dirs = [
        r"C:\Program Files\PostgreSQL",
        r"C:\Program Files (x86)\PostgreSQL",
    ]
    for base in pg_search_dirs:
        base_path = Path(base)
        if base_path.exists():
            # Find highest version
            versions = sorted(base_path.iterdir(), reverse=True)
            for ver_dir in versions:
                bin_dir = ver_dir / "bin"
                if (bin_dir / "psql.exe").exists():
                    # Add to current process PATH
                    os.environ["PATH"] = str(bin_dir) + ";" + os.environ.get("PATH", "")
                    # Persist to system/user PATH so future terminals work too
                    _add_to_system_path(bin_dir)
                    log_ok(f"Found PostgreSQL at {bin_dir}")
                    return True
    return False


def check_postgresql():
    """Check if PostgreSQL is installed and accessible."""
    if cmd_exists("psql"):
        result = run_cmd(["psql", "--version"], check=False)
        if result and result.returncode == 0:
            version_str = result.stdout.strip()
            log_ok(f"PostgreSQL found: {version_str}")
            return True

    # Try common install locations before giving up
    if _find_psql_in_common_paths():
        result = run_cmd(["psql", "--version"], check=False)
        if result and result.returncode == 0:
            version_str = result.stdout.strip()
            log_ok(f"PostgreSQL found: {version_str}")
            return True

    log_warn("PostgreSQL (psql) not found in PATH")
    return False


def install_postgresql(offline=False):
    """Attempt to install PostgreSQL automatically."""
    if platform.system() != "Windows":
        log_err("Automatic PostgreSQL install only supported on Windows")
        log_err("Please install manually:")
        log_err("  Ubuntu/Debian: sudo apt install postgresql postgresql-client")
        log_err("  macOS: brew install postgresql")
        return False

    installer_path = INSTALLER_VENDOR / "postgresql-installer.exe"

    if offline and installer_path.exists():
        log("  Installing PostgreSQL from bundled installer...", Colors.CYAN)
    elif not offline:
        log("  Downloading PostgreSQL installer...", Colors.CYAN)
        try:
            download_url = (
                "https://get.enterprisedb.com/postgresql/"
                "postgresql-16.6-1-windows-x64.exe"
            )
            INSTALLER_VENDOR.mkdir(parents=True, exist_ok=True)
            run_cmd([
                sys.executable, "-c",
                f"import urllib.request; "
                f"urllib.request.urlretrieve('{download_url}', r'{installer_path}')"
            ], timeout=300)
        except Exception as exc:
            log_err(f"Failed to download PostgreSQL installer: {exc}")
            log_err("Download manually from: https://www.postgresql.org/download/windows/")
            return False
    else:
        log_err("PostgreSQL installer not found in vendor/installers/")
        log_err("Download from: https://www.postgresql.org/download/windows/")
        return False

    if installer_path.exists():
        log("  Running PostgreSQL silent install (requires admin privileges)...", Colors.CYAN)
        log("  A UAC prompt may appear - please click 'Yes' to allow installation.", Colors.YELLOW)
        result = run_elevated([
            str(installer_path),
            "--mode", "unattended",
            "--superpassword", DB_DEFAULT_PASSWORD,
            "--serverport", DB_DEFAULT_PORT,
            "--install_runtimes", "0",
        ], timeout=600)
        if result and result.returncode == 0:
            # Add PostgreSQL to PATH for this session
            _find_psql_in_common_paths()
            log_ok("PostgreSQL installed successfully")
            return True
        log_warn("PostgreSQL install needs manual action.")
        log_warn(f"  Run the installer manually: {installer_path}")
        log_warn("  Or download from: https://www.postgresql.org/download/windows/")
        return False

    return False


# ============================================================================
# Step 3: Create Python Virtual Environment
# ============================================================================

def setup_venv():
    """Create Python virtual environment if it doesn't exist."""
    if VENV_PYTHON.exists():
        log_ok(f"Virtual environment exists at {VENV_DIR}")
        return True

    log("  Creating Python virtual environment...", Colors.CYAN)
    result = run_cmd([sys.executable, "-m", "venv", str(VENV_DIR)], cwd=str(BACKEND_DIR))
    if result and VENV_PYTHON.exists():
        log_ok("Virtual environment created")
        # Upgrade pip
        run_cmd([str(VENV_PYTHON), "-m", "pip", "install", "--upgrade", "pip", "--quiet"],
                check=False, timeout=120)
        return True

    log_err("Failed to create virtual environment")
    return False


# ============================================================================
# Step 4: Install Python Packages
# ============================================================================

def install_python_packages(offline=False):
    """Install Python packages from requirements.txt (online or offline)."""
    # Check if already installed by testing critical imports
    missing = check_python_packages()
    if not missing:
        log_ok("All Python packages already installed")
        return True

    log(f"  Missing packages detected: {', '.join(missing[:5])}{'...' if len(missing) > 5 else ''}", Colors.YELLOW)

    if not offline:
        log("  Installing Python packages from PyPI...", Colors.CYAN)
        result = run_cmd(
            [str(VENV_PIP), "install", "-r", str(REQUIREMENTS_FILE)],
            cwd=str(BACKEND_DIR),
            check=False,
            capture=False,
            timeout=600,
        )
        if result and result.returncode == 0:
            log_ok("Python packages installed from PyPI")
            return True
        log_warn("Online install failed, trying offline fallback...")

    # Offline / fallback: install from vendor directory
    if BACKEND_VENDOR.exists() and any(BACKEND_VENDOR.iterdir()):
        log("  Installing Python packages from vendor/ (offline)...", Colors.CYAN)
        result = run_cmd(
            [str(VENV_PIP), "install", "--no-index",
             f"--find-links={BACKEND_VENDOR}", "-r", str(REQUIREMENTS_FILE)],
            cwd=str(BACKEND_DIR),
            check=False,
            capture=False,
            timeout=600,
        )
        if result and result.returncode == 0:
            log_ok("Python packages installed from vendor/ (offline)")
            return True
        log_err("Offline install from vendor/ also failed")
    else:
        log_warn("No vendor/python/ directory found for offline install")

    # Final verification
    still_missing = check_python_packages()
    if still_missing:
        log_err(f"Still missing: {', '.join(still_missing)}")
        return False
    return True


def check_python_packages():
    """Check which critical Python packages are missing from the venv."""
    if not VENV_PYTHON.exists():
        return CRITICAL_PACKAGES[:]

    missing = []
    check_code = "; ".join(
        f"exec('try:\\n import {pkg}\\nexcept ImportError:\\n print(\"{pkg}\")')"
        for pkg in CRITICAL_PACKAGES
    )
    result = run_cmd(
        [str(VENV_PYTHON), "-c", check_code],
        check=False, timeout=30,
    )
    if result and result.stdout:
        missing = [line.strip() for line in result.stdout.strip().split("\n") if line.strip()]
    return missing


# ============================================================================
# Step 5: Check / Install Node.js
# ============================================================================

def check_nodejs():
    """Check if Node.js is installed with minimum version."""
    if not cmd_exists("node"):
        return False

    result = run_cmd(["node", "--version"], check=False)
    if result and result.returncode == 0:
        version_str = result.stdout.strip().lstrip("v")
        try:
            major = int(version_str.split(".")[0])
            if major >= MIN_NODE_VERSION:
                log_ok(f"Node.js v{version_str} OK")
                return True
            log_warn(f"Node.js v{version_str} found but v{MIN_NODE_VERSION}+ required")
        except (ValueError, IndexError):
            log_warn(f"Could not parse Node.js version: {version_str}")
    return False


def install_nodejs(offline=False):
    """Attempt to install Node.js automatically."""
    if platform.system() != "Windows":
        log_err("Automatic Node.js install only supported on Windows")
        log_err("Please install manually: https://nodejs.org/en/download/")
        return False

    installer_path = INSTALLER_VENDOR / "node-installer.msi"

    if offline and installer_path.exists():
        log("  Installing Node.js from bundled installer...", Colors.CYAN)
    elif not offline:
        log("  Downloading Node.js LTS installer...", Colors.CYAN)
        try:
            download_url = "https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi"
            INSTALLER_VENDOR.mkdir(parents=True, exist_ok=True)
            run_cmd([
                sys.executable, "-c",
                f"import urllib.request; "
                f"urllib.request.urlretrieve('{download_url}', r'{installer_path}')"
            ], timeout=300)
        except Exception as exc:
            log_err(f"Failed to download Node.js installer: {exc}")
            log_err("Download manually from: https://nodejs.org/en/download/")
            return False
    else:
        log_err("Node.js installer not found in vendor/installers/")
        log_err("Download from: https://nodejs.org/en/download/")
        return False

    if installer_path.exists():
        log("  Running Node.js silent install (requires admin privileges)...", Colors.CYAN)
        log("  A UAC prompt may appear - please click 'Yes' to allow installation.", Colors.YELLOW)
        result = run_elevated(
            ["msiexec", "/i", str(installer_path), "/qn", "/norestart"],
            timeout=300,
        )
        if result and result.returncode == 0:
            # Refresh PATH
            npm_path = r"C:\Program Files\nodejs"
            if Path(npm_path).exists():
                os.environ["PATH"] = npm_path + ";" + os.environ.get("PATH", "")
            log_ok("Node.js installed successfully")
            return True
        log_warn("Node.js install needs manual action.")
        log_warn(f"  Run the installer manually: {installer_path}")
        log_warn("  Or download from: https://nodejs.org/en/download/")
        return False
    return False


# ============================================================================
# Step 6: Install npm Packages
# ============================================================================

def install_npm_packages(offline=False):
    """Install frontend npm packages."""
    node_modules = FRONTEND_DIR / "node_modules"
    package_json = FRONTEND_DIR / "package.json"

    if not package_json.exists():
        log_warn("frontend/package.json not found, skipping npm install")
        return True

    if node_modules.exists() and any(node_modules.iterdir()):
        log_ok("Frontend node_modules already exists")
        return True

    if not offline:
        log("  Installing npm packages...", Colors.CYAN)
        result = run_cmd(
            ["npm", "install"],
            cwd=str(FRONTEND_DIR),
            check=False,
            capture=False,
            timeout=600,
        )
        if result and result.returncode == 0:
            log_ok("npm packages installed")
            return True
        log_warn("npm install failed, trying offline fallback...")

    # Offline fallback: extract from vendor tarball
    tarball = FRONTEND_VENDOR / "node_modules.tar.gz"
    if tarball.exists():
        log("  Extracting npm packages from vendor/ (offline)...", Colors.CYAN)
        try:
            import tarfile
            with tarfile.open(str(tarball), "r:gz") as tar:
                tar.extractall(path=str(FRONTEND_DIR))
            log_ok("npm packages extracted from vendor/ (offline)")
            return True
        except Exception as exc:
            log_err(f"Failed to extract node_modules tarball: {exc}")
    elif offline:
        log_err("No vendor/node/node_modules.tar.gz found for offline install")

    # Try npm ci with cache
    log("  Trying npm ci --prefer-offline...", Colors.CYAN)
    result = run_cmd(
        ["npm", "ci", "--prefer-offline"],
        cwd=str(FRONTEND_DIR),
        check=False,
        capture=False,
        timeout=600,
    )
    if result and result.returncode == 0:
        log_ok("npm packages installed (prefer-offline)")
        return True

    log_err("Failed to install npm packages")
    return False


# ============================================================================
# Step 7: Create .env File
# ============================================================================

def setup_env_file():
    """Create backend/.env from .env.example with auto-generated values."""
    if ENV_FILE.exists():
        log_ok("backend/.env already exists")
        return True

    log("  Creating backend/.env from template...", Colors.CYAN)

    # Generate secure values
    secret_key = secrets.token_urlsafe(32)

    # Generate Fernet encryption key
    try:
        from cryptography.fernet import Fernet
        encryption_key = Fernet.generate_key().decode()
    except ImportError:
        # If cryptography not yet importable (it's in the venv), generate a placeholder
        encryption_key = secrets.token_urlsafe(32)

    db_url = (
        f"postgresql://{DB_DEFAULT_USER}:{DB_DEFAULT_PASSWORD}"
        f"@{DB_DEFAULT_HOST}:{DB_DEFAULT_PORT}/{DB_NAME}"
    )

    if ENV_EXAMPLE.exists():
        content = ENV_EXAMPLE.read_text(encoding="utf-8")
        # Replace placeholder values
        content = content.replace(
            "DATABASE_URL=postgresql://user:password@localhost:5432/driving_school_db",
            f"DATABASE_URL={db_url}",
        )
        content = content.replace("SECRET_KEY=", f"SECRET_KEY={secret_key}")
        content = content.replace(
            "ENCRYPTION_KEY=your-base64-encoded-fernet-key",
            f"ENCRYPTION_KEY={encryption_key}",
        )
    else:
        # Build minimal .env
        content = f"""# Auto-generated by bootstrap.py
DATABASE_URL={db_url}
SECRET_KEY={secret_key}
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ENCRYPTION_KEY={encryption_key}
FRONTEND_URL=http://localhost:8081
ENVIRONMENT=development
DEBUG=True
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081
DEFAULT_TIMEZONE=Africa/Johannesburg
DEFAULT_CURRENCY=ZAR
"""

    ENV_FILE.write_text(content, encoding="utf-8")
    log_ok(f"backend/.env created with secure defaults")
    log_warn(f"  Database URL: {db_url}")
    log_warn("  Edit backend/.env to customize settings (Stripe, Twilio, etc.)")
    return True


# ============================================================================
# Step 8: Create PostgreSQL Database
# ============================================================================

def create_database():
    """Create the PostgreSQL database if it doesn't exist."""
    if not cmd_exists("psql"):
        log_warn("psql not available - skipping database creation")
        log_warn(f"  Create it manually: CREATE DATABASE {DB_NAME};")
        return False

    # Check if database already exists
    result = run_cmd(
        ["psql", "-U", DB_DEFAULT_USER, "-lqt"],
        check=False, timeout=15,
    )
    if result and result.returncode == 0 and DB_NAME in result.stdout:
        log_ok(f"Database '{DB_NAME}' already exists")
        return True

    # Create database
    log(f"  Creating database '{DB_NAME}'...", Colors.CYAN)
    os.environ["PGPASSWORD"] = DB_DEFAULT_PASSWORD
    result = run_cmd(
        ["psql", "-U", DB_DEFAULT_USER, "-c", f"CREATE DATABASE {DB_NAME};"],
        check=False, timeout=30,
    )
    if result and result.returncode == 0:
        log_ok(f"Database '{DB_NAME}' created")
        return True

    # Database might already exist (error code for duplicate)
    if result and "already exists" in (result.stderr or ""):
        log_ok(f"Database '{DB_NAME}' already exists")
        return True

    log_warn(f"Could not create database '{DB_NAME}' automatically")
    log_warn(f"  Create it manually: psql -U postgres -c \"CREATE DATABASE {DB_NAME};\"")
    return False


# ============================================================================
# Step 9: Initialize Database Tables
# ============================================================================

def init_database_tables():
    """Run the backend to create all database tables via SQLAlchemy."""
    if not VENV_PYTHON.exists():
        log_warn("Venv Python not found - skipping table creation")
        return False

    log("  Creating database tables via SQLAlchemy...", Colors.CYAN)
    init_script = """
import sys
sys.path.insert(0, '.')
try:
    from app.database import Base, engine
    Base.metadata.create_all(bind=engine)
    print("TABLES_CREATED_OK")
except Exception as e:
    print(f"TABLE_ERROR: {e}", file=sys.stderr)
    sys.exit(1)
"""
    result = run_cmd(
        [str(VENV_PYTHON), "-c", init_script],
        cwd=str(BACKEND_DIR),
        check=False,
        timeout=30,
    )
    if result and result.returncode == 0 and "TABLES_CREATED_OK" in (result.stdout or ""):
        log_ok("Database tables created successfully")
        return True

    stderr_msg = (result.stderr or "").strip() if result else "No output"
    log_warn(f"Table creation issue: {stderr_msg[:200]}")
    log_warn("Tables will be created automatically when the server starts")
    return False


# ============================================================================
# Step 10: Write .installed Marker
# ============================================================================

def write_marker(results):
    """Write the .installed marker file with setup metadata."""
    marker_data = {
        "installed_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        "platform": platform.system(),
        "machine": platform.machine(),
        "results": results,
    }

    # Get Node.js version
    node_result = run_cmd(["node", "--version"], check=False, timeout=5)
    if node_result and node_result.returncode == 0:
        marker_data["node_version"] = node_result.stdout.strip()

    MARKER_FILE.write_text(json.dumps(marker_data, indent=2), encoding="utf-8")
    log_ok(f"Installation marker written to {MARKER_FILE.name}")


def is_installed():
    """Check if the application has already been bootstrapped."""
    if not MARKER_FILE.exists():
        return False

    try:
        data = json.loads(MARKER_FILE.read_text(encoding="utf-8"))
        # Basic validity check
        return bool(data.get("installed_at"))
    except (json.JSONDecodeError, KeyError):
        return False


# ============================================================================
# Bundle Command: Download packages for offline distribution
# ============================================================================

def bundle_packages():
    """Download all packages into vendor/ for offline distribution."""
    log("\n" + "=" * 70, Colors.BOLD)
    log("  BUNDLING PACKAGES FOR OFFLINE DISTRIBUTION", Colors.BOLD)
    log("=" * 70, Colors.BOLD)

    # Bundle Python packages
    log_step(1, 3, "Downloading Python packages to vendor/python/")
    BACKEND_VENDOR.mkdir(parents=True, exist_ok=True)
    result = run_cmd(
        [sys.executable, "-m", "pip", "download",
         "-r", str(REQUIREMENTS_FILE),
         "-d", str(BACKEND_VENDOR),
         "--platform", "win_amd64",
         "--python-version", f"{sys.version_info.major}.{sys.version_info.minor}",
         "--only-binary=:all:"],
        check=False, capture=False, timeout=600,
    )
    if result and result.returncode == 0:
        count = len(list(BACKEND_VENDOR.glob("*.whl"))) + len(list(BACKEND_VENDOR.glob("*.tar.gz")))
        log_ok(f"Downloaded {count} Python packages to vendor/python/")
    else:
        log_warn("Some Python packages may not have been downloaded")
        # Retry without platform restriction for source packages
        log("  Retrying without binary-only restriction...", Colors.CYAN)
        run_cmd(
            [sys.executable, "-m", "pip", "download",
             "-r", str(REQUIREMENTS_FILE),
             "-d", str(BACKEND_VENDOR)],
            check=False, capture=False, timeout=600,
        )

    # Bundle Node.js packages
    log_step(2, 3, "Creating frontend node_modules archive")
    node_modules = FRONTEND_DIR / "node_modules"
    if node_modules.exists():
        FRONTEND_VENDOR.mkdir(parents=True, exist_ok=True)
        tarball = FRONTEND_VENDOR / "node_modules.tar.gz"
        log("  Compressing node_modules (this may take a while)...", Colors.CYAN)
        try:
            import tarfile
            with tarfile.open(str(tarball), "w:gz") as tar:
                tar.add(str(node_modules), arcname="node_modules")
            size_mb = tarball.stat().st_size / (1024 * 1024)
            log_ok(f"node_modules archived: {size_mb:.1f} MB")
        except Exception as exc:
            log_err(f"Failed to archive node_modules: {exc}")
    else:
        log_warn("frontend/node_modules not found - run 'npm install' first")

    # Download installers
    log_step(3, 3, "Downloading system installers")
    INSTALLER_VENDOR.mkdir(parents=True, exist_ok=True)

    installers = {
        "postgresql-installer.exe": (
            "https://get.enterprisedb.com/postgresql/"
            "postgresql-16.6-1-windows-x64.exe"
        ),
        "node-installer.msi": "https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi",
    }

    for filename, url in installers.items():
        dest = INSTALLER_VENDOR / filename
        if dest.exists():
            log_ok(f"{filename} already downloaded")
            continue
        log(f"  Downloading {filename}...", Colors.CYAN)
        try:
            run_cmd([
                sys.executable, "-c",
                f"import urllib.request; urllib.request.urlretrieve('{url}', r'{dest}')"
            ], timeout=600)
            size_mb = dest.stat().st_size / (1024 * 1024)
            log_ok(f"{filename} downloaded ({size_mb:.0f} MB)")
        except Exception as exc:
            log_err(f"Failed to download {filename}: {exc}")

    log("\n" + "=" * 70, Colors.BOLD)
    log("  BUNDLE COMPLETE", Colors.GREEN)
    vendor_size = sum(
        f.stat().st_size for f in VENDOR_DIR.rglob("*") if f.is_file()
    )
    log(f"  Total vendor/ size: {vendor_size / (1024 * 1024):.0f} MB", Colors.CYAN)
    log("  Copy the vendor/ directory to the target machine for offline install", Colors.CYAN)
    log("=" * 70, Colors.BOLD)


# ============================================================================
# Main Bootstrap Flow
# ============================================================================

def bootstrap(force=False, offline=False):
    """Run the full bootstrap process."""
    total_steps = 9

    log("\n" + "=" * 70, Colors.BOLD)
    log("  DRIVE ALIVE - First-Run Bootstrap", Colors.BOLD)
    log("=" * 70, Colors.BOLD)

    if not force and is_installed():
        log("\n  Application already installed.", Colors.GREEN)
        log("  Use --force to re-run bootstrap.", Colors.CYAN)
        return True

    if offline:
        log("  Mode: OFFLINE (using vendor/ packages)", Colors.YELLOW)
    else:
        online = is_online()
        if not online:
            log("  No internet detected - switching to offline mode", Colors.YELLOW)
            offline = True
        else:
            log("  Mode: ONLINE", Colors.GREEN)

    results = {}

    # Step 1: Python
    log_step(1, total_steps, "Checking Python")
    if not check_python():
        log_err("Cannot proceed without Python 3.9+")
        return False
    results["python"] = "ok"

    # Step 2: PostgreSQL
    log_step(2, total_steps, "Checking PostgreSQL")
    if check_postgresql():
        results["postgresql"] = "ok"
    else:
        log("  Attempting to install PostgreSQL...", Colors.CYAN)
        if install_postgresql(offline=offline):
            results["postgresql"] = "installed"
        else:
            results["postgresql"] = "manual_required"
            log_warn("PostgreSQL must be installed manually before the app can fully work")

    # Step 3: Virtual Environment
    log_step(3, total_steps, "Setting up Python virtual environment")
    if not setup_venv():
        log_err("Cannot proceed without virtual environment")
        return False
    results["venv"] = "ok"

    # Step 4: Python Packages
    log_step(4, total_steps, "Installing Python packages")
    if install_python_packages(offline=offline):
        results["python_packages"] = "ok"
    else:
        log_err("Failed to install required Python packages")
        results["python_packages"] = "failed"
        return False

    # Step 5: Node.js
    log_step(5, total_steps, "Checking Node.js")
    if check_nodejs():
        results["nodejs"] = "ok"
    else:
        log("  Attempting to install Node.js...", Colors.CYAN)
        if install_nodejs(offline=offline):
            results["nodejs"] = "installed"
        else:
            results["nodejs"] = "manual_required"
            log_warn("Node.js needed for frontend - install from https://nodejs.org")

    # Step 6: npm Packages
    log_step(6, total_steps, "Installing npm packages")
    if cmd_exists("npm"):
        if install_npm_packages(offline=offline):
            results["npm_packages"] = "ok"
        else:
            results["npm_packages"] = "failed"
            log_warn("Frontend packages not installed - frontend may not work")
    else:
        results["npm_packages"] = "skipped_no_npm"
        log_warn("npm not available - skipping frontend dependencies")

    # Step 7: .env File
    log_step(7, total_steps, "Setting up environment configuration")
    if setup_env_file():
        results["env_file"] = "ok"
    else:
        results["env_file"] = "failed"

    # Step 8: Database
    log_step(8, total_steps, "Creating database")
    if results.get("postgresql") != "manual_required":
        if create_database():
            results["database"] = "ok"
        else:
            results["database"] = "manual_required"
    else:
        results["database"] = "skipped_no_postgresql"
        log_warn("Skipping database creation (PostgreSQL not available)")

    # Step 9: Database Tables
    log_step(9, total_steps, "Initializing database tables")
    if results.get("database") == "ok":
        if init_database_tables():
            results["tables"] = "ok"
        else:
            results["tables"] = "deferred"
    else:
        results["tables"] = "skipped"
        log_warn("Skipping table creation (database not ready)")

    # Write marker
    write_marker(results)

    # Summary
    log("\n" + "=" * 70, Colors.BOLD)
    log("  BOOTSTRAP COMPLETE", Colors.GREEN)
    log("=" * 70, Colors.BOLD)

    ok_count = sum(1 for v in results.values() if v == "ok")
    warn_count = sum(1 for v in results.values() if v not in ("ok", "installed"))
    total = len(results)

    log(f"\n  Results: {ok_count}/{total} OK", Colors.GREEN if warn_count == 0 else Colors.YELLOW)
    for key, value in results.items():
        status_color = Colors.GREEN if value in ("ok", "installed") else Colors.YELLOW
        log(f"    {key}: {value}", status_color)

    if warn_count > 0:
        log("\n  Some components need attention (see warnings above)", Colors.YELLOW)

    log(f"\n  To start the application:", Colors.CYAN)
    log(f"    s.bat            (Windows quick start)", Colors.CYAN)
    log(f"    python bootstrap.py --force   (re-run setup)", Colors.CYAN)
    log(f"    python bootstrap.py --bundle  (create offline package)", Colors.CYAN)
    log("")

    return warn_count == 0


# ============================================================================
# Entry Point
# ============================================================================

if __name__ == "__main__":
    args = sys.argv[1:]
    force = "--force" in args
    offline = "--offline" in args

    if "--bundle" in args:
        bundle_packages()
    else:
        success = bootstrap(force=force, offline=offline)
        sys.exit(0 if success else 1)
