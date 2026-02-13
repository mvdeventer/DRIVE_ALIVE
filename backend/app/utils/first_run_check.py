"""
First-Run Dependency Check Module
===================================
Runtime safety net that runs inside main.py lifespan to verify all
required packages are importable and attempt self-healing if anything
is missing. Also validates database connectivity.

This is the FALLBACK mechanism. The primary setup path is bootstrap.py
which should be run before starting the server.
"""

import importlib
import os
import subprocess
import sys
from pathlib import Path


# Map of import names to pip package names (when they differ)
IMPORT_TO_PACKAGE = {
    "fastapi": "fastapi",
    "uvicorn": "uvicorn[standard]",
    "sqlalchemy": "sqlalchemy",
    "psycopg2": "psycopg2-binary",
    "jose": "python-jose[cryptography]",
    "passlib": "passlib",
    "bcrypt": "bcrypt",
    "pydantic_settings": "pydantic-settings",
    "dotenv": "python-dotenv",
    "stripe": "stripe",
    "twilio": "twilio",
    "geopy": "geopy",
    "slowapi": "slowapi",
    "cryptography": "cryptography",
    "multipart": "python-multipart",
    "email_validator": "email-validator",
    "dateutil": "python-dateutil",
    "pytz": "pytz",
    "requests": "requests",
    "redis": "redis",
    "alembic": "alembic",
}


def check_imports():
    """
    Check all critical imports and return list of missing ones.

    Returns:
        tuple: (list of missing import names, list of corresponding pip packages)
    """
    missing_imports = []
    missing_packages = []

    for import_name, pip_name in IMPORT_TO_PACKAGE.items():
        try:
            importlib.import_module(import_name)
        except ImportError:
            missing_imports.append(import_name)
            missing_packages.append(pip_name)

    return missing_imports, missing_packages


def attempt_self_heal(missing_packages):
    """
    Attempt to install missing packages using pip.

    Tries online first, then falls back to vendor/ directory if available.

    Args:
        missing_packages: List of pip package names to install.

    Returns:
        bool: True if all packages were installed successfully.
    """
    if not missing_packages:
        return True

    print(f"⚠️  Missing packages detected: {', '.join(missing_packages)}")
    print("🔧 Attempting to install missing packages...")

    # Determine paths
    backend_dir = Path(__file__).parent.parent.parent
    requirements_file = backend_dir / "requirements.txt"
    vendor_dir = backend_dir.parent / "vendor" / "python"

    # Try full requirements install (ensures version compatibility)
    if requirements_file.exists():
        result = subprocess.run(
            [sys.executable, "-m", "pip", "install", "-r", str(requirements_file)],
            capture_output=True, text=True, timeout=300,
        )
        if result.returncode == 0:
            print("✅ Packages installed successfully from PyPI")
            return True
        print(f"⚠️  Online install failed: {result.stderr[:200]}")

    # Offline fallback
    if vendor_dir.exists() and any(vendor_dir.iterdir()):
        print("📦 Trying offline install from vendor/...")
        if requirements_file.exists():
            result = subprocess.run(
                [sys.executable, "-m", "pip", "install",
                 "--no-index", f"--find-links={vendor_dir}",
                 "-r", str(requirements_file)],
                capture_output=True, text=True, timeout=300,
            )
        else:
            result = subprocess.run(
                [sys.executable, "-m", "pip", "install",
                 "--no-index", f"--find-links={vendor_dir}"] + missing_packages,
                capture_output=True, text=True, timeout=300,
            )
        if result.returncode == 0:
            print("✅ Packages installed from vendor/ (offline)")
            return True
        print(f"⚠️  Offline install also failed: {result.stderr[:200]}")

    # Try installing just the missing ones individually
    print("📦 Trying individual package install...")
    all_ok = True
    for pkg in missing_packages:
        result = subprocess.run(
            [sys.executable, "-m", "pip", "install", pkg],
            capture_output=True, text=True, timeout=120,
        )
        if result.returncode != 0:
            print(f"  ✗ Failed to install {pkg}")
            all_ok = False
        else:
            print(f"  ✓ Installed {pkg}")

    return all_ok


def check_database_connectivity(database_url=None):
    """
    Test database connectivity.

    Args:
        database_url: Optional explicit URL. If None, reads from settings.

    Returns:
        bool: True if database is reachable.
    """
    try:
        if database_url is None:
            from ..config import settings
            database_url = settings.DATABASE_URL

        from sqlalchemy import create_engine, text
        engine = create_engine(database_url, pool_pre_ping=True)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        print(f"⚠️  Database connectivity check failed: {exc}")
        return False


def check_env_file():
    """
    Check if .env file exists and has required values.

    Returns:
        tuple: (bool exists, list of missing required keys)
    """
    backend_dir = Path(__file__).parent.parent.parent
    env_file = backend_dir / ".env"

    if not env_file.exists():
        return False, ["DATABASE_URL", "SECRET_KEY"]

    content = env_file.read_text(encoding="utf-8")
    required_keys = ["DATABASE_URL", "SECRET_KEY"]
    missing = []
    for key in required_keys:
        # Check that key exists and has a non-empty value
        found = False
        for line in content.splitlines():
            line = line.strip()
            if line.startswith(f"{key}=") and len(line) > len(f"{key}="):
                found = True
                break
        if not found:
            missing.append(key)

    return True, missing


def run_first_run_check():
    """
    Main entry point for first-run validation.

    Called from main.py lifespan before the app starts serving requests.
    Checks all dependencies and attempts self-healing if anything is missing.

    Returns:
        dict: Status report with keys for each check area.
    """
    report = {
        "packages_ok": False,
        "env_ok": False,
        "db_ok": False,
        "self_healed": False,
    }

    print("\n" + "=" * 60)
    print("🔍 First-Run Dependency Check")
    print("=" * 60)

    # 1. Check .env file
    env_exists, missing_keys = check_env_file()
    if not env_exists:
        print("⚠️  No .env file found!")
        print("   Run: python bootstrap.py")
        print("   Or copy backend/.env.example to backend/.env and fill in values")
        report["env_ok"] = False
    elif missing_keys:
        print(f"⚠️  .env missing required values: {', '.join(missing_keys)}")
        report["env_ok"] = False
    else:
        print("✅ Environment configuration OK")
        report["env_ok"] = True

    # 2. Check Python packages
    missing_imports, missing_packages = check_imports()
    if missing_imports:
        print(f"⚠️  Missing imports: {', '.join(missing_imports)}")
        success = attempt_self_heal(missing_packages)
        report["self_healed"] = success
        if success:
            # Re-check after healing
            still_missing, _ = check_imports()
            report["packages_ok"] = len(still_missing) == 0
            if still_missing:
                print(f"❌ Still missing after install: {', '.join(still_missing)}")
        else:
            report["packages_ok"] = False
            print("❌ Could not install all required packages")
            print("   Run: python bootstrap.py")
    else:
        print("✅ All Python packages OK")
        report["packages_ok"] = True

    # 3. Check database connectivity
    if report["env_ok"]:
        db_ok = check_database_connectivity()
        report["db_ok"] = db_ok
        if db_ok:
            print("✅ Database connection OK")
        else:
            print("⚠️  Database not reachable")
            print("   Ensure PostgreSQL is running and DATABASE_URL is correct")
            print("   Run: python bootstrap.py  (to auto-create database)")
    else:
        print("⚠️  Skipping database check (env not configured)")

    print("=" * 60)

    # Summary
    all_ok = all(report.values())
    if all_ok:
        print("✅ All first-run checks passed\n")
    else:
        failed = [k for k, v in report.items() if not v]
        print(f"⚠️  Issues found: {', '.join(failed)}")
        print("   Run 'python bootstrap.py' for automatic setup\n")

    return report
