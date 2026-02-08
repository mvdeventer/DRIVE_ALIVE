# Drive Alive - Driving School Booking App

Cross-platform booking app for South African driving schools. Instructors register, students book lessons, payments handled in-app, GPS pickup/drop-off, WhatsApp reminders, compliance with POPIA/PCI DSS.

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 16+
- Git

### Initial Setup

```powershell
# Clone repository
git clone https://github.com/mvdeventer/DRIVE_ALIVE.git
cd DRIVE_ALIVE

# Backend setup
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env with your settings (see Configuration section below)

# Frontend setup
cd ..\frontend
npm install

# Start development servers
cd ..
.\s.bat -d
```

## 🌐 Environment Configuration

**Critical:** Verification links, password resets, and payment redirects use `FRONTEND_URL`

### For Local Development (Computer Only)
```powershell
cd backend
.\switch-env.ps1 -Env loc
# Or just run .\switch-env.ps1 for interactive menu
```
Links will use: `http://localhost:8081/verify-account?token=...`

### For Home Network Testing (Mobile Devices)
```powershell
cd backend
.\switch-env.ps1 -Env net  # Auto-detects your IP
# Or just run .\switch-env.ps1 for interactive menu
```
Links will use: `http://YOUR-IP:8081/verify-account?token=...`

### For Production (Render Deployment)
Set in Render Dashboard:
```
FRONTEND_URL=https://your-app-name.onrender.com
```
Links will use: `https://your-app-name.onrender.com/verify-account?token=...`

**📖 Complete Guide:** See [`ENVIRONMENT_CONFIGURATION_SUMMARY.md`](ENVIRONMENT_CONFIGURATION_SUMMARY.md)

## 📚 Documentation

### Setup & Configuration
- **[Quick Start Setup](QUICK_START_SETUP.md)** - First-time setup guide
- **[Environment Configuration](ENVIRONMENT_CONFIGURATION_SUMMARY.md)** - Complete environment setup
- **[Network Configuration](NETWORK_CONFIGURATION_GUIDE.md)** - Detailed network setup for all scenarios
- **[Quick Fix: Verification Links](QUICK_FIX_VERIFICATION_LINKS.md)** - Troubleshooting verification issues

### Implementation Guides
- **[Agents Guide](AGENTS.md)** - Complete implementation roadmap
- **[Multi-Role Users](MULTI_ROLE_USERS.md)** - One user, multiple roles implementation
- **[System Initialization](SYSTEM_INITIALIZATION.md)** - Admin account setup flow
- **[Email Verification](EMAIL_VERIFICATION_SYSTEM.md)** - Complete verification system guide
- **[Instructor Verification](INSTRUCTOR_VERIFICATION_SYSTEM.md)** - Admin-verified instructor flow

### Features
- **[GPS Location Capture](GPS_LOCATION_CAPTURE.md)** - High-accuracy GPS with reverse geocoding
- **[Booking Fee Structure](BOOKING_FEE_STRUCTURE.md)** - R10 booking fee implementation
- **[WhatsApp Automation](AGENTS.md#recent-updates-whatsapp-automation)** - Twilio Business API integration
- **[Password Reset](PASSWORD_RESET_GUIDE.md)** - Secure password reset flow
- **[Admin Settings](ADMIN_SETTINGS_GUIDE.md)** - Admin configuration management

### Database & Backup
- **[Database Interface](DATABASE_INTERFACE_SCREEN.md)** - Admin database management
- **[Automated Backup](AUTOMATED_BACKUP_SYSTEM.md)** - Scheduled database backups

### Deployment
- **[Deployment Guide](DEPLOYMENT.md)** - Render.com production deployment
- **[Render Configuration](render.yaml)** - Render service configuration

## 🏗️ Architecture

### Backend (FastAPI + Python)
```
backend/
├── app/
│   ├── main.py                 # Application entry point
│   ├── config.py               # Environment configuration
│   ├── database.py             # SQLAlchemy setup
│   ├── models/                 # Database models
│   │   ├── user.py
│   │   ├── verification_token.py
│   │   ├── instructor_verification.py
│   │   └── availability.py
│   ├── routes/                 # API endpoints
│   │   ├── auth.py
│   │   ├── verification.py
│   │   ├── booking.py
│   │   ├── payments.py
│   │   └── admin.py
│   ├── services/               # Business logic
│   │   ├── auth.py
│   │   ├── verification_service.py
│   │   ├── email_service.py
│   │   ├── whatsapp_service.py
│   │   └── instructor_verification_service.py
│   └── utils/                  # Utilities
│       └── encryption.py
├── migrations/                 # Database migrations
└── .env                        # Environment variables (DO NOT COMMIT)
```

### Frontend (React Native + Expo)
```
frontend/
├── screens/
│   ├── auth/                   # Authentication screens
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterStudentScreen.tsx
│   │   ├── RegisterInstructorScreen.tsx
│   │   └── SetupScreen.tsx
│   ├── student/                # Student features
│   │   ├── StudentHomeScreen.tsx
│   │   ├── InstructorListScreen.tsx
│   │   └── BookingScreen.tsx
│   ├── instructor/             # Instructor features
│   │   ├── InstructorHomeScreen.tsx
│   │   ├── ManageAvailabilityScreen.tsx
│   │   └── EarningsReportScreen.tsx
│   ├── admin/                  # Admin features
│   │   ├── AdminDashboardScreen.tsx
│   │   ├── UserManagementScreen.tsx
│   │   ├── InstructorVerificationScreen.tsx
│   │   └── RevenueAnalyticsScreen.tsx
│   └── verification/           # Verification screens
│       ├── VerificationPendingScreen.tsx
│       ├── VerifyAccountScreen.tsx
│       └── InstructorVerifyScreen.tsx
├── components/                 # Reusable components
│   ├── InlineMessage.tsx
│   ├── WebNavigationHeader.tsx
│   └── AddressAutocomplete.tsx
├── services/
│   └── api/
│       └── index.ts            # API client
├── utils/
│   └── textEncodingPolyfill.ts # iOS/Android polyfill
└── App.tsx                     # Navigation root
```

## 🔑 Key Features

### ✅ Implemented
- **Multi-Role System** - One user can be Student, Instructor, and/or Admin
- **Email & WhatsApp Verification** - Dual-channel account verification
- **Admin Verification for Instructors** - All admins notified, verify via link or dashboard
- **GPS Location Capture** - High-accuracy GPS with OpenStreetMap reverse geocoding
- **Booking Management** - Students book lessons, instructors manage schedules
- **Real-time Conflict Detection** - Prevents overlapping bookings across all instructors
- **Rating System** - Students rate completed lessons (1-5 stars with emoji feedback)
- **WhatsApp Automation** - Booking confirmations, 1-hour student reminders, 15-minute instructor reminders, daily summaries
- **Payment Integration** - Stripe (international) + PayFast (South Africa) + R10 booking fee
- **Admin Dashboard** - User management, instructor verification, booking oversight, revenue analytics
- **Database Backup** - Automated backups every 10 minutes + manual export/import
- **Cross-Platform** - Windows, iOS, Android, Web

### 🔧 In Development
- Certification tracking
- Multi-language support (Afrikaans, Zulu, Xhosa)
- Advanced analytics

## 🛠️ Configuration

### Required Environment Variables

**Backend `.env` file:**
```env
# Backend URL - CRITICAL for verification links
FRONTEND_URL=http://localhost:8081  # Update based on environment

# Database
DATABASE_URL=sqlite:///./drive_alive.db

# JWT Authentication
# See .env.example for SECRET_KEY and ENCRYPTION_KEY

# Twilio WhatsApp
# See .env.example for TWILIO_* values

# Payment Gateways (optional for development)
# See .env.example for STRIPE_* values
PAYFAST_MERCHANT_ID=...

# CORS
ALLOWED_ORIGINS=http://localhost:8081,http://YOUR-IP:8081
```

**See `.env.example` for complete list**

## 🧪 Testing

### Local Development Testing (Computer Only)
```powershell
# 1. Configure for localhost
cd backend
.\switch-env.ps1 -Env loc

# 2. Start servers
cd ..
.\s.bat -d

# 3. Open browser: http://localhost:8081
```

### Home Network Testing (Mobile Devices)
```powershell
# 1. Configure for network (auto-detects your IP)
cd backend
.\switch-env.ps1 -Env net

# 2. Start servers
cd ..
.\s.bat -d

# 3. On mobile:
#    - Connect to same WiFi
#    - Open Expo Go
#    - Scan QR code or enter: exp://YOUR-IP:8081

# 4. Test verification:
#    - Register student account
#    - Check email/WhatsApp on phone
#    - Click verification link
#    - Should open in phone browser and verify account
```

### Production Testing (Render)
```powershell
# Deploy to Render
git add .
git commit -m "Deploy to production"
git push origin main

# Render auto-deploys, then test:
# 1. Register student on live site
# 2. Check email/WhatsApp
# 3. Verification link: https://your-app.onrender.com/verify-account?token=...
# 4. Click and verify it works worldwide
```

## 🚨 Troubleshooting

### "Site can't be reached" on mobile
```powershell
# Allow backend through Windows Firewall
New-NetFirewallRule -DisplayName "Drive Alive Backend" -Direction Inbound -LocalPort 8081 -Protocol TCP -Action Allow
```

### Verification links show wrong URL
```powershell
# Update FRONTEND_URL and restart backend
cd backend
.\switch-env.ps1 -Env net
cd ..
# Restart backend (Ctrl+C, then .\s.bat -d)
```

### IP address changed
```powershell
# Check new IP
ipconfig | findstr IPv4

# Update configuration
cd backend
.\switch-env.ps1 -Env net

# Restart backend
```

**📖 Complete Troubleshooting:** See [`QUICK_FIX_VERIFICATION_LINKS.md`](QUICK_FIX_VERIFICATION_LINKS.md)

## 📦 Deployment to Render

### Step 1: Prepare Repository
```powershell
git add .
git commit -m "Ready for production"
git push origin main
```

### Step 2: Create Render Web Service
1. Go to https://dashboard.render.com
2. New → Web Service
3. Connect GitHub repository: `mvdeventer/DRIVE_ALIVE`
4. Configure:
   - **Name:** `drivealive` (or your preferred name)
   - **Region:** Oregon (or closest to South Africa)
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Step 3: Set Environment Variables
```
FRONTEND_URL=https://drivealive.onrender.com
ALLOWED_ORIGINS=https://drivealive.onrender.com
ENVIRONMENT=production
DEBUG=False
DATABASE_URL=<render-postgres-url>
# Set SECRET_KEY, ENCRYPTION_KEY, TWILIO_*, STRIPE_* in Render (see .env.example)
# ... all other production secrets
```

### Step 4: Deploy & Test
- Render auto-deploys on git push
- Monitor build logs
- Test verification flow on live site

**📖 Complete Deployment Guide:** See [`DEPLOYMENT.md`](DEPLOYMENT.md)

## 🔐 Security

### Data Protection
- **Encryption:** SMTP passwords encrypted with AES-256
- **JWT Auth:** Secure token-based authentication
- **Verification Tokens:** 32-byte URL-safe random tokens with expiry
- **Password Hashing:** bcrypt with salt
- **SQL Injection:** Prevented by SQLAlchemy ORM
- **HTTPS:** Enforced in production (Render provides automatically)

### Compliance
- **POPIA:** South African data protection compliance
- **PCI DSS:** SAQ A compliant (no cardholder data stored)
- **Privacy:** User data encrypted, minimal third-party sharing

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

See [LICENSE](LICENSE) file for details.

## 📞 Support

- **GitHub Issues:** https://github.com/mvdeventer/DRIVE_ALIVE/issues
- **Documentation:** See docs list above
- **Quick Fixes:** See troubleshooting section

## 🎯 Roadmap

### Phase 1: MVP ✅
- [x] User authentication
- [x] Student/Instructor/Admin roles
- [x] Booking system
- [x] WhatsApp notifications
- [x] Payment integration

### Phase 2: Enhanced UX ✅
- [x] Email + WhatsApp verification
- [x] GPS location capture
- [x] Rating system
- [x] Admin dashboard
- [x] Database backup

### Phase 3: Advanced Features 🚧
- [ ] Certification tracking
- [ ] Multi-language support
- [ ] Advanced analytics
- [ ] Mobile app (React Native standalone)

### Phase 4: Scale & Optimize
- [ ] Performance optimization
- [ ] Load testing
- [ ] CDN integration
- [ ] Multi-region deployment
