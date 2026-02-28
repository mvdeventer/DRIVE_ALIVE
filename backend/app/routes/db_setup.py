"""
First-run database setup wizard + admin DB-credential reset.

Security improvements
---------------------
* Setup routes are LOCKED once SETUP_COMPLETED_AT is written to .env.
* DB password is stored encrypted (Fernet) as DB_PASSWORD_ENCRYPTED.
  DATABASE_URL in .env contains *** as the password placeholder.
  The real URL is rebuilt in memory by database.py at startup.
* All config changes are written to the audit log (backend/logs/audit.log).
* The /reset endpoint uses a valid JWT Bearer token (admin role only).
* An /admin-reset HTML page lets admins change DB credentials from the browser.

Routes
------
GET  /db-setup               – First-run HTML wizard (locked after setup)
GET  /db-setup/admin-reset   – Admin DB-credentials reset page (JWT required)
GET  /db-setup/status        – JSON {connected, needs_setup, setup_complete}
POST /db-setup/test          – Test a DB connection (no side-effects)
POST /db-setup/configure     – Save credentials & initialise engine (first run only)
POST /db-setup/reset         – Change DB credentials (Bearer JWT, admin only)
"""
from __future__ import annotations

import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote_plus

from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from ..utils.audit_log import write_audit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/db-setup", tags=["db-setup"])

_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"


# ── Helpers ────────────────────────────────────────────────────────────────────

def _build_url(host: str, port: int, user: str, password: str, dbname: str) -> str:
    """Build a live SQLAlchemy URL (password plain-text, only kept in memory)."""
    return f"postgresql://{user}:{quote_plus(password)}@{host}:{port}/{dbname}"


def _masked_url(host: str, port: int, user: str, dbname: str) -> str:
    """Build a .env-safe URL where the password is replaced with ***."""
    return f"postgresql://{user}:***@{host}:{port}/{dbname}"


def _test_url(url: str) -> tuple[bool, str]:
    """Try to connect; return (ok, message)."""
    try:
        eng = create_engine(url, pool_pre_ping=True, connect_args={"connect_timeout": 5})
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        eng.dispose()
        return True, "Connection successful"
    except Exception as exc:
        return False, str(exc)


def _read_env_key(key: str) -> str | None:
    """Read a single key value from .env without importing all settings."""
    if not _ENV_PATH.exists():
        return None
    for line in _ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith(f"{key}="):
            return line[len(key) + 1:].strip()
    return None


def _write_env_key(key: str, value: str) -> None:
    """Update an existing KEY=value line or append it to .env."""
    if _ENV_PATH.exists():
        content = _ENV_PATH.read_text(encoding="utf-8")
    else:
        content = ""

    pattern = rf"^({re.escape(key)}\s*=).*$"
    replacement = f"{key}={value}"
    new_content, n = re.subn(pattern, replacement, content, flags=re.MULTILINE)
    if n == 0:
        new_content = content.rstrip("\n") + f"\n{replacement}\n"
    _ENV_PATH.write_text(new_content, encoding="utf-8")


def _setup_is_complete() -> bool:
    """Return True once SETUP_COMPLETED_AT has been written to .env."""
    return bool(_read_env_key("SETUP_COMPLETED_AT"))


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    return fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "unknown")


def _require_admin_token(authorization: str | None) -> dict:
    """Decode Bearer JWT and assert role == ADMIN.  Raises HTTPException otherwise."""
    from ..utils.auth import decode_access_token
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Bearer token required.")
    token = authorization[7:].strip()
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    role = (payload.get("role") or "").upper()
    if role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin role required.")
    return payload


# ── Pydantic models ────────────────────────────────────────────────────────────

class DBCredentials(BaseModel):
    host: str = "localhost"
    port: int = 5432
    user: str = "postgres"
    password: str
    dbname: str = "driving_school_db"


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/status")
def db_status():
    from ..database import engine as _engine
    connected = _engine is not None
    return {
        "connected": connected,
        "needs_setup": not connected,
        "setup_complete": _setup_is_complete(),
    }


@router.post("/test")
def test_connection(creds: DBCredentials):
    """Test credentials without saving anything."""
    url = _build_url(creds.host, creds.port, creds.user, creds.password, creds.dbname)
    ok, msg = _test_url(url)
    if not ok:
        raise HTTPException(status_code=400, detail=f"Connection failed: {msg}")
    return {"success": True, "message": msg}


@router.post("/configure")
def configure_database(creds: DBCredentials, request: Request):
    """
    Save DB credentials to backend/.env, reinitialise the SQLAlchemy engine,
    create all tables, and check for an existing admin user.
    Permanently locked once SETUP_COMPLETED_AT is written to .env.
    """
    if _setup_is_complete():
        raise HTTPException(
            status_code=403,
            detail="Setup is already complete. Use /db-setup/admin-reset to change credentials.",
        )

    url = _build_url(creds.host, creds.port, creds.user, creds.password, creds.dbname)
    ok, msg = _test_url(url)
    if not ok:
        raise HTTPException(status_code=400, detail=f"Connection failed: {msg}")

    # Encrypt password before persisting anything to disk
    try:
        from ..utils.encryption import EncryptionService
        enc_password = EncryptionService.encrypt(creds.password)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Encryption error: {exc}") from exc

    # Write individual parts + encrypted password + masked URL (no plain password on disk)
    _write_env_key("DB_HOST", creds.host)
    _write_env_key("DB_PORT", str(creds.port))
    _write_env_key("DB_USER", creds.user)
    _write_env_key("DB_NAME", creds.dbname)
    _write_env_key("DB_PASSWORD_ENCRYPTED", enc_password)
    _write_env_key("DATABASE_URL", _masked_url(creds.host, creds.port, creds.user, creds.dbname))

    # Expose to os.environ so database.py _get_effective_url() sees them immediately
    os.environ["DB_HOST"] = creds.host
    os.environ["DB_PORT"] = str(creds.port)
    os.environ["DB_USER"] = creds.user
    os.environ["DB_NAME"] = creds.dbname
    os.environ["DB_PASSWORD_ENCRYPTED"] = enc_password
    os.environ["DATABASE_URL"] = _masked_url(creds.host, creds.port, creds.user, creds.dbname)

    from .. import database as _db_module
    from ..database import Base, reinitialize_engine

    # Pass the plain URL directly so the engine is live right now
    success = reinitialize_engine(url)
    if not success:
        raise HTTPException(status_code=500, detail="Engine reinitialisation failed after saving credentials.")

    try:
        Base.metadata.create_all(bind=_db_module.engine)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Table creation failed: {exc}") from exc

    # Lock this endpoint permanently
    _write_env_key("SETUP_COMPLETED_AT", datetime.now(timezone.utc).isoformat())

    # Check if admin already exists
    from ..database import SessionLocal
    from ..models.user import User, UserRole
    admin_exists = False
    if SessionLocal is not None:
        try:
            db: Session = SessionLocal()
            admin_exists = db.query(User).filter(User.role == UserRole.ADMIN).first() is not None
            db.close()
        except Exception:
            pass

    write_audit(
        "DB_CREDENTIALS_SAVED",
        actor="setup_wizard",
        ip=_client_ip(request),
        detail=f"host={creds.host} port={creds.port} dbname={creds.dbname} user={creds.user}",
    )

    return {
        "success": True,
        "message": "Database configured and tables created.",
        "admin_exists": admin_exists,
        "next_step": "/setup/status" if admin_exists else "/setup/create-initial-admin",
    }


@router.post("/reset")
def reset_db_credentials(
    creds: DBCredentials,
    request: Request,
    authorization: str | None = Header(default=None),
):
    """
    Admin-only: change the DATABASE_URL at runtime.
    Requires a valid JWT Bearer token with role=ADMIN in the Authorization header.
    """
    payload = _require_admin_token(authorization)
    actor = payload.get("sub") or "admin"

    from ..database import engine as _engine, reinitialize_engine
    if _engine is None:
        raise HTTPException(status_code=503, detail="Database not connected.")

    new_url = _build_url(creds.host, creds.port, creds.user, creds.password, creds.dbname)
    ok, msg = _test_url(new_url)
    if not ok:
        raise HTTPException(status_code=400, detail=f"New connection failed: {msg}")

    try:
        from ..utils.encryption import EncryptionService
        enc_password = EncryptionService.encrypt(creds.password)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Encryption error: {exc}") from exc

    _write_env_key("DB_HOST", creds.host)
    _write_env_key("DB_PORT", str(creds.port))
    _write_env_key("DB_USER", creds.user)
    _write_env_key("DB_NAME", creds.dbname)
    _write_env_key("DB_PASSWORD_ENCRYPTED", enc_password)
    _write_env_key("DATABASE_URL", _masked_url(creds.host, creds.port, creds.user, creds.dbname))

    os.environ["DB_HOST"] = creds.host
    os.environ["DB_PORT"] = str(creds.port)
    os.environ["DB_USER"] = creds.user
    os.environ["DB_NAME"] = creds.dbname
    os.environ["DB_PASSWORD_ENCRYPTED"] = enc_password
    os.environ["DATABASE_URL"] = _masked_url(creds.host, creds.port, creds.user, creds.dbname)

    reinitialize_engine(new_url)

    write_audit(
        "DB_CREDENTIALS_RESET",
        actor=actor,
        ip=_client_ip(request),
        detail=f"host={creds.host} port={creds.port} dbname={creds.dbname} user={creds.user}",
    )

    return {"success": True, "message": "Database credentials updated and engine reinitialized."}


# ── HTML Wizard ────────────────────────────────────────────────────────────────

_WIZARD_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Drive Alive – Database Setup</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: system-ui, -apple-system, sans-serif;
    background: #0f172a;
    color: #e2e8f0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
  }
  .card {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 1rem;
    padding: 2.5rem;
    width: 100%;
    max-width: 480px;
    box-shadow: 0 25px 60px rgba(0,0,0,.5);
  }
  .logo { text-align: center; margin-bottom: 2rem; }
  .logo h1 { font-size: 1.75rem; font-weight: 700; color: #38bdf8; letter-spacing: -0.5px; }
  .logo p { color: #94a3b8; font-size: .9rem; margin-top: .25rem; }
  label { display: block; font-size: .8rem; font-weight: 600; color: #94a3b8;
          letter-spacing: .05em; text-transform: uppercase; margin-bottom: .4rem; margin-top: 1.1rem; }
  input {
    width: 100%;
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: .5rem;
    color: #f1f5f9;
    padding: .65rem .9rem;
    font-size: .95rem;
    transition: border-color .2s;
  }
  input:focus { outline: none; border-color: #38bdf8; }
  .row { display: grid; grid-template-columns: 3fr 1fr; gap: .75rem; }
  button {
    width: 100%;
    margin-top: 1.75rem;
    padding: .8rem;
    border: none;
    border-radius: .5rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity .2s, transform .1s;
  }
  button:active { transform: scale(.98); }
  .btn-test {
    background: #334155;
    color: #e2e8f0;
    margin-bottom: .5rem;
  }
  .btn-save { background: #0ea5e9; color: #fff; }
  button:disabled { opacity: .5; cursor: not-allowed; }
  #msg {
    margin-top: 1rem;
    padding: .75rem 1rem;
    border-radius: .5rem;
    font-size: .9rem;
    display: none;
  }
  .msg-ok  { background: #052e16; border: 1px solid #16a34a; color: #86efac; }
  .msg-err { background: #450a0a; border: 1px solid #dc2626; color: #fca5a5; }
  .step2 { display: none; }
  .divider { border: none; border-top: 1px solid #334155; margin: 1.5rem 0; }
  .note { color: #64748b; font-size: .8rem; text-align: center; margin-top: 1rem; }
</style>
</head>
<body>
<div class="card">
  <div class="logo">
    <h1>🚗 Drive Alive</h1>
    <p>First-run database configuration</p>
  </div>

  <div id="step1">
    <label>Host</label>
    <input id="host" type="text" value="localhost" placeholder="localhost">

    <div class="row">
      <div>
        <label>Database name</label>
        <input id="dbname" type="text" value="driving_school_db" placeholder="driving_school_db">
      </div>
      <div>
        <label>Port</label>
        <input id="port" type="number" value="5432" placeholder="5432">
      </div>
    </div>

    <label>Username</label>
    <input id="user" type="text" value="postgres" placeholder="postgres">

    <label>Password</label>
    <input id="password" type="password" placeholder="PostgreSQL password">

    <button class="btn-test" id="btnTest" onclick="testConn()">Test connection</button>
    <button class="btn-save" id="btnSave" onclick="saveConn()" disabled>Save &amp; continue</button>

    <div id="msg"></div>
    <p class="note">Credentials are saved to <code>backend/.env</code> and encrypted at rest.</p>
  </div>

  <div class="step2" id="step2">
    <hr class="divider">
    <p style="text-align:center;color:#4ade80;font-size:1.1rem;font-weight:600;">
      ✓ Database connected &amp; tables created
    </p>
    <p style="text-align:center;color:#94a3b8;margin-top:.5rem;font-size:.9rem;" id="nextMsg"></p>
    <button class="btn-save" style="margin-top:1.5rem" onclick="goNext()">Continue →</button>
  </div>
</div>

<script>
let _nextUrl = '/';
function creds() {
  return {
    host: document.getElementById('host').value,
    port: parseInt(document.getElementById('port').value) || 5432,
    user: document.getElementById('user').value,
    password: document.getElementById('password').value,
    dbname: document.getElementById('dbname').value,
  };
}
function showMsg(text, ok) {
  const el = document.getElementById('msg');
  el.textContent = text;
  el.className = ok ? 'msg-ok' : 'msg-err';
  el.style.display = 'block';
}
async function testConn() {
  const btn = document.getElementById('btnTest');
  btn.disabled = true; btn.textContent = 'Testing…';
  try {
    const r = await fetch('/db-setup/test', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify(creds())
    });
    const d = await r.json();
    if (r.ok) {
      showMsg('✓ Connection successful – you can now save.', true);
      document.getElementById('btnSave').disabled = false;
    } else {
      showMsg('✗ ' + (d.detail || 'Connection failed'), false);
    }
  } catch(e) { showMsg('✗ Network error: ' + e, false); }
  btn.disabled = false; btn.textContent = 'Test connection';
}
async function saveConn() {
  const btn = document.getElementById('btnSave');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const r = await fetch('/db-setup/configure', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify(creds())
    });
    const d = await r.json();
    if (r.ok) {
      document.getElementById('step1').style.display = 'none';
      document.getElementById('step2').style.display = 'block';
      _nextUrl = d.next_step || '/';
      const msg = d.admin_exists
        ? 'An admin account already exists. Proceed to login.'
        : 'No admin account found. Create the first admin account now.';
      document.getElementById('nextMsg').textContent = msg;
    } else {
      showMsg('✗ ' + (d.detail || 'Save failed'), false);
      btn.disabled = false; btn.textContent = 'Save & continue';
    }
  } catch(e) {
    showMsg('✗ Network error: ' + e, false);
    btn.disabled = false; btn.textContent = 'Save & continue';
  }
}
function goNext() { window.location.href = _nextUrl; }
</script>
</body>
</html>
"""


@router.get("", response_class=HTMLResponse)
@router.get("/", response_class=HTMLResponse)
def setup_wizard():
    """Serve the first-run database setup wizard (redirects away once setup is complete)."""
    from ..database import engine as _engine
    if _setup_is_complete() or _engine is not None:
        return RedirectResponse(url="/")
    return HTMLResponse(content=_WIZARD_HTML)


# ── Admin DB-reset page ─────────────────────────────────────────────────────────

_ADMIN_RESET_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Drive Alive – Change DB Credentials</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #e2e8f0;
         min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
  .card { background: #1e293b; border: 1px solid #334155; border-radius: 1rem; padding: 2.5rem;
          width: 100%; max-width: 480px; box-shadow: 0 25px 60px rgba(0,0,0,.5); }
  .logo { text-align: center; margin-bottom: 2rem; }
  .logo h1 { font-size: 1.75rem; font-weight: 700; color: #f59e0b; letter-spacing: -0.5px; }
  .logo p { color: #94a3b8; font-size: .9rem; margin-top: .25rem; }
  label { display: block; font-size: .8rem; font-weight: 600; color: #94a3b8; letter-spacing: .05em;
          text-transform: uppercase; margin-bottom: .4rem; margin-top: 1.1rem; }
  input { width: 100%; background: #0f172a; border: 1px solid #334155; border-radius: .5rem;
          color: #f1f5f9; padding: .65rem .9rem; font-size: .95rem; transition: border-color .2s; }
  input:focus { outline: none; border-color: #f59e0b; }
  .row { display: grid; grid-template-columns: 3fr 1fr; gap: .75rem; }
  button { width: 100%; margin-top: 1.75rem; padding: .8rem; border: none; border-radius: .5rem;
           font-size: 1rem; font-weight: 600; cursor: pointer; transition: opacity .2s, transform .1s; }
  button:active { transform: scale(.98); }
  .btn-test { background: #334155; color: #e2e8f0; margin-bottom: .5rem; }
  .btn-save { background: #f59e0b; color: #000; }
  button:disabled { opacity: .5; cursor: not-allowed; }
  #msg { margin-top: 1rem; padding: .75rem 1rem; border-radius: .5rem; font-size: .9rem; display: none; }
  .msg-ok  { background: #052e16; border: 1px solid #16a34a; color: #86efac; }
  .msg-err { background: #450a0a; border: 1px solid #dc2626; color: #fca5a5; }
  .note { color: #64748b; font-size: .8rem; text-align: center; margin-top: 1rem; }
  code { background: #0f172a; padding: .15rem .4rem; border-radius: .25rem; font-size: .85em; }
</style>
</head>
<body>
<div class="card">
  <div class="logo">
    <h1>🔒 Drive Alive</h1>
    <p>Change database credentials</p>
  </div>

  <div id="authCheck" style="text-align:center;color:#94a3b8;padding:2rem 0;">Verifying admin session…</div>

  <div id="form" style="display:none">
    <label>Host</label>
    <input id="host" type="text" value="localhost">
    <div class="row">
      <div><label>Database name</label><input id="dbname" type="text" value="driving_school_db"></div>
      <div><label>Port</label><input id="port" type="number" value="5432"></div>
    </div>
    <label>Username</label>
    <input id="user" type="text" value="postgres">
    <label>New DB Password</label>
    <input id="password" type="password" placeholder="New PostgreSQL password">
    <button class="btn-test" onclick="testConn()">Test connection</button>
    <button class="btn-save" id="btnSave" onclick="saveConn()" disabled>Save new credentials</button>
    <div id="msg"></div>
    <p class="note">Your admin JWT token is sent in the Authorization header and the change is written to the audit log.</p>
  </div>

  <div id="authErr" style="display:none;text-align:center;padding:2rem 0">
    <p style="color:#fca5a5">⚠ You must be logged in as an admin to access this page.</p>
    <button class="btn-save" style="margin-top:1rem" onclick="window.location.href='/'">Go to login</button>
  </div>
</div>

<script>
let _token = null;
(async () => {
  _token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
  document.getElementById('authCheck').style.display = 'none';
  if (!_token) {
    document.getElementById('authErr').style.display = 'block';
  } else {
    document.getElementById('form').style.display = 'block';
  }
})();
function creds() {
  return {
    host: document.getElementById('host').value,
    port: parseInt(document.getElementById('port').value) || 5432,
    user: document.getElementById('user').value,
    password: document.getElementById('password').value,
    dbname: document.getElementById('dbname').value,
  };
}
function showMsg(text, ok) {
  const el = document.getElementById('msg');
  el.textContent = text;
  el.className = ok ? 'msg-ok' : 'msg-err';
  el.style.display = 'block';
}
async function testConn() {
  try {
    const r = await fetch('/db-setup/test', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify(creds())
    });
    const d = await r.json();
    if (r.ok) {
      showMsg('✓ Connection successful – you can save.', true);
      document.getElementById('btnSave').disabled = false;
    } else {
      showMsg('✗ ' + (d.detail || 'Test failed'), false);
    }
  } catch (e) { showMsg('✗ ' + e, false); }
}
async function saveConn() {
  const btn = document.getElementById('btnSave');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const r = await fetch('/db-setup/reset', {
      method: 'POST',
      headers: {'Content-Type':'application/json', 'Authorization': 'Bearer ' + _token},
      body: JSON.stringify(creds())
    });
    const d = await r.json();
    if (r.ok) {
      showMsg('✓ Credentials updated successfully. Changes are live.', true);
    } else {
      showMsg('✗ ' + (d.detail || 'Reset failed'), false);
      btn.disabled = false; btn.textContent = 'Save new credentials';
    }
  } catch (e) {
    showMsg('✗ ' + e, false);
    btn.disabled = false; btn.textContent = 'Save new credentials';
  }
}
</script>
</body>
</html>
"""


@router.get("/admin-reset", response_class=HTMLResponse)
def admin_reset_page():
    """Admin-only page to change DB credentials after first setup."""
    if not _setup_is_complete():
        return RedirectResponse(url="/db-setup")
    return HTMLResponse(content=_ADMIN_RESET_HTML)
