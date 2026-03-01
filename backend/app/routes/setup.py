"""
System initialization endpoints for first-time setup.

First-run wizard flow
---------------------
1. GET  /db-setup          – configure PostgreSQL connection
2. GET  /setup/wizard      – multi-step HTML: admin account → email/WhatsApp → payments
3. POST /setup/save-services – persist payment-gateway & frontend-URL to .env
"""
import os
import re
from datetime import datetime, timezone
from pathlib import Path
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User, UserRole, UserStatus
from ..schemas.admin import AdminCreateRequest
from ..utils.auth import get_password_hash
from ..utils.encryption import EncryptionService  # For SMTP password encryption

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/setup", tags=["setup"])


def _persist_twilio_to_env(account_sid: str | None, auth_token: str | None) -> None:
    """Write Twilio credentials into the project .env file so they survive server restarts."""
    if not account_sid and not auth_token:
        return
    try:
        from dotenv import set_key
        env_path = Path(__file__).resolve().parents[3] / ".env"
        if env_path.exists():
            if account_sid:
                set_key(str(env_path), "TWILIO_ACCOUNT_SID", account_sid.strip())
            if auth_token:
                set_key(str(env_path), "TWILIO_AUTH_TOKEN", auth_token.strip())
    except Exception as exc:
        logger.warning("Could not persist messaging config to .env (%s).", type(exc).__name__)


@router.get("/status")
def get_setup_status(db: Session = Depends(get_db)):
    """
    Get system setup/initialization status
    Returns whether admin exists and system is ready for use
    """
    admin_exists = db.query(User).filter(User.role == UserRole.ADMIN).first()
    
    return {
        "initialized": admin_exists is not None,
        "requires_setup": admin_exists is None,
        "message": (
            "System is initialized and ready"
            if admin_exists
            else "System requires initial admin setup"
        ),
    }


def _build_admin_user(admin_data: AdminCreateRequest) -> User:
    """Construct a User instance from AdminCreateRequest, encrypting secrets."""
    _enc = EncryptionService.encrypt
    return User(
        email=admin_data.email,
        phone=admin_data.phone,
        password_hash=get_password_hash(admin_data.password),
        first_name=admin_data.first_name,
        last_name=admin_data.last_name,
        id_number=admin_data.id_number,
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
        address=admin_data.address,
        address_latitude=admin_data.address_latitude,
        address_longitude=admin_data.address_longitude,
        smtp_email=admin_data.smtp_email,
        smtp_password=_enc(admin_data.smtp_password) if admin_data.smtp_password else None,
        verification_link_validity_minutes=admin_data.verification_link_validity_minutes or 30,
        twilio_sender_phone_number=admin_data.twilio_sender_phone_number,
        twilio_phone_number=admin_data.twilio_phone_number,
        twilio_account_sid=_enc(admin_data.twilio_account_sid) if admin_data.twilio_account_sid else None,
        twilio_auth_token=_enc(admin_data.twilio_auth_token) if admin_data.twilio_auth_token else None,
    )


@router.post("/create-initial-admin", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_initial_admin(admin_data: AdminCreateRequest, db: Session = Depends(get_db)):
    """
    Create the initial admin user.
    This endpoint is ONLY available on first run before any admin exists.
    """
    existing_admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    if existing_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"System already initialized. Admin user exists: {existing_admin.email}. Please use login to continue.",
        )
    existing_user = db.query(User).filter(User.email == admin_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email '{admin_data.email}' is already registered. Please use a different email.",
        )
    new_admin = _build_admin_user(admin_data)
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)
    _persist_twilio_to_env(admin_data.twilio_account_sid, admin_data.twilio_auth_token)
    return {
        "message": "Admin account created successfully! You can now log in.",
        "user_id": new_admin.id,
        "verification_sent": {"email_sent": False, "whatsapp_sent": False, "expires_in_minutes": 0},
        "note": "Admin account is active immediately. No verification required.",
    }




_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"


def _write_env_key(key: str, value: str) -> None:
    """Update or append KEY=value in backend/.env."""
    content = _ENV_PATH.read_text(encoding="utf-8") if _ENV_PATH.exists() else ""
    pattern = rf"^({re.escape(key)}\s*=).*$"
    new_content, n = re.subn(pattern, f"{key}={value}", content, flags=re.MULTILINE)
    if n == 0:
        new_content = content.rstrip("\n") + f"\n{key}={value}\n"
    _ENV_PATH.write_text(new_content, encoding="utf-8")


class ServiceCredentials(BaseModel):
    payfast_merchant_id: str = ""
    payfast_merchant_key: str = ""
    payfast_passphrase: str = ""
    payfast_mode: str = "sandbox"
    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret: str = ""
    frontend_url: str = "http://localhost:8081"


@router.post("/save-services")
def save_services(creds: ServiceCredentials):
    """
    Persist payment-gateway and frontend-URL settings to backend/.env.
    All fields are optional; only non-empty values are written.
    """
    pairs = [
        ("PAYFAST_MERCHANT_ID",  creds.payfast_merchant_id),
        ("PAYFAST_MERCHANT_KEY", creds.payfast_merchant_key),
        ("PAYFAST_PASSPHRASE",   creds.payfast_passphrase),
        ("PAYFAST_MODE",         creds.payfast_mode),
        ("STRIPE_SECRET_KEY",    creds.stripe_secret_key),
        ("STRIPE_PUBLISHABLE_KEY", creds.stripe_publishable_key),
        ("STRIPE_WEBHOOK_SECRET", creds.stripe_webhook_secret),
        ("FRONTEND_URL",         creds.frontend_url),
    ]
    for key, value in pairs:
        if value.strip():
            _write_env_key(key, value.strip())
            os.environ[key] = value.strip()
    _write_env_key("SERVICES_CONFIGURED_AT", datetime.now(timezone.utc).isoformat())
    return {"success": True, "message": "Service credentials saved."}


# ── First-run setup wizard HTML ────────────────────────────────────────────────

_WIZARD_CSS = """
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;
     min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.5rem}
.card{background:#1e293b;border:1px solid #334155;border-radius:1rem;padding:2.5rem;
      width:100%;max-width:560px;box-shadow:0 25px 60px rgba(0,0,0,.5)}
.logo{text-align:center;margin-bottom:1.25rem}
.logo h1{font-size:1.75rem;font-weight:700;color:#38bdf8;letter-spacing:-0.5px}
.logo p{color:#94a3b8;font-size:.85rem;margin-top:.25rem}
.progress{display:flex;align-items:center;justify-content:center;margin-bottom:.4rem}
.step-dot{width:1.9rem;height:1.9rem;border-radius:50%;display:flex;align-items:center;
          justify-content:center;font-size:.8rem;font-weight:700;background:#334155;
          color:#64748b;border:2px solid #334155;transition:all .3s;flex-shrink:0}
.step-dot.active{background:#0ea5e9;border-color:#0ea5e9;color:#fff}
.step-dot.done{background:#16a34a;border-color:#16a34a;color:#fff}
.step-line{height:2px;flex:1;background:#334155;margin:0 .3rem;transition:background .3s}
.step-line.done{background:#16a34a}
.step-labels{display:flex;justify-content:space-between;color:#475569;font-size:.7rem;
             margin-bottom:1.4rem}
.sec{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;
     color:#475569;margin-top:1.5rem;margin-bottom:.6rem;padding-bottom:.45rem;
     border-bottom:1px solid #334155}
badge{background:#1e3a5f;color:#7dd3fc;font-size:.62rem;font-weight:700;
      letter-spacing:.04em;padding:.1rem .45rem;border-radius:9999px;
      text-transform:uppercase;vertical-align:middle;margin-left:.4rem}
label{display:block;font-size:.78rem;font-weight:600;color:#94a3b8;letter-spacing:.05em;
      text-transform:uppercase;margin-bottom:.35rem;margin-top:.9rem}
input,select{width:100%;background:#0f172a;border:1px solid #334155;border-radius:.5rem;
      color:#f1f5f9;padding:.62rem .9rem;font-size:.93rem;transition:border-color .2s}
input:focus,select:focus{outline:none;border-color:#38bdf8}
select option{background:#1e293b}
.row{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}
.btns{display:flex;gap:.75rem;margin-top:1.75rem}
button{flex:1;padding:.78rem;border:none;border-radius:.5rem;font-size:.95rem;font-weight:600;
       cursor:pointer;transition:opacity .2s,transform .1s}
button:active{transform:scale(.98)}
button:disabled{opacity:.5;cursor:not-allowed}
.btn-back{background:#334155;color:#e2e8f0;flex:0 0 auto;padding:.78rem 1.25rem}
.btn-next{background:#0ea5e9;color:#fff}
.btn-go{background:#16a34a;color:#fff}
.skip{display:block;text-align:center;color:#475569;font-size:.78rem;margin-top:.6rem;
      cursor:pointer;text-decoration:underline}
.skip:hover{color:#94a3b8}
.hint{color:#475569;font-size:.73rem;margin-top:.3rem;line-height:1.4}
.msg{margin-top:.9rem;padding:.72rem 1rem;border-radius:.5rem;font-size:.88rem;display:none}
.msg-err{background:#450a0a;border:1px solid #dc2626;color:#fca5a5}
.msg-ok{background:#052e16;border:1px solid #16a34a;color:#86efac}
</style>
"""

_WIZARD_HTML = (
    "<!DOCTYPE html><html lang='en'><head>"
    "<meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1.0'>"
    "<title>Drive Alive \u2013 Initial Setup</title>"
    + _WIZARD_CSS
    + """</head><body>
<div class='card'>
  <div class='logo'>
    <h1>&#x1F697; Drive Alive</h1>
    <p id='stepTitle'>Step 1 of 3 &ndash; Admin Account</p>
  </div>
  <div class='progress' id='pgBar'>
    <div class='step-dot active' id='d1'>1</div>
    <div class='step-line' id='l1'></div>
    <div class='step-dot' id='d2'>2</div>
    <div class='step-line' id='l2'></div>
    <div class='step-dot' id='d3'>3</div>
  </div>
  <div class='step-labels'><span>Admin Account</span><span>Communications</span><span>Payments</span></div>

  <!-- Step 1 -->
  <div id='s1'>
    <div class='row'>
      <div><label>First Name</label><input id='firstName' type='text' placeholder='First name' autocomplete='given-name'></div>
      <div><label>Last Name</label><input id='lastName' type='text' placeholder='Last name' autocomplete='family-name'></div>
    </div>
    <label>Email Address</label>
    <input id='email' type='email' placeholder='admin@yourdrivingschool.com' autocomplete='email'>
    <label>SA Phone Number</label>
    <input id='phone' type='tel' placeholder='+27611234567' autocomplete='tel'>
    <p class='hint'>International format: +27 followed by 9 digits</p>
    <label>SA ID Number</label>
    <input id='idNumber' type='text' maxlength='13' placeholder='13-digit identity number'>
    <label>Password</label>
    <input id='pass1' type='password' placeholder='Min 12 chars &ndash; upper, lower, digit, special' autocomplete='new-password'>
    <label>Confirm Password</label>
    <input id='pass2' type='password' placeholder='Repeat password' autocomplete='new-password'>
    <div id='m1' class='msg'></div>
    <div class='btns'><button class='btn-next' onclick='s1Next()'>Next &rarr;</button></div>
  </div>

  <!-- Step 2 -->
  <div id='s2' style='display:none'>
    <p class='sec'>Email (Gmail) <badge>Optional</badge></p>
    <label>Gmail Address</label>
    <input id='smtpEmail' type='email' placeholder='yourschool@gmail.com'>
    <label>Gmail App Password</label>
    <input id='smtpPass' type='password' placeholder='xxxx xxxx xxxx xxxx'>
    <p class='hint'>Enable 2-Step Verification on Gmail, then create an App Password at myaccount.google.com &rsaquo; Security.</p>
    <p class='sec'>WhatsApp via Twilio <badge>Optional</badge></p>
    <label>Account SID</label>
    <input id='twSid' type='text' placeholder='ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'>
    <label>Auth Token</label>
    <input id='twToken' type='password' placeholder='Twilio auth token'>
    <label>WhatsApp Sender Number</label>
    <input id='twSender' type='tel' placeholder='+14155238886'>
    <p class='hint'>Your Twilio-approved WhatsApp-enabled number (the FROM number).</p>
    <div id='m2' class='msg'></div>
    <div class='btns'>
      <button class='btn-back' onclick='gs(1)'>&larr;</button>
      <button class='btn-next' onclick='gs(3)'>Next &rarr;</button>
    </div>
    <a class='skip' onclick='gs(3)'>Skip &ndash; configure later in Admin Settings</a>
  </div>

  <!-- Step 3 -->
  <div id='s3' style='display:none'>
    <p class='sec'>PayFast <badge>Optional</badge></p>
    <div class='row'>
      <div><label>Merchant ID</label><input id='pfId' type='text' placeholder='10000100'></div>
      <div><label>Mode</label>
        <select id='pfMode' style='margin-top:.9rem'>
          <option value='sandbox'>Sandbox (testing)</option>
          <option value='live'>Live</option>
        </select>
      </div>
    </div>
    <label>Merchant Key</label><input id='pfKey' type='text' placeholder='46f0cd694581a'>
    <label>Passphrase</label><input id='pfPhrase' type='password' placeholder='PayFast passphrase'>
    <p class='sec'>Stripe <badge>Optional</badge></p>
    <label>Secret Key (sk_...)</label><input id='skSecret' type='password' placeholder='sk_test_...'>
    <label>Publishable Key (pk_...)</label><input id='skPub' type='text' placeholder='pk_test_...'>
    <label>Webhook Secret (whsec_...)</label><input id='skWh' type='password' placeholder='whsec_...'>
    <p class='sec'>Frontend URL</p>
    <input id='fUrl' type='url' value='http://localhost:8081' placeholder='http://localhost:8081'>
    <p class='hint'>Used in email links and CORS. Update to your public URL when you deploy.</p>
    <div id='m3' class='msg'></div>
    <div class='btns'>
      <button class='btn-back' onclick='gs(2)'>&larr;</button>
      <button class='btn-go' id='btnGo' onclick='doSubmit()'>&check; Complete Setup</button>
    </div>
    <a class='skip' onclick='doSubmit()'>Skip payments &ndash; configure later in Admin Settings</a>
  </div>

  <!-- Done -->
  <div id='sDone' style='display:none;text-align:center;padding:1rem 0'>
    <div style='font-size:3.5rem;margin:1rem 0'>&#x1F389;</div>
    <p style='color:#4ade80;font-size:1.2rem;font-weight:700;'>Setup Complete!</p>
    <p style='color:#94a3b8;margin-top:.6rem;font-size:.9rem;'>Your admin account is ready. Redirecting to login&hellip;</p>
  </div>
</div>
<script>
const TITLES=['','Step 1 of 3 \u2013 Admin Account','Step 2 of 3 \u2013 Communications','Step 3 of 3 \u2013 Payments'];
function gs(n){
  [1,2,3].forEach(i=>{
    document.getElementById('s'+i).style.display='none';
    const d=document.getElementById('d'+i);
    d.className='step-dot'+(i<n?' done':i===n?' active':'');
    if(i<3) document.getElementById('l'+i).className='step-line'+(i<n?' done':'');
  });
  document.getElementById('s'+n).style.display='block';
  document.getElementById('stepTitle').textContent=TITLES[n];
}
function v(id){return document.getElementById(id).value.trim();}
function msg(id,t,ok){
  const el=document.getElementById(id);
  el.textContent=t;el.className='msg '+(ok?'msg-ok':'msg-err');el.style.display='block';
}
function clr(id){document.getElementById(id).style.display='none';}
function s1Next(){
  clr('m1');
  if(!v('firstName')||!v('lastName')) return msg('m1','First and last name are required.');
  if(!v('email')||!v('email').includes('@')) return msg('m1','A valid email address is required.');
  if(!v('phone').startsWith('+')||v('phone').length<11) return msg('m1','Phone must be in international format e.g. +27611234567.');
  if(v('idNumber').length!==13||isNaN(Number(v('idNumber')))) return msg('m1','SA ID number must be exactly 13 digits.');
  const pw=v('pass1');
  if(pw.length<12) return msg('m1','Password must be at least 12 characters.');
  if(!/[A-Z]/.test(pw)||!/[a-z]/.test(pw)||!/[0-9]/.test(pw)||!/[^A-Za-z0-9]/.test(pw))
    return msg('m1','Password must include uppercase, lowercase, a digit, and a special character.');
  if(pw!==v('pass2')) return msg('m1','Passwords do not match.');
  gs(2);
}
async function doSubmit(){
  clr('m3');
  const btn=document.getElementById('btnGo');
  btn.disabled=true;btn.textContent='Creating account\u2026';
  const adminBody={
    email:v('email'),phone:v('phone'),password:v('pass1'),
    first_name:v('firstName'),last_name:v('lastName'),id_number:v('idNumber'),
    smtp_email:v('smtpEmail')||null,smtp_password:v('smtpPass')||null,
    twilio_account_sid:v('twSid')||null,twilio_auth_token:v('twToken')||null,
    twilio_sender_phone_number:v('twSender')||null,
  };
  try{
    const r1=await fetch('/setup/create-initial-admin',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(adminBody)});
    const d1=await r1.json();
    if(!r1.ok){btn.disabled=false;btn.textContent='\u2713 Complete Setup';
      return msg('m3',d1.detail||'Failed to create admin account.');}
    btn.textContent='Saving service config\u2026';
    const svcBody={
      payfast_merchant_id:v('pfId'),payfast_merchant_key:v('pfKey'),
      payfast_passphrase:v('pfPhrase'),payfast_mode:v('pfMode'),
      stripe_secret_key:v('skSecret'),stripe_publishable_key:v('skPub'),
      stripe_webhook_secret:v('skWh'),frontend_url:v('fUrl')||'http://localhost:8081',
    };
    await fetch('/setup/save-services',{method:'POST',
      headers:{'Content-Type':'application/json'},body:JSON.stringify(svcBody)});
    // Show success
    document.getElementById('s3').style.display='none';
    document.getElementById('sDone').style.display='block';
    document.getElementById('pgBar').style.display='none';
    document.querySelector('.step-labels').style.display='none';
    document.getElementById('stepTitle').textContent='Setup Complete';
    setTimeout(()=>{window.location.href='/';},2500);
  }catch(e){
    btn.disabled=false;btn.textContent='\u2713 Complete Setup';
    msg('m3','Network error: '+e);
  }
}
</script></body></html>"""
)


@router.get("/wizard", response_class=HTMLResponse)
def setup_wizard_html(db: Session = Depends(get_db)):
    """First-run HTML wizard: admin account, communications, and payment setup."""
    admin_exists = db.query(User).filter(User.role == UserRole.ADMIN).first()
    if admin_exists:
        return RedirectResponse(url="/")
    return HTMLResponse(content=_WIZARD_HTML)


@router.get("/admin-contact")
def get_admin_contact(db: Session = Depends(get_db)):
    """
    Return public contact details for the first admin.
    Used by the frontend to show admin contact info when an instructor's
    account is pending verification.
    """
    admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="System not yet initialised.",
        )
    return {
        "name": f"{admin.first_name or ''} {admin.last_name or ''}".strip() or "Administrator",
        "email": admin.email,
        "phone": admin.phone,
    }
