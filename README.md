# Drive Alive (RoadReady) — Driving School Booking Platform

> Cross-platform booking app for South African driving schools. Instructors register, students book lessons, payments handled in-app, GPS pickup/drop-off, WhatsApp reminders, compliant with POPIA/PCI DSS.

**Version:** `2.0.7` | **Platform:** iOS · Android · Web | **Region:** South Africa (ZAR)

---

## Table of Contents

- [Quick Start](#-quick-start)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Environment Variables](#-environment-variables)
- [API Routes](#-api-routes)
- [Database Models](#-database-models)
- [Scripts & Commands](#-scripts--commands)
- [Testing](#-testing)
- [Deployment](#-deployment-rendercom)
- [Security & Compliance](#-security--compliance)
- [Troubleshooting](#-troubleshooting)
- [Roadmap](#-roadmap)

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Version |
|---|---|
| Python | 3.9+ (3.14 supported) |
| Node.js | 16+ |
| PostgreSQL | 13–17 |
| Git | any |

### One-Command Startup

```powershell
# Clone and start
git clone https://github.com/mvdeventer/DRIVE_ALIVE.git
cd DRIVE_ALIVE
.\s.bat
```

`s.bat` auto-creates the Python venv, installs all dependencies, and starts both servers. On first run it detects a missing venv and repairs it automatically.

### Manual Setup (if needed)

```powershell
# Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env        # then edit .env

# Frontend
cd ..\frontend
npm install

# Start (from repo root)
cd ..
.\s.bat -d                    # -d = debug/development mode
```

### s.bat Flags

| Flag | Description |
|---|---|
| *(none)* | Standard start |
| `-d` | Debug/development mode |
| `-b` | Backend only |
| `-f` | Frontend only |
| `-n` | Network mode (mobile testing) |
| `-l` | Localhost mode (HTTPS) |
| `-m` | Mobile/network mode (auto-switch env) |
| `stop` | Stop all servers |

---

## 🧰 Tech Stack

### Backend

| Package | Version | Purpose |
|---|---|---|
| fastapi | 0.109.0 | API framework |
| uvicorn | 0.27.0 | ASGI server |
| python-dotenv | 1.0.0 | Env var loading |
| sqlalchemy | ≥2.0.36 | ORM |
| alembic | ≥1.14.0 | DB migrations |
| psycopg (binary) | ≥3.2.0 | PostgreSQL async driver |
| psycopg2-binary | ≥2.9.9 | PostgreSQL sync driver (Render) |
| python-jose[cryptography] | 3.3.0 | JWT tokens |
| passlib | 1.7.4 | Password hashing |
| bcrypt | 4.0.1 | bcrypt hashing |
| python-multipart | 0.0.6 | Form data parsing |
| firebase-admin | 6.4.0 | Firebase authentication |
| stripe | 7.11.0 | International payments |
| requests | 2.31.0 | HTTP client |
| geopy | 2.4.1 | GPS reverse geocoding |
| twilio | 8.11.1 | WhatsApp Business API |
| pydantic | ≥2.0.0 | Data validation |
| pydantic-settings | ≥2.0.0 | Settings management |
| email-validator | ≥2.0.0 | Email validation |
| fastapi-cors | 0.0.6 | CORS middleware |
| slowapi | 0.1.9 | Rate limiting |
| redis | 7.1.0 | Rate limit storage |
| cryptography | 46.0.4 | AES-256 encryption |
| pytest | 7.4.4 | Testing |
| pytest-asyncio | 0.23.3 | Async test support |
| httpx | 0.26.0 | Test HTTP client |
| python-dateutil | 2.8.2 | Date utilities |
| pytz | 2023.3 | Timezone (Africa/Johannesburg) |

### Frontend

| Package | Version | Purpose |
|---|---|---|
| expo | ~54.0.33 | Cross-platform framework |
| react | 19.1.0 | UI library |
| react-native | 0.81.5 | Mobile runtime |
| react-native-web | ^0.21.0 | Web support |
| @react-navigation/native | ^6.1.18 | Navigation |
| @react-navigation/native-stack | ^6.11.0 | Stack navigator |
| @react-navigation/bottom-tabs | ^6.6.1 | Tab navigator |
| @stripe/stripe-react-native | 0.50.3 | Stripe payments |
| @tanstack/react-query | ^5.90.20 | Server state management |
| expo-location | ~19.0.8 | GPS location |
| expo-notifications | ~0.32.16 | Push notifications |
| expo-secure-store | ~15.0.8 | Secure token storage |
| firebase | ^11.1.0 | Firebase auth client |
| axios | ^1.7.9 | HTTP client |
| nativewind | ^4.2.1 | Tailwind for RN |
| react-native-maps | 1.20.1 | Maps integration |
| exceljs | ^4.4.0 | Excel export |
| jspdf | ^4.1.0 | PDF export |

---

## 🏗️ Project Structure

```
DRIVE_ALIVE/
├── s.bat                           # One-command startup script
├── scripts/
│   ├── drive-alive.bat             # Server management (start/stop/restart)
│   └── INSTALL.bat                 # Install / --uninstall support
├── backend/
│   ├── .env                        # ← your secrets (DO NOT COMMIT)
│   ├── .env.example                # Template for all env vars
│   ├── requirements.txt            # Python dependencies
│   ├── switch-env.ps1              # Switch between loc/net/prod environments
│   └── app/
│       ├── main.py                 # FastAPI app entry point + migration runner
│       ├── config.py               # Pydantic settings (all env vars)
│       ├── database.py             # SQLAlchemy engine + session factory
│       ├── models/
│       │   ├── user.py             # User, UserRole, admin settings
│       │   ├── booking.py          # Lesson bookings
│       │   ├── booking_credit.py   # Booking fee credits
│       │   ├── availability.py     # Instructor time slots
│       │   ├── payment.py          # Payment records
│       │   ├── payment_session.py  # PayFast session tracking
│       │   ├── verification_token.py        # Email/WhatsApp tokens
│       │   ├── instructor_verification.py   # Admin verification flow
│       │   └── password_reset.py   # Password reset tokens
│       ├── routes/
│       │   ├── auth.py             # Login, register, JWT
│       │   ├── verification.py     # Token verify endpoints
│       │   ├── bookings.py         # CRUD bookings
│       │   ├── availability.py     # Instructor slots
│       │   ├── instructors.py      # Instructor listing/search
│       │   ├── instructor_setup.py # Onboarding & profile setup
│       │   ├── students.py         # Student profile
│       │   ├── payments.py         # Stripe & PayFast endpoints
│       │   ├── admin.py            # Admin dashboard APIs
│       │   ├── database.py         # DB export/import
│       │   ├── database_interface.py # Admin DB browser
│       │   └── setup.py            # First-run admin setup
│       ├── services/
│       │   ├── auth.py             # JWT creation/validation
│       │   ├── email_service.py    # SMTP email sender
│       │   ├── whatsapp_service.py # Twilio WhatsApp
│       │   ├── verification_service.py           # Token generation/validation
│       │   ├── instructor_verification_service.py # Admin notify/approve flow
│       │   ├── reminder_scheduler.py  # 1h student / 15min instructor reminders
│       │   ├── backup_scheduler.py    # Auto-backup every 10 min
│       │   └── verification_cleanup_scheduler.py # Expire old tokens
│       └── utils/
│           ├── encryption.py       # Fernet AES-256
│           └── rate_limiter.py     # SlowAPI + Redis config
├── frontend/
│   ├── app.json                    # Expo config (slug: roadready, v2.0.7)
│   ├── App.tsx                     # Navigation root
│   ├── screens/
│   │   ├── auth/                   # Login, Register (Student/Instructor)
│   │   ├── student/                # Home, Instructor list, Booking
│   │   ├── instructor/             # Home, Availability, Earnings
│   │   ├── admin/                  # Dashboard, Users, Verification, Revenue
│   │   └── verification/           # Pending, VerifyAccount, InstructorVerify
│   ├── components/
│   │   ├── InlineMessage.tsx
│   │   ├── WebNavigationHeader.tsx
│   │   └── AddressAutocomplete.tsx
│   └── services/api/index.ts       # Axios API client
├── migrations/                     # Alembic migration scripts
├── tests/                          # Integration tests
├── render.yaml                     # Render.com IaC blueprint
└── docker-compose.yml              # Local Docker (PostgreSQL)
```

---

## 🔑 Environment Variables

All variables live in `backend/.env`. Copy from `backend/.env.example`.

### Database

| Variable | Example | Required |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/driving_school_db` | ✅ |

### Authentication

| Variable | Default | Required |
|---|---|---|
| `SECRET_KEY` | *(generate)* | ✅ |
| `ALGORITHM` | `HS256` | |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | |
| `ENCRYPTION_KEY` | *(generate — Fernet base64)* | ✅ |

> Generate ENCRYPTION_KEY:
> ```powershell
> cd backend
> venv\Scripts\python.exe -c "from app.utils.encryption import EncryptionService; print(EncryptionService.generate_key())"
> ```

### Firebase

| Variable | Example |
|---|---|
| `FIREBASE_CREDENTIALS_PATH` | `path/to/firebase-credentials.json` |

### Stripe (International Payments)

| Variable |
|---|
| `STRIPE_SECRET_KEY` |
| `STRIPE_PUBLISHABLE_KEY` |
| `STRIPE_WEBHOOK_SECRET` |

### PayFast (South Africa)

| Variable | Default |
|---|---|
| `PAYFAST_MERCHANT_ID` | |
| `PAYFAST_MERCHANT_KEY` | |
| `PAYFAST_PASSPHRASE` | |
| `PAYFAST_MODE` | `sandbox` |

### Twilio (WhatsApp)

| Variable | Notes |
|---|---|
| `TWILIO_ACCOUNT_SID` | |
| `TWILIO_AUTH_TOKEN` | |
| Sender number | Configured in Admin Settings (stored in DB) |

### SMTP (Email)

| Variable | Default |
|---|---|
| `SMTP_SERVER` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USERNAME` | |
| `SMTP_PASSWORD` | *(encrypted in DB)* |
| `FROM_EMAIL` | `noreply@roadready.co.za` |

### App Settings

| Variable | Dev Default | Production |
|---|---|---|
| `FRONTEND_URL` | `http://localhost:8081` | `https://drive-alive-web.onrender.com` |
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:8081` | your domain |
| `ENVIRONMENT` | `development` | `production` |
| `DEBUG` | `True` | `False` |
| `AUTO_VERIFY_INSTRUCTORS` | `False` | `False` |
| `DEFAULT_TIMEZONE` | `Africa/Johannesburg` | `Africa/Johannesburg` |
| `DEFAULT_CURRENCY` | `ZAR` | `ZAR` |

### Environment Switching

```powershell
# Localhost only (HTTPS)
.\backend\switch-env.ps1 -Env loc

# Home network / mobile testing (auto-detects your IP)
.\backend\switch-env.ps1 -Env net

# Interactive menu
.\backend\switch-env.ps1
```

| Mode | `FRONTEND_URL` | Use Case |
|---|---|---|
| `loc` | `http://localhost:8081` | Computer only |
| `net` | `http://<YOUR-IP>:8081` | Mobile on same WiFi |
| Production | `https://drive-alive-web.onrender.com` | Live |

---

## 🌐 API Routes

**Base URL (local):** `http://localhost:8000`
**Health check:** `GET /health`

| Prefix | File | Description |
|---|---|---|
| `/api/auth` | `routes/auth.py` | Register, login, JWT refresh |
| `/api/verification` | `routes/verification.py` | Email/WhatsApp token verify |
| `/api/bookings` | `routes/bookings.py` | Create/manage lesson bookings |
| `/api/availability` | `routes/availability.py` | Instructor time slot management |
| `/api/instructors` | `routes/instructors.py` | List, search, filter instructors |
| `/api/instructor-setup` | `routes/instructor_setup.py` | Onboarding & profile setup |
| `/api/students` | `routes/students.py` | Student profile management |
| `/api/payments` | `routes/payments.py` | Stripe & PayFast payment flows |
| `/api/admin` | `routes/admin.py` | Admin dashboard, user management |
| `/api/database` | `routes/database.py` | DB export / import |
| `/api/database-interface` | `routes/database_interface.py` | Admin DB browser |
| `/api/setup` | `routes/setup.py` | First-run admin account creation |

**Interactive API docs:** `http://localhost:8000/docs`

---

## 🗄️ Database Models

| Model | Table | Description |
|---|---|---|
| `User` / `UserRole` | `users` | Multi-role (Student, Instructor, Admin) |
| `Booking` | `bookings` | Lesson booking records |
| `BookingCredit` | `booking_credits` | R10 booking fee tracking |
| `Availability` | `availability` | Instructor time slots |
| `Payment` | `payments` | Stripe/PayFast payment records |
| `PaymentSession` | `payment_sessions` | PayFast session state |
| `VerificationToken` | `verification_tokens` | Email/WhatsApp verification |
| `InstructorVerification` | `instructor_verifications` | Admin approval workflow |
| `PasswordReset` | `password_resets` | Secure reset tokens |

**Migrations:** Alembic (`backend/migrations/`) + incremental `ALTER TABLE` applied on startup via `_apply_incremental_migrations()`.

---

## 📜 Scripts & Commands

### Startup

```powershell
.\s.bat               # Standard start
.\s.bat -d            # Debug mode
.\s.bat -b            # Backend only
.\s.bat -f            # Frontend only
.\s.bat -l            # Switch to localhost + start
.\s.bat -m            # Switch to network/mobile + start
.\scripts\drive-alive.bat stop    # Stop all servers
```

### Backend (manual)

```powershell
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (manual)

```powershell
cd frontend
npx expo start           # Tunnel + HTTPS (default)
npx expo start --lan     # LAN only
npx expo start --web     # Web only
```

### Database

```powershell
cd backend
# Run migrations
venv\Scripts\python.exe -m alembic upgrade head

# Create new migration
venv\Scripts\python.exe -m alembic revision --autogenerate -m "description"
```

---

## 🧪 Testing

### Backend Tests

```powershell
cd backend
venv\Scripts\python.exe -m pytest -v
```

Tests live in `backend/tests/`. Async tests use `pytest-asyncio`.

### Frontend Tests

```powershell
cd frontend
npm test                    # Jest
npm run test:coverage       # Coverage report
npm run cypress:run         # E2E (Cypress)
npm run test:e2e            # Database interface E2E
```

---

## ☁️ Deployment (Render.com)

Configured via [`render.yaml`](render.yaml):

| Service | Type | Plan | Port |
|---|---|---|---|
| `drive-alive-api` | Web Service (Python) | Free | `$PORT` |
| `drive-alive-db` | PostgreSQL | Free | 5432 |

**Build command:** `pip install -r requirements.txt`
**Start command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
**Health check path:** `/health`

### Deploy

```powershell
git add .
git commit -m "deploy: your message"
git push origin main
# Render auto-deploys on push to main
```

### Production Environment Variables (set in Render Dashboard)

```
DATABASE_URL         → auto-injected from render-postgres
SECRET_KEY           → auto-generated by Render
ENCRYPTION_KEY       → generate locally and paste
FRONTEND_URL         → https://drive-alive-web.onrender.com
ALLOWED_ORIGINS      → https://drive-alive-web.onrender.com
ENVIRONMENT          → production
DEBUG                → False
STRIPE_SECRET_KEY    → from Stripe Dashboard
PAYFAST_MERCHANT_ID  → from PayFast Dashboard
PAYFAST_MERCHANT_KEY
TWILIO_ACCOUNT_SID   → from Twilio Console
TWILIO_AUTH_TOKEN
SMTP_USERNAME        → Gmail address
SMTP_PASSWORD        → Gmail App Password
```

---

## 🔐 Security & Compliance

| Area | Implementation |
|---|---|
| Password hashing | bcrypt via passlib |
| JWT auth | HS256, 30-min expiry, single-session enforcement |
| Sensitive data | AES-256 (Fernet) encryption |
| Verification tokens | 32-byte URL-safe random, time-limited |
| SQL injection | Prevented by SQLAlchemy ORM |
| Rate limiting | SlowAPI + Redis |
| HTTPS | Enforced in production (Render TLS) |
| POPIA | South African data protection compliance |
| PCI DSS | SAQ A (no cardholder data stored) |

---

## 🚨 Troubleshooting

### venv missing after reinstall

```powershell
# s.bat auto-repairs this now. Or manually:
cd backend
python -m venv venv
venv\Scripts\python.exe -m pip install -r requirements.txt
```

### "Site can't be reached" on mobile

```powershell
# Allow backend through Windows Firewall
New-NetFirewallRule -DisplayName "Drive Alive Backend" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Drive Alive Frontend" -Direction Inbound -LocalPort 8081 -Protocol TCP -Action Allow

# Switch to network mode
.\backend\switch-env.ps1 -Env net
.\s.bat
```

### Verification links use wrong URL

```powershell
cd backend
.\switch-env.ps1 -Env net   # or loc
# Restart: Ctrl+C then .\s.bat
```

### IP address changed

```powershell
ipconfig | findstr IPv4              # check new IP
.\backend\switch-env.ps1 -Env net   # re-detect and update
```

### PostgreSQL not starting

```powershell
Get-Service | Where-Object {$_.Name -like '*postgres*'}
Start-Service postgresql-x64-17   # adjust version number
```

---

## ✅ Features

### Implemented
- Multi-role accounts — one user can be Student + Instructor + Admin
- Email & WhatsApp dual-channel account verification
- Admin approval flow for instructors (all admins notified, approve via link or dashboard)
- GPS pickup/drop-off capture with OpenStreetMap reverse geocoding
- Booking management with real-time conflict detection
- 1–5 star rating system with emoji feedback
- WhatsApp automation: booking confirmations, 1h student reminders, 15min instructor reminders, daily summaries
- Stripe (international) + PayFast (ZAR) payments + R10 booking fee
- Admin dashboard: user management, verification, bookings, revenue analytics
- Automated database backups every 10 minutes + manual export/import
- Secure password reset flow (email token)
- Cross-platform: Windows, iOS, Android, Web

### In Development
- Certification / learner's licence tracking
- Multi-language support (Afrikaans, Zulu, Xhosa)
- Advanced analytics & reporting

---

## 🗺️ Roadmap

### Phase 1 — MVP ✅
- [x] JWT authentication + multi-role users
- [x] Booking system with conflict detection
- [x] WhatsApp notifications (Twilio)
- [x] Payment integration (Stripe + PayFast)

### Phase 2 — Enhanced UX ✅
- [x] Email + WhatsApp verification
- [x] GPS location capture
- [x] Rating system
- [x] Admin dashboard
- [x] Database backup system

### Phase 3 — Advanced Features 🚧
- [ ] Certification tracking
- [ ] Multi-language support
- [ ] Advanced analytics
- [ ] Standalone mobile app build

### Phase 4 — Scale
- [ ] Performance optimisation & load testing
- [ ] CDN integration
- [ ] Multi-region deployment

---

## 📄 License

See [LICENSE](LICENSE) for details.

## 📞 Support

- **GitHub Issues:** https://github.com/mvdeventer/DRIVE_ALIVE/issues
- **API Docs (local):** http://localhost:8000/docs
