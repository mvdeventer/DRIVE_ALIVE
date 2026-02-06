# DRIVE_ALIVE - Comprehensive Implementation Plan
## Security, Performance, and Production Readiness Roadmap

**Document Version**: 1.0
**Created**: February 5, 2026
**Priority System**: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

---

## Table of Contents
1. [Phase 1: Critical Security Lockdown (Week 1)](#phase-1-critical-security-lockdown-week-1)
2. [Phase 2: Infrastructure & Performance (Weeks 2-4)](#phase-2-infrastructure--performance-weeks-2-4)
3. [Phase 3: Production Readiness (Months 2-3)](#phase-3-production-readiness-months-2-3)
4. [Phase 4: Long-Term Enhancements (Ongoing)](#phase-4-long-term-enhancements-ongoing)

---

# Phase 1: Critical Security Lockdown (Week 1)

**Total Estimated Effort**: 40-60 hours
**Priority**: 🔴 CRITICAL - Must complete before any production deployment

---

## Task 1.1: Remove Hardcoded Credentials 🔴

### Background
`frontend/config.ts` contains real email addresses and passwords in DEBUG_CONFIG that could be exposed via git history.

### Implementation Steps

**Step 1**: Remove credentials from config.ts
```typescript
// frontend/config.ts - BEFORE
export const DEBUG_CONFIG = {
  ENABLED: true,
  DEFAULT_EMAIL: 'mvdeventer123@gmail.com', // ❌ REMOVE
  DEFAULT_PHONE: '+27611154598',            // ❌ REMOVE
  DEFAULT_PASSWORD: 'Test1234',             // ❌ REMOVE
};

// frontend/config.ts - AFTER
export const DEBUG_CONFIG = {
  ENABLED: process.env.NODE_ENV === 'development', // ✅ Tied to environment
  DEFAULT_EMAIL: '',
  DEFAULT_PHONE: '',
  DEFAULT_PASSWORD: '',
};
```

**Step 2**: Create environment variable system
```bash
# Create frontend/.env.example
cat > frontend/.env.example << 'EOF'
# Development Only - DO NOT commit .env with real values
EXPO_PUBLIC_DEBUG_MODE=false
EXPO_PUBLIC_DEBUG_EMAIL=
EXPO_PUBLIC_DEBUG_PHONE=
EXPO_PUBLIC_DEBUG_PASSWORD=
EOF
```

**Step 3**: Update .gitignore
```bash
# Add to .gitignore root
echo "frontend/.env" >> .gitignore
echo "frontend/.env.local" >> .gitignore
```

**Step 4**: Audit git history
```bash
# Check if credentials were ever committed
git log --all --full-history -- frontend/config.ts

# If found, clean history (DANGEROUS - coordinate with team)
# Option 1: BFG Repo Cleaner (recommended)
# Download from https://rtyley.github.io/bfg-repo-cleaner/
java -jar bfg.jar --replace-text passwords.txt

# Option 2: git filter-branch (slower but built-in)
git filter-branch --tree-filter "sed -i 's/mvdeventer123@gmail.com/REDACTED/g' frontend/config.ts" HEAD
```

**Testing**:
- ✅ Search codebase for any remaining hardcoded credentials: `grep -r "mvdeventer123" .`
- ✅ Verify DEBUG_CONFIG.ENABLED = false in production build
- ✅ Test app still works with empty debug config

**Rollback Plan**: Git revert if issues occur

**Success Criteria**: No credentials in codebase, debug mode disabled in production

**Estimated Time**: 4 hours

---

## Task 1.2: Secure .env Files & Rotate Secrets 🔴

### Background
.env files may contain production secrets and could be in git history.

### Implementation Steps

**Step 1**: Check if .env files are tracked
```bash
# Check git tracking
git ls-files | grep "\.env$"

# If any results, they're tracked (BAD)
git rm --cached .env
git rm --cached backend/.env
git commit -m "Remove .env files from tracking"
```

**Step 2**: Verify .gitignore coverage
```bash
# Check .gitignore
cat .gitignore | grep -E "\.env$|\.env\.local"

# If not present, add:
cat >> .gitignore << 'EOF'
# Environment variables
.env
.env.local
.env.*.local
backend/.env
backend/.env.local
frontend/.env
frontend/.env.local
**/.env
EOF
```

**Step 3**: Rotate ALL secrets (assume compromise)

**3a. Backend JWT Secret**
```bash
# Generate new secure secret (32+ bytes)
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Update backend/.env
# OLD: SECRET_KEY=your-secret-key-here
# NEW: SECRET_KEY=<generated-token>
```

**3b. Stripe API Keys**
```bash
# Login to Stripe Dashboard → Developers → API Keys → "Roll" secret key
# Update backend/.env with new key
```

**3c. Twilio Auth Token**
```bash
# Login to Twilio Console → Account → "View" → "Reset Auth Token"
# Update backend/.env
```

**3d. SMTP Password**
```bash
# Generate new Gmail App Password:
# 1. Google Account → Security → 2-Step Verification → App Passwords
# 2. Generate new password
# 3. Update in Admin Settings screen (or directly in database)
```

**Step 4**: Clean git history
```bash
# Create passwords.txt with patterns to remove
cat > passwords.txt << 'EOF'
SECRET_KEY==>SECRET_KEY=REDACTED
sk_test_*==>sk_test_REDACTED
TWILIO_AUTH_TOKEN==>TWILIO_AUTH_TOKEN=REDACTED
EOF

# Use BFG to clean
java -jar bfg.jar --replace-text passwords.txt
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

**Step 5**: Force push (coordinate with team)
```bash
# WARNING: Everyone needs to re-clone after this
git push --force --all
git push --force --tags
```

**Step 6**: Add pre-commit hook
```bash
# Create .git/hooks/pre-commit
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Prevent committing .env files

if git diff --cached --name-only | grep -E "\.env$|\.env\.local"; then
  echo "❌ ERROR: Attempting to commit .env file!"
  echo "Remove .env from staging: git reset HEAD .env"
  exit 1
fi

# Prevent committing secrets
if git diff --cached -U0 | grep -E "SECRET_KEY=|sk_(test|live)_|TWILIO_AUTH_TOKEN="; then
  echo "❌ ERROR: Attempting to commit secrets!"
  exit 1
fi

exit 0
EOF

chmod +x .git/hooks/pre-commit
```

**Testing**:
- ✅ Try committing .env file (should fail)
- ✅ Search git history: `git log --all -S "SECRET_KEY" --source --all`
- ✅ Verify app works with new secrets
- ✅ Test Stripe webhook with new secret
- ✅ Test Twilio SMS with new token

**Success Criteria**: No secrets in git history, all rotated secrets working

**Estimated Time**: 8 hours (including coordination)

---

## Task 1.3: Switch to HTTP-Only Cookies for Web Auth 🔴

### Background
sessionStorage is vulnerable to XSS attacks. Production apps should use HTTP-only cookies for tokens.

### Implementation Steps

**Step 1**: Backend - Add cookie support
```python
# backend/app/routes/auth.py

from fastapi import Response
from fastapi.responses import JSONResponse

@router.post("/login")
async def login(
    response: Response,
    credentials: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    # ... existing authentication logic ...

    # Get access token
    access_token = create_access_token(data={"sub": user_email})

    # Set HTTP-only cookie (web only)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,      # ✅ Not accessible via JavaScript
        secure=True,        # ✅ HTTPS only
        samesite="lax",     # ✅ CSRF protection
        max_age=1800,       # 30 minutes
        path="/",
        domain=None         # Current domain only
    )

    # Also return in response (for mobile)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_role": user.role.value,
        "user_id": user.id
    }

@router.post("/logout")
async def logout(response: Response):
    # Clear cookie
    response.delete_cookie(
        key="access_token",
        path="/",
        domain=None
    )
    return {"message": "Logged out successfully"}
```

**Step 2**: Backend - Read token from cookie OR header
```python
# backend/app/utils/auth.py

from fastapi import HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer(auto_error=False)

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
):
    token = None

    # Try Authorization header first (mobile)
    if credentials:
        token = credentials.credentials

    # Fallback to cookie (web)
    if not token:
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    # Validate token
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_email: str = payload.get("sub")
        if user_email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Get user from database
    user = db.query(User).filter(User.email == user_email).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    return user
```

**Step 3**: Frontend - Update API service
```typescript
// frontend/services/api/index.ts

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

// Storage adapter
const storage = {
  async setItem(key: string, value: string) {
    if (isWeb) {
      // On web, rely on HTTP-only cookies set by server
      // Only store non-sensitive metadata
      localStorage.setItem(`${key}_meta`, JSON.stringify({
        timestamp: Date.now(),
        role: value.split(':')[1] // Only role, not token
      }));
    } else {
      // Mobile: use SecureStore
      await SecureStore.setItemAsync(key, value);
    }
  },

  async getItem(key: string) {
    if (isWeb) {
      // Token is in HTTP-only cookie, just check if logged in
      const meta = localStorage.getItem(`${key}_meta`);
      return meta ? 'cookie-auth' : null;
    } else {
      return await SecureStore.getItemAsync(key);
    }
  },

  async removeItem(key: string) {
    if (isWeb) {
      localStorage.removeItem(`${key}_meta`);
      // Cookie will be cleared by server on logout
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  }
};

// API instance configuration
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  withCredentials: true, // ✅ Send cookies with requests
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    if (isWeb) {
      // On web, cookie is automatically sent
      // No need to add Authorization header
    } else {
      // Mobile: add Authorization header
      const token = await storage.getItem('access_token');
      if (token && token !== 'cookie-auth') {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Login function
export const login = async (email: string, password: string, phone?: string) => {
  const formData = new FormData();
  formData.append('username', phone || email);
  formData.append('password', password);

  const response = await api.post('/auth/login', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  const { access_token, user_role, user_id } = response.data;

  // Store token (mobile only, web uses cookie)
  if (!isWeb) {
    await storage.setItem('access_token', access_token);
  }

  // Store metadata (both platforms)
  await storage.setItem('user_role', user_role);
  await storage.setItem('user_id', String(user_id));

  return response.data;
};

// Logout function
export const logout = async () => {
  try {
    // Call logout endpoint to clear cookie
    await api.post('/auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear local storage
    await storage.removeItem('access_token');
    await storage.removeItem('user_role');
    await storage.removeItem('user_id');
  }
};
```

**Step 4**: Update CORS configuration
```python
# backend/app/main.py

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,  # ✅ Required for cookies
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Testing**:
- ✅ Web: Login → Check browser DevTools → Application → Cookies → Verify `access_token` with HttpOnly flag
- ✅ Web: Try accessing token via JavaScript in console (should fail)
- ✅ Mobile: Login → Verify token in SecureStore
- ✅ API calls work on both platforms
- ✅ Logout clears cookies on web

**Success Criteria**: Web uses HTTP-only cookies, mobile uses SecureStore, XSS cannot steal tokens

**Estimated Time**: 12 hours

---

## Task 1.4: Add Rate Limiting to Auth Endpoints 🔴

### Background
No rate limiting allows brute force attacks on login/registration endpoints.

### Implementation Steps

**Step 1**: Install SlowAPI
```bash
cd backend
pip install slowapi redis
pip freeze > requirements.txt
```

**Step 2**: Configure Redis (for distributed rate limiting)
```python
# backend/app/config.py

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # ... existing settings ...

    # Rate Limiting
    REDIS_URL: str = "redis://localhost:6379/0"
    RATE_LIMIT_ENABLED: bool = True

    class Config:
        env_file = ".env"
```

**Step 3**: Create rate limiter
```python
# backend/app/utils/rate_limiter.py

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request, Response
from fastapi.responses import JSONResponse
import redis
from ..config import settings

# Redis connection
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

# Create limiter
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=settings.REDIS_URL,
    enabled=settings.RATE_LIMIT_ENABLED,
    headers_enabled=True,  # Add X-RateLimit-* headers
)

# Custom rate limit exceeded handler
def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> Response:
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Too many requests. Please try again later.",
            "retry_after": exc.detail.split("Retry after ")[1] if "Retry after" in exc.detail else "60 seconds"
        },
        headers={
            "Retry-After": "60"
        }
    )
```

**Step 4**: Apply to main app
```python
# backend/app/main.py

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from .utils.rate_limiter import limiter, rate_limit_exceeded_handler

app = FastAPI(title="Drive Alive API")

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
```

**Step 5**: Apply to auth endpoints
```python
# backend/app/routes/auth.py

from ..utils.rate_limiter import limiter

# Login - 5 attempts per minute per IP
@router.post("/login")
@limiter.limit("5/minute")
async def login(
    request: Request,  # Required for rate limiter
    response: Response,
    credentials: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    # ... existing logic ...

# Registration - 3 per hour per IP
@router.post("/register/student")
@limiter.limit("3/hour")
async def register_student(
    request: Request,
    student_data: StudentRegistration,
    db: Session = Depends(get_db)
):
    # ... existing logic ...

@router.post("/register/instructor")
@limiter.limit("3/hour")
async def register_instructor(
    request: Request,
    instructor_data: InstructorRegistration,
    db: Session = Depends(get_db)
):
    # ... existing logic ...

# Password reset request - 3 per hour per IP
@router.post("/forgot-password")
@limiter.limit("3/hour")
async def forgot_password(
    request: Request,
    email: str,
    db: Session = Depends(get_db)
):
    # ... existing logic ...

# Password reset confirmation - 5 per hour
@router.post("/reset-password")
@limiter.limit("5/hour")
async def reset_password(
    request: Request,
    reset_data: PasswordResetRequest,
    db: Session = Depends(get_db)
):
    # ... existing logic ...

# Email verification - 10 per hour
@router.post("/verify/account")
@limiter.limit("10/hour")
async def verify_account(
    request: Request,
    token: str,
    db: Session = Depends(get_db)
):
    # ... existing logic ...
```

**Step 6**: Additional endpoints to protect
```python
# Backend - other critical endpoints

# Admin user creation - 5 per day per admin
@router.post("/admin/create")
@limiter.limit("5/day")
async def create_admin(
    request: Request,
    admin_data: AdminCreateRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    # ... existing logic ...

# Booking creation - 20 per hour per user
@router.post("/bookings")
@limiter.limit("20/hour")
async def create_booking(
    request: Request,
    booking_data: BookingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # ... existing logic ...
```

**Step 7**: Update docker-compose for Redis
```yaml
# docker-compose.yml - Redis service already exists (lines 23-34)
# Verify it's configured correctly:

redis:
  image: redis:7-alpine
  container_name: drive_alive_redis
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
  command: redis-server --appendonly yes
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 3s
    retries: 3

volumes:
  redis_data:
```

**Step 8**: Update .env
```bash
# backend/.env
REDIS_URL=redis://localhost:6379/0
RATE_LIMIT_ENABLED=true
```

**Testing**:
```bash
# Test login rate limit
for i in {1..10}; do
  curl -X POST http://localhost:8000/auth/login \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=test@example.com&password=wrong"
done

# Should succeed 5 times, then return 429 Too Many Requests
```

- ✅ After 5 failed logins, next attempt returns 429
- ✅ Rate limit resets after 1 minute
- ✅ Different IPs have separate limits
- ✅ Response includes `Retry-After` header
- ✅ Mobile app displays "Too many attempts" message

**Success Criteria**:
- Auth endpoints return 429 after rate limit exceeded
- Redis stores rate limit counters
- Limits reset correctly
- Production-ready configuration

**Estimated Time**: 8 hours

---

## Task 1.5: Encrypt SMTP Passwords in Database 🔴

### Background
Gmail app passwords stored in plain text in `users.smtp_password` column.

### Implementation Steps

**Step 1**: Install cryptography library
```bash
cd backend
pip install cryptography
pip freeze > requirements.txt
```

**Step 2**: Create encryption utility
```python
# backend/app/utils/encryption.py

from cryptography.fernet import Fernet
from ..config import settings
import base64
import hashlib

class EncryptionService:
    """Encrypt/decrypt sensitive data at rest"""

    def __init__(self):
        # Derive encryption key from SECRET_KEY
        # In production, use dedicated ENCRYPTION_KEY
        key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
        self.fernet = Fernet(base64.urlsafe_b64encode(key))

    def encrypt(self, plain_text: str) -> str:
        """Encrypt string and return base64 encoded ciphertext"""
        if not plain_text:
            return ""

        encrypted = self.fernet.encrypt(plain_text.encode())
        return encrypted.decode('utf-8')

    def decrypt(self, cipher_text: str) -> str:
        """Decrypt base64 encoded ciphertext"""
        if not cipher_text:
            return ""

        try:
            decrypted = self.fernet.decrypt(cipher_text.encode())
            return decrypted.decode('utf-8')
        except Exception as e:
            raise ValueError(f"Decryption failed: {str(e)}")

# Singleton instance
encryption_service = EncryptionService()
```

**Step 3**: Create migration to encrypt existing passwords
```python
# backend/migrations/encrypt_smtp_passwords.py

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, Column, Integer, String, select
from sqlalchemy.orm import sessionmaker, Session
from app.database import Base
from app.models.user import User
from app.utils.encryption import encryption_service
from app.config import settings

def encrypt_existing_passwords():
    """One-time migration to encrypt plain text SMTP passwords"""

    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        # Get all users with SMTP passwords
        users = db.query(User).filter(User.smtp_password != None).all()

        encrypted_count = 0

        for user in users:
            if user.smtp_password:
                # Check if already encrypted (contains Fernet prefix)
                if not user.smtp_password.startswith('gAAAAA'):
                    # Encrypt the password
                    user.smtp_password = encryption_service.encrypt(user.smtp_password)
                    encrypted_count += 1
                    print(f"✅ Encrypted SMTP password for user {user.email}")

        db.commit()
        print(f"\n✅ Migration complete: {encrypted_count} passwords encrypted")

    except Exception as e:
        db.rollback()
        print(f"❌ Migration failed: {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("🔐 Starting SMTP password encryption migration...")
    encrypt_existing_passwords()
```

**Step 4**: Update User model with property methods
```python
# backend/app/models/user.py

from sqlalchemy import Column, String
from sqlalchemy.ext.hybrid import hybrid_property

class User(Base):
    __tablename__ = "users"

    # ... existing columns ...

    # Store encrypted password
    _smtp_password = Column("smtp_password", String, nullable=True)

    @hybrid_property
    def smtp_password(self) -> str:
        """Decrypt password when reading"""
        if not self._smtp_password:
            return None

        from ..utils.encryption import encryption_service
        try:
            return encryption_service.decrypt(self._smtp_password)
        except:
            # If decryption fails, assume it's plain text (for migration)
            return self._smtp_password

    @smtp_password.setter
    def smtp_password(self, plain_password: str):
        """Encrypt password when writing"""
        if not plain_password:
            self._smtp_password = None
            return

        from ..utils.encryption import encryption_service
        self._smtp_password = encryption_service.encrypt(plain_password)
```

**Step 5**: Run migration
```bash
cd backend
python migrations/encrypt_smtp_passwords.py
```

**Step 6**: Update email service to use decrypted password
```python
# backend/app/services/email_service.py

from ..utils.encryption import encryption_service

class EmailService:
    @staticmethod
    def send_verification_email(
        to_email: str,
        verification_link: str,
        user_name: str,
        smtp_email: str,
        smtp_password: str  # Receives decrypted password from model
    ) -> bool:
        try:
            # Create SMTP connection with decrypted password
            server = smtplib.SMTP('smtp.gmail.com', 587)
            server.starttls()
            server.login(smtp_email, smtp_password)  # Use as-is

            # ... rest of email sending logic ...

        except Exception as e:
            logger.error(f"Email send failed: {str(e)}")
            return False
```

**Step 7**: Add configuration for dedicated encryption key (production)
```python
# backend/app/config.py

class Settings(BaseSettings):
    # ... existing settings ...

    # Encryption (use dedicated key in production)
    ENCRYPTION_KEY: Optional[str] = None  # If set, use instead of deriving from SECRET_KEY

    class Config:
        env_file = ".env"
```

**Step 8**: Update encryption service to use dedicated key if available
```python
# backend/app/utils/encryption.py

def __init__(self):
    if settings.ENCRYPTION_KEY:
        # Use dedicated encryption key (production)
        key = base64.urlsafe_b64decode(settings.ENCRYPTION_KEY)
    else:
        # Derive from SECRET_KEY (development)
        key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()

    self.fernet = Fernet(base64.urlsafe_b64encode(key))
```

**Testing**:
```python
# Test encryption/decryption
from app.utils.encryption import encryption_service

# Test encryption
plain = "mypassword123"
encrypted = encryption_service.encrypt(plain)
print(f"Encrypted: {encrypted}")

# Test decryption
decrypted = encryption_service.decrypt(encrypted)
assert decrypted == plain
print("✅ Encryption test passed")

# Test with User model
user = User(email="test@example.com")
user.smtp_password = "mypassword123"
db.add(user)
db.commit()

# Retrieve and verify
db.refresh(user)
assert user.smtp_password == "mypassword123"
print("✅ User model encryption test passed")
```

- ✅ Existing passwords encrypted successfully
- ✅ New passwords auto-encrypted on save
- ✅ Decryption works transparently
- ✅ Email sending still works
- ✅ Test email functionality from Admin Settings

**Success Criteria**: All SMTP passwords encrypted at rest, transparent decryption, emails still send

**Estimated Time**: 6 hours

---

## Task 1.6: Add Security Headers Middleware 🔴

### Background
Missing critical security headers leaves app vulnerable to XSS, clickjacking, and other attacks.

### Implementation Steps

**Step 1**: Create security middleware
```python
# backend/app/middleware/security.py

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from typing import Callable
from ..config import settings

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        # Prevent MIME sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # XSS protection (legacy, but doesn't hurt)
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Referrer policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Content Security Policy
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' https://api.stripe.com https://api.openstreetmap.org; "
            "frame-src https://js.stripe.com https://hooks.stripe.com; "
        )
        response.headers["Content-Security-Policy"] = csp

        # HSTS (only in production with HTTPS)
        if settings.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        # Permissions Policy (Feature Policy)
        response.headers["Permissions-Policy"] = (
            "geolocation=(self), "
            "camera=(), "
            "microphone=(), "
            "payment=(self)"
        )

        return response
```

**Step 2**: Apply middleware to app
```python
# backend/app/main.py

from .middleware.security import SecurityHeadersMiddleware

app = FastAPI(title="Drive Alive API")

# Add security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# ... rest of middleware ...
```

**Step 3**: Add HTTPS redirect middleware (production only)
```python
# backend/app/middleware/security.py

from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware

# In main.py
if settings.ENVIRONMENT == "production":
    app.add_middleware(HTTPSRedirectMiddleware)
```

**Step 4**: Add trusted host middleware
```python
# backend/app/config.py

class Settings(BaseSettings):
    # ... existing settings ...

    ALLOWED_HOSTS: list[str] = ["localhost", "127.0.0.1", "drivealive.co.za"]

    @property
    def allowed_hosts_list(self) -> list[str]:
        """Parse allowed hosts from environment variable"""
        hosts = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
        return [host.strip() for host in hosts]

# backend/app/main.py

from starlette.middleware.trustedhost import TrustedHostMiddleware

if settings.ENVIRONMENT == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.allowed_hosts_list
    )
```

**Step 5**: Update .env
```bash
# backend/.env

ENVIRONMENT=development  # or production
ALLOWED_HOSTS=localhost,127.0.0.1,drivealive.co.za
```

**Testing**:
```bash
# Test security headers
curl -I http://localhost:8000/health

# Should see headers:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Content-Security-Policy: ...
# X-XSS-Protection: 1; mode=block
```

**Browser Testing**:
- ✅ Open DevTools → Network → Check response headers
- ✅ Verify CSP doesn't block legitimate resources
- ✅ Test that iframe embedding is blocked (X-Frame-Options)
- ✅ Run security scan: https://securityheaders.com

**Success Criteria**: All security headers present, A+ rating on securityheaders.com

**Estimated Time**: 4 hours

---

## Phase 1 Summary Checklist

After completing all Week 1 tasks:

- [ ] 1.1: Hardcoded credentials removed from config.ts
- [ ] 1.2: .env files removed from git, all secrets rotated
- [ ] 1.3: HTTP-only cookies implemented for web auth
- [ ] 1.4: Rate limiting active on auth endpoints
- [ ] 1.5: SMTP passwords encrypted in database
- [ ] 1.6: Security headers middleware active

**Validation Tests**:
```bash
# Run all tests
cd backend
pytest tests/

# Security scan
pip install bandit
bandit -r app/

# Check for secrets in git history
git log --all --full-history -- "**/.*env*"
```

**Total Phase 1 Effort**: 42 hours

---

# Phase 2: Infrastructure & Performance (Weeks 2-4)

**Total Estimated Effort**: 80-120 hours
**Priority**: 🟠 High - Critical for production stability

---

## Task 2.1: Implement Comprehensive Test Suite 🟠

### Background
`backend/tests/` directory is empty despite pytest in requirements.

### Implementation Steps

**Step 1**: Create test structure
```bash
mkdir -p backend/tests/{unit,integration,e2e}
mkdir -p backend/tests/unit/{services,utils,models}
mkdir -p backend/tests/integration/{routes,database}
```

**Step 2**: Create pytest configuration
```ini
# backend/pytest.ini

[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts =
    -v
    --strict-markers
    --tb=short
    --cov=app
    --cov-report=html
    --cov-report=term-missing
    --cov-fail-under=80
markers =
    unit: Unit tests
    integration: Integration tests
    e2e: End-to-end tests
    slow: Slow running tests
env =
    TESTING=1
    DATABASE_URL=sqlite:///./test.db
```

**Step 3**: Create test fixtures
```python
# backend/tests/conftest.py

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.models.user import User, UserRole
from app.utils.auth import get_password_hash

# Test database setup
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database for each test"""
    engine = create_engine(
        SQLALCHEMY_TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(bind=engine)
    db = TestingSessionLocal()

    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
    """FastAPI test client with test database"""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()

@pytest.fixture
def test_admin(db_session):
    """Create test admin user"""
    admin = User(
        email="admin@test.com",
        phone="+27123456789",
        password_hash=get_password_hash("Test1234"),
        role=UserRole.ADMIN,
        first_name="Admin",
        last_name="User",
        status="ACTIVE"
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    return admin

@pytest.fixture
def test_student(db_session):
    """Create test student user with profile"""
    from app.models.student import Student

    user = User(
        email="student@test.com",
        phone="+27987654321",
        password_hash=get_password_hash("Test1234"),
        role=UserRole.STUDENT,
        first_name="Test",
        last_name="Student",
        status="ACTIVE"
    )
    db_session.add(user)
    db_session.flush()

    student = Student(
        user_id=user.id,
        id_number="9001014800083",
        city="Cape Town",
        suburb="Gardens",
        province="Western Cape"
    )
    db_session.add(student)
    db_session.commit()
    db_session.refresh(user)

    return user

@pytest.fixture
def auth_headers(client, test_admin):
    """Get authentication headers for admin"""
    response = client.post(
        "/auth/login",
        data={"username": "admin@test.com", "password": "Test1234"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
```

**Step 4**: Create unit tests for services
```python
# backend/tests/unit/services/test_auth.py

import pytest
from datetime import datetime, timedelta, timezone
from app.services.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    verify_token
)

class TestPasswordHashing:
    def test_password_hash_is_different_from_plain(self):
        """Hashed password should differ from plain text"""
        plain = "MyPassword123"
        hashed = get_password_hash(plain)
        assert hashed != plain
        assert len(hashed) > 20

    def test_verify_correct_password(self):
        """Correct password should verify successfully"""
        plain = "MyPassword123"
        hashed = get_password_hash(plain)
        assert verify_password(plain, hashed) is True

    def test_verify_wrong_password(self):
        """Wrong password should fail verification"""
        plain = "MyPassword123"
        wrong = "WrongPassword"
        hashed = get_password_hash(plain)
        assert verify_password(wrong, hashed) is False

class TestJWTTokens:
    def test_create_access_token(self):
        """Token creation should work"""
        data = {"sub": "test@example.com"}
        token = create_access_token(data)
        assert isinstance(token, str)
        assert len(token) > 20

    def test_verify_valid_token(self):
        """Valid token should verify successfully"""
        email = "test@example.com"
        token = create_access_token({"sub": email})
        payload = verify_token(token)
        assert payload["sub"] == email

    def test_verify_expired_token(self):
        """Expired token should raise exception"""
        data = {"sub": "test@example.com"}
        # Create already-expired token
        expired_token = create_access_token(data, expires_delta=timedelta(seconds=-1))

        with pytest.raises(Exception):
            verify_token(expired_token)

    def test_verify_invalid_token(self):
        """Invalid token should raise exception"""
        with pytest.raises(Exception):
            verify_token("invalid.token.here")
```

**Step 5**: Create integration tests for auth routes
```python
# backend/tests/integration/routes/test_auth.py

import pytest
from fastapi import status

class TestRegistration:
    def test_register_student_success(self, client, db_session):
        """Student registration should create user and profile"""
        data = {
            "email": "newstudent@test.com",
            "phone": "+27111222333",
            "password": "SecurePass123",
            "confirmPassword": "SecurePass123",
            "first_name": "John",
            "last_name": "Doe",
            "id_number": "9001014800083",
            "city": "Cape Town",
            "suburb": "Gardens",
            "province": "Western Cape",
            "pickup_address": "123 Main St"
        }

        response = client.post("/auth/register/student", json=data)

        assert response.status_code == status.HTTP_200_OK
        assert "user_id" in response.json()
        assert response.json()["role"] == "STUDENT"

    def test_register_duplicate_email(self, client, test_student):
        """Should reject duplicate email"""
        data = {
            "email": test_student.email,  # Duplicate
            "phone": "+27999888777",
            "password": "SecurePass123",
            # ... other fields
        }

        response = client.post("/auth/register/student", json=data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already registered" in response.json()["detail"].lower()

    def test_register_weak_password(self, client):
        """Should reject weak passwords"""
        data = {
            "email": "test@example.com",
            "password": "weak",  # Too short
            # ... other fields
        }

        response = client.post("/auth/register/student", json=data)

        # Should fail validation
        assert response.status_code in [400, 422]

class TestLogin:
    def test_login_success_with_email(self, client, test_student):
        """Login with email should work"""
        response = client.post(
            "/auth/login",
            data={"username": test_student.email, "password": "Test1234"}
        )

        assert response.status_code == status.HTTP_200_OK
        assert "access_token" in response.json()
        assert response.json()["token_type"] == "bearer"

    def test_login_wrong_password(self, client, test_student):
        """Wrong password should fail"""
        response = client.post(
            "/auth/login",
            data={"username": test_student.email, "password": "WrongPassword"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_nonexistent_user(self, client):
        """Non-existent user should fail"""
        response = client.post(
            "/auth/login",
            data={"username": "nonexistent@test.com", "password": "Test1234"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_inactive_user(self, client, db_session, test_student):
        """Inactive user should not be able to login"""
        test_student.status = "INACTIVE"
        db_session.commit()

        response = client.post(
            "/auth/login",
            data={"username": test_student.email, "password": "Test1234"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "not verified" in response.json()["detail"].lower()

class TestRateLimiting:
    @pytest.mark.slow
    def test_login_rate_limit(self, client):
        """Should rate limit after too many attempts"""
        # Make 6 requests (limit is 5/minute)
        for i in range(6):
            response = client.post(
                "/auth/login",
                data={"username": "test@test.com", "password": "wrong"}
            )

            if i < 5:
                assert response.status_code in [401, 200]
            else:
                # 6th request should be rate limited
                assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
```

**Step 6**: Create tests for booking logic
```python
# backend/tests/integration/routes/test_bookings.py

import pytest
from datetime import datetime, timedelta, timezone
from fastapi import status

class TestBookingCreation:
    def test_create_booking_success(self, client, auth_headers, test_student, test_instructor):
        """Creating a valid booking should work"""
        tomorrow = datetime.now(timezone.utc) + timedelta(days=1)

        data = {
            "instructor_id": test_instructor.id,
            "lesson_date": tomorrow.strftime("%Y-%m-%d"),
            "lesson_time": "10:00",
            "duration_minutes": 60,
            "pickup_address": "123 Main St",
            "pickup_latitude": -33.9249,
            "pickup_longitude": 18.4241
        }

        response = client.post("/bookings", json=data, headers=auth_headers)

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == "pending"

    def test_create_conflicting_booking(self, client, auth_headers, test_student, test_instructor, db_session):
        """Should reject overlapping bookings"""
        from app.models.booking import Booking

        # Create existing booking
        tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
        tomorrow_10am = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)

        existing = Booking(
            student_id=test_student.id,
            instructor_id=test_instructor.id,
            lesson_datetime=tomorrow_10am,
            duration_minutes=60,
            status="confirmed"
        )
        db_session.add(existing)
        db_session.commit()

        # Try to book same time
        data = {
            "instructor_id": test_instructor.id,
            "lesson_date": tomorrow.strftime("%Y-%m-%d"),
            "lesson_time": "10:30",  # Overlaps with 10:00-11:00
            "duration_minutes": 60
        }

        response = client.post("/bookings", json=data, headers=auth_headers)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "conflict" in response.json()["detail"].lower()
```

**Step 7**: Create coverage configuration
```ini
# backend/.coveragerc

[run]
source = app
omit =
    */tests/*
    */migrations/*
    */__pycache__/*
    */venv/*

[report]
exclude_lines =
    pragma: no cover
    def __repr__
    raise AssertionError
    raise NotImplementedError
    if __name__ == .__main__.:
    if TYPE_CHECKING:
```

**Step 8**: Add test requirements
```txt
# backend/requirements-dev.txt

pytest==7.4.3
pytest-cov==4.1.0
pytest-asyncio==0.21.1
pytest-env==1.1.3
httpx==0.25.2
faker==20.1.0
```

**Step 9**: Create GitHub Actions workflow
```yaml
# .github/workflows/tests.yml

name: Run Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test-backend:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3

    - name: Set up Python 3.11
      uses: actions/setup-python@v4
      with:
        python-version: 3.11

    - name: Install dependencies
      run: |
        cd backend
        pip install -r requirements.txt
        pip install -r requirements-dev.txt

    - name: Run tests with coverage
      env:
        DATABASE_URL: postgresql://postgres:test@localhost:5432/test_db
      run: |
        cd backend
        pytest --cov=app --cov-report=xml --cov-report=term

    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./backend/coverage.xml
        fail_ci_if_error: true
```

**Testing**:
```bash
# Run all tests
cd backend
pytest

# Run specific test file
pytest tests/unit/services/test_auth.py -v

# Run with coverage
pytest --cov=app --cov-report=html

# Open coverage report
open htmlcov/index.html
```

**Success Criteria**:
- 80%+ code coverage
- All critical paths tested
- Tests pass in CI/CD
- No flaky tests

**Estimated Time**: 40 hours

---

## Task 2.2: Fix N+1 Query Problems 🟠

### Background
Multiple database queries executed inside loops causing performance degradation.

### Implementation Steps

**Step 1**: Identify N+1 queries
```bash
# Enable SQL logging temporarily
# backend/app/database.py
engine = create_engine(
    settings.DATABASE_URL,
    echo=True  # ✅ Enables SQL query logging
)
```

**Step 2**: Fix bookings endpoint
```python
# backend/app/routes/bookings.py - BEFORE (lines 770-821)

@router.get("/")
async def get_all_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    bookings = db.query(Booking).all()  # Query 1

    result = []
    for booking in bookings:
        # N+1 PROBLEM: Query inside loop
        instructor = db.query(Instructor).filter(
            Instructor.id == booking.instructor_id
        ).first()  # Query 2, 3, 4... (N times)

        instructor_user = db.query(User).filter(
            User.id == instructor.user_id
        ).first()  # Query N+1, N+2... (N times)

        result.append({
            "id": booking.id,
            "instructor_name": f"{instructor_user.first_name} {instructor_user.last_name}",
            # ...
        })

    return result

# AFTER - Using eager loading

from sqlalchemy.orm import joinedload

@router.get("/")
async def get_all_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # ✅ Single query with joins
    bookings = (
        db.query(Booking)
        .options(
            joinedload(Booking.instructor).joinedload(Instructor.user),
            joinedload(Booking.student).joinedload(Student.user)
        )
        .all()
    )

    result = []
    for booking in bookings:
        # ✅ No additional queries - data already loaded
        result.append({
            "id": booking.id,
            "instructor_name": f"{booking.instructor.user.first_name} {booking.instructor.user.last_name}",
            "student_name": f"{booking.student.user.first_name} {booking.student.user.last_name}",
            # ...
        })

    return result
```

**Step 3**: Fix instructor listings with ratings
```python
# backend/app/routes/instructors.py - BEFORE

@router.get("/")
async def get_all_instructors(db: Session = Depends(get_db)):
    instructors = db.query(Instructor).filter(
        Instructor.verification_status == "verified"
    ).all()

    result = []
    for instructor in instructors:
        # N+1: User query
        user = db.query(User).filter(User.id == instructor.user_id).first()

        # N+1: Count reviews
        review_count = db.query(Review).filter(
            Review.instructor_id == instructor.id
        ).count()

        result.append({
            "id": instructor.id,
            "name": f"{user.first_name} {user.last_name}",
            "review_count": review_count,
            # ...
        })

    return result

# AFTER - Using eager loading and subqueries

from sqlalchemy import func
from sqlalchemy.orm import joinedload, contains_eager

@router.get("/")
async def get_all_instructors(db: Session = Depends(get_db)):
    # ✅ Single query with joins and aggregations
    instructors = (
        db.query(Instructor)
        .join(Instructor.user)
        .outerjoin(Instructor.reviews)
        .options(
            contains_eager(Instructor.user),
            joinedload(Instructor.reviews)
        )
        .filter(Instructor.verification_status == "verified")
        .group_by(Instructor.id, User.id)
        .all()
    )

    result = []
    for instructor in instructors:
        result.append({
            "id": instructor.id,
            "name": f"{instructor.user.first_name} {instructor.user.last_name}",
            "review_count": len(instructor.reviews),
            "average_rating": instructor.average_rating,
            # ...
        })

    return result
```

**Step 4**: Add relationships to models for eager loading
```python
# backend/app/models/booking.py

from sqlalchemy.orm import relationship

class Booking(Base):
    __tablename__ = "bookings"

    # ... existing columns ...

    # ✅ Add relationships for eager loading
    instructor = relationship("Instructor", back_populates="bookings")
    student = relationship("Student", back_populates="bookings")

# backend/app/models/instructor.py

class Instructor(Base):
    __tablename__ = "instructors"

    # ... existing columns ...

    # ✅ Add relationships
    user = relationship("User", back_populates="instructor_profile")
    bookings = relationship("Booking", back_populates="instructor")
    reviews = relationship("Review", back_populates="instructor")

# backend/app/models/student.py

class Student(Base):
    __tablename__ = "students"

    # ... existing columns ...

    # ✅ Add relationships
    user = relationship("User", back_populates="student_profile")
    bookings = relationship("Booking", back_populates="student")
    reviews = relationship("Review", back_populates="student")
```

**Step 5**: Create performance testing script
```python
# backend/tests/performance/test_query_performance.py

import pytest
import time
from sqlalchemy import event
from sqlalchemy.engine import Engine

@pytest.fixture
def query_counter():
    """Count SQL queries executed"""
    queries = []

    def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        queries.append(statement)

    event.listen(Engine, "before_cursor_execute", before_cursor_execute)

    yield queries

    event.remove(Engine, "before_cursor_execute", before_cursor_execute)

def test_bookings_endpoint_query_count(client, auth_headers, query_counter, db_session):
    """Bookings endpoint should use minimal queries"""
    # Create 10 test bookings
    # ... (create test data)

    query_counter.clear()

    response = client.get("/bookings", headers=auth_headers)

    assert response.status_code == 200

    # Should use only 1-2 queries regardless of number of bookings
    assert len(query_counter) <= 3, f"Too many queries: {len(query_counter)}"

def test_instructors_endpoint_performance(client, query_counter, db_session):
    """Instructors endpoint should be fast"""
    # Create 50 test instructors
    # ... (create test data)

    query_counter.clear()
    start_time = time.time()

    response = client.get("/instructors")

    end_time = time.time()

    assert response.status_code == 200
    assert len(query_counter) <= 3  # Maximum 3 queries
    assert (end_time - start_time) < 0.5  # Under 500ms
```

**Step 6**: Benchmark before/after
```python
# backend/scripts/benchmark_queries.py

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import time

def benchmark_old_approach():
    """Measure N+1 query performance"""
    # ... create session ...

    start = time.time()
    bookings = db.query(Booking).all()
    for booking in bookings:
        instructor = db.query(Instructor).filter(...).first()
        user = db.query(User).filter(...).first()
    end = time.time()

    print(f"Old approach: {end - start:.3f}s for {len(bookings)} bookings")

def benchmark_new_approach():
    """Measure eager loading performance"""
    start = time.time()
    bookings = db.query(Booking).options(
        joinedload(Booking.instructor).joinedload(Instructor.user)
    ).all()
    for booking in bookings:
        name = booking.instructor.user.first_name
    end = time.time()

    print(f"New approach: {end - start:.3f}s for {len(bookings)} bookings")

if __name__ == "__main__":
    benchmark_old_approach()
    benchmark_new_approach()
```

**Testing**:
```bash
# Run with SQL logging
DATABASE_URL=sqlite:///./test.db python -c "from app.routes.bookings import get_all_bookings; ..."

# Count queries (should be 1-3 max)
# Before: 1 + 2N queries (N bookings)
# After: 1-2 queries total
```

**Success Criteria**:
- Maximum 3 queries per endpoint regardless of data size
- 10x+ performance improvement on large datasets
- All tests passing

**Estimated Time**: 16 hours

---

## Task 2.3: Configure Database Connection Pool 🟠

### Background
No connection pool limits configured, risking connection exhaustion.

### Implementation Steps

**Step 1**: Update database configuration
```python
# backend/app/database.py

from sqlalchemy import create_engine, event
from sqlalchemy.pool import QueuePool, NullPool
from .config import settings
import logging

logger = logging.getLogger(__name__)

# Connection pool configuration
if settings.ENVIRONMENT == "production":
    # Production: PostgreSQL with connection pooling
    engine = create_engine(
        settings.DATABASE_URL,
        poolclass=QueuePool,
        pool_size=20,              # ✅ Max persistent connections
        max_overflow=10,           # ✅ Max temporary connections
        pool_timeout=30,           # ✅ Wait 30s for connection
        pool_recycle=3600,         # ✅ Recycle connections after 1 hour
        pool_pre_ping=True,        # ✅ Test connections before use
        echo=settings.DEBUG,
        connect_args={
            "connect_timeout": 10  # PostgreSQL connection timeout
        }
    )
else:
    # Development: SQLite with no pooling
    engine = create_engine(
        settings.DATABASE_URL,
        poolclass=NullPool,        # ✅ No pooling for SQLite
        echo=settings.DEBUG,
        connect_args={
            "check_same_thread": False
        }
    )

# Connection event listeners
@event.listens_for(engine, "connect")
def receive_connect(dbapi_conn, connection_record):
    """Log when new database connection is created"""
    logger.info("New database connection established")

@event.listens_for(engine, "checkout")
def receive_checkout(dbapi_conn, connection_record, connection_proxy):
    """Log when connection is checked out from pool"""
    logger.debug("Connection checked out from pool")

@event.listens_for(engine, "checkin")
def receive_checkin(dbapi_conn, connection_record):
    """Log when connection is returned to pool"""
    logger.debug("Connection returned to pool")

# Pool health monitoring
def get_pool_status():
    """Get current connection pool status"""
    pool = engine.pool
    return {
        "size": pool.size(),
        "checked_in": pool.checkedin(),
        "checked_out": pool.checkedout(),
        "overflow": pool.overflow(),
        "max_overflow": pool.max_overflow if hasattr(pool, 'max_overflow') else None
    }
```

**Step 2**: Add pool monitoring endpoint
```python
# backend/app/routes/admin.py

@router.get("/system/database-pool")
async def get_database_pool_status(
    current_user: User = Depends(require_admin)
):
    """Get database connection pool metrics"""
    from ..database import get_pool_status

    status = get_pool_status()

    # Check for potential issues
    warnings = []
    if status["checked_out"] > (status["size"] * 0.8):
        warnings.append("High connection usage (>80%)")

    if status["overflow"] > 0:
        warnings.append(f"Overflow connections in use: {status['overflow']}")

    return {
        "pool_status": status,
        "warnings": warnings,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
```

**Step 3**: Update settings
```python
# backend/app/config.py

class Settings(BaseSettings):
    # ... existing settings ...

    # Database Connection Pool
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 3600

    class Config:
        env_file = ".env"
```

**Step 4**: Create connection pool test
```python
# backend/tests/integration/test_database_pool.py

import pytest
from concurrent.futures import ThreadPoolExecutor
from app.database import get_db, get_pool_status

def test_connection_pool_limits():
    """Should respect pool size limits"""
    status = get_pool_status()

    assert status["size"] <= 20  # Within pool_size
    assert status["checked_out"] + status["checked_in"] <= 30  # pool_size + max_overflow

def test_concurrent_database_access():
    """Multiple concurrent requests should work"""
    def make_query():
        db = next(get_db())
        try:
            # Simulate query
            db.execute("SELECT 1")
            return True
        finally:
            db.close()

    # Simulate 50 concurrent requests
    with ThreadPoolExecutor(max_workers=50) as executor:
        futures = [executor.submit(make_query) for _ in range(50)]
        results = [f.result() for f in futures]

    assert all(results)  # All succeeded

def test_connection_recycling():
    """Old connections should be recycled"""
    import time

    # Get initial pool status
    initial = get_pool_status()

    # Wait for recycle time (in test, use shorter time)
    time.sleep(2)

    # Make new query to trigger recycle
    db = next(get_db())
    db.execute("SELECT 1")
    db.close()

    # Pool should have recycled connections
    # (exact assertions depend on pool implementation)
```

**Step 5**: Add pool size recommendations
```python
# backend/docs/DATABASE_POOLING.md

# Database Connection Pool Configuration

## Recommended Settings

### Small Deployment (< 100 concurrent users)
- Pool Size: 10
- Max Overflow: 5
- Total: 15 connections

### Medium Deployment (100-1000 users)
- Pool Size: 20
- Max Overflow: 10
- Total: 30 connections

### Large Deployment (1000+ users)
- Pool Size: 50
- Max Overflow: 20
- Total: 70 connections

## Formula
connections = (core_count * 2) + effective_spindle_count

For PostgreSQL on 4-core server with SSD:
connections = (4 * 2) + 1 = 9 ≈ 10-20

## Monitoring
Check pool status: GET /admin/system/database-pool
```

**Step 6**: Update .env
```bash
# backend/.env

DB_POOL_SIZE=20
DB_MAX_OVERFLOW=10
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=3600
```

**Testing**:
```bash
# Test pool limits
python -m pytest tests/integration/test_database_pool.py -v

# Monitor pool in production
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8000/admin/system/database-pool
```

**Success Criteria**:
- Pool configured correctly
- No connection exhaustion under load
- Metrics visible in admin dashboard

**Estimated Time**: 6 hours

---

## Task 2.4: Add API Pagination 🟠

### Background
List endpoints return all records, causing performance issues and DoS risk.

### Implementation Steps

**Step 1**: Create pagination utility
```python
# backend/app/utils/pagination.py

from typing import TypeVar, Generic, List
from pydantic import BaseModel
from sqlalchemy.orm import Query

T = TypeVar("T")

class PaginationParams(BaseModel):
    """Pagination query parameters"""
    page: int = 1
    page_size: int = 50

    @property
    def offset(self) -> int:
        """Calculate offset for SQL query"""
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        """Return limit for SQL query"""
        return min(self.page_size, 100)  # Max 100 items per page

class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated API response"""
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool

    @classmethod
    def create(cls, items: List[T], total: int, params: PaginationParams):
        """Create paginated response"""
        total_pages = (total + params.page_size - 1) // params.page_size

        return cls(
            items=items,
            total=total,
            page=params.page,
            page_size=params.page_size,
            total_pages=total_pages,
            has_next=params.page < total_pages,
            has_prev=params.page > 1
        )

def paginate_query(query: Query, params: PaginationParams):
    """Apply pagination to SQLAlchemy query"""
    total = query.count()
    items = query.offset(params.offset).limit(params.limit).all()
    return items, total
```

**Step 2**: Apply to bookings endpoint
```python
# backend/app/routes/bookings.py

from fastapi import Query
from ..utils.pagination import PaginationParams, PaginatedResponse, paginate_query

@router.get("/", response_model=PaginatedResponse)
async def get_all_bookings(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get paginated list of bookings"""
    params = PaginationParams(page=page, page_size=page_size)

    # Build query
    query = (
        db.query(Booking)
        .options(
            joinedload(Booking.instructor).joinedload(Instructor.user),
            joinedload(Booking.student).joinedload(Student.user)
        )
    )

    # Apply filters
    if status:
        query = query.filter(Booking.status == status)

    # Apply pagination
    bookings, total = paginate_query(query, params)

    # Format response
    items = [
        {
            "id": booking.id,
            "lesson_datetime": booking.lesson_datetime.isoformat(),
            "instructor_name": f"{booking.instructor.user.first_name} {booking.instructor.user.last_name}",
            "student_name": f"{booking.student.user.first_name} {booking.student.user.last_name}",
            "status": booking.status,
            # ... other fields
        }
        for booking in bookings
    ]

    return PaginatedResponse.create(items, total, params)
```

**Step 3**: Apply to instructors endpoint
```python
# backend/app/routes/instructors.py

@router.get("/", response_model=PaginatedResponse)
async def get_all_instructors(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    city: Optional[str] = Query(None, description="Filter by city"),
    verification_status: str = Query("verified", description="Filter by status"),
    db: Session = Depends(get_db)
):
    """Get paginated list of instructors"""
    params = PaginationParams(page=page, page_size=page_size)

    query = (
        db.query(Instructor)
        .join(Instructor.user)
        .options(contains_eager(Instructor.user))
        .filter(Instructor.verification_status == verification_status)
    )

    if city:
        query = query.filter(Instructor.city.ilike(f"%{city}%"))

    instructors, total = paginate_query(query, params)

    items = [
        {
            "id": instructor.id,
            "name": f"{instructor.user.first_name} {instructor.user.last_name}",
            # ... other fields
        }
        for instructor in instructors
    ]

    return PaginatedResponse.create(items, total, params)
```

**Step 4**: Update frontend to handle pagination
```typescript
// frontend/services/api/index.ts

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export const getAllBookings = async (
  page: number = 1,
  pageSize: number = 50,
  status?: string
): Promise<PaginatedResponse<Booking>> => {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });

  if (status) {
    params.append('status', status);
  }

  const response = await api.get(`/bookings?${params.toString()}`);
  return response.data;
};

export const getAllInstructors = async (
  page: number = 1,
  pageSize: number = 50,
  city?: string
): Promise<PaginatedResponse<Instructor>> => {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });

  if (city) {
    params.append('city', city);
  }

  const response = await api.get(`/instructors?${params.toString()}`);
  return response.data;
};
```

**Step 5**: Add pagination UI component
```typescript
// frontend/components/Pagination.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  hasNext: boolean;
  hasPrev: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  hasNext,
  hasPrev,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, !hasPrev && styles.buttonDisabled]}
        onPress={() => onPageChange(currentPage - 1)}
        disabled={!hasPrev}
      >
        <Text style={styles.buttonText}>← Previous</Text>
      </TouchableOpacity>

      <Text style={styles.pageInfo}>
        Page {currentPage} of {totalPages}
      </Text>

      <TouchableOpacity
        style={[styles.button, !hasNext && styles.buttonDisabled]}
        onPress={() => onPageChange(currentPage + 1)}
        disabled={!hasNext}
      >
        <Text style={styles.buttonText}>Next →</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 20 : 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginTop: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    borderRadius: 6,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
  },
  pageInfo: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: '#333',
    fontWeight: '500',
  },
});
```

**Step 6**: Update BookingOversightScreen (Complete continuation coming...)

**Testing**:
```bash
# Test pagination
curl "http://localhost:8000/bookings?page=1&page_size=10"

# Should return:
# {
#   "items": [...],
#   "total": 150,
#   "page": 1,
#   "page_size": 10,
#   "total_pages": 15,
#   "has_next": true,
#   "has_prev": false
# }
```

**Success Criteria**:
- All list endpoints paginated
- Max 100 items per page enforced
- Frontend displays pagination controls
- Performance improved for large datasets

**Estimated Time**: 12 hours

---

*[Document continues with remaining Phase 2 tasks (2.5-2.8), Phase 3, and Phase 4... Would you like me to continue with the full implementation plan?]*

---

## Quick Reference: Priority Matrix

| Task | Priority | Effort | Impact | Dependencies |
|------|----------|--------|--------|--------------|
| 1.1 Remove hardcoded credentials | 🔴 Critical | 4h | High | None |
| 1.2 Rotate secrets | 🔴 Critical | 8h | High | 1.1 |
| 1.3 HTTP-only cookies | 🔴 Critical | 12h | High | None |
| 1.4 Rate limiting | 🔴 Critical | 8h | High | Redis |
| 1.5 Encrypt SMTP passwords | 🔴 Critical | 6h | High | None |
| 1.6 Security headers | 🔴 Critical | 4h | High | None |
| 2.1 Test suite | 🟠 High | 40h | High | None |
| 2.2 Fix N+1 queries | 🟠 High | 16h | High | None |
| 2.3 Connection pool | 🟠 High | 6h | Medium | None |
| 2.4 API pagination | 🟠 High | 12h | High | None |

**Total Estimated Effort: 220-300 hours**

