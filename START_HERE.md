# 🚀 START HERE - Drive Alive Quick Setup

## Step 1: Create Project Structure (30 seconds)

Run this command in your terminal:

```bash
cd C:\Projects\DRIVE_ALIVE
python complete_setup.py
```

This creates **all directories and configuration files** in one go!

---

## Step 2: What Gets Created

### ✅ Directories (32 folders)
```
📱 frontend/          - React Native + Expo mobile app
   ├── assets/       - Images, icons, fonts
   ├── components/   - Reusable UI components
   ├── screens/      - App screens (Auth, Booking, Payment)
   ├── navigation/   - React Navigation setup
   ├── services/     - API calls and Firebase
   └── utils/        - Helper functions

⚙️  backend/          - FastAPI Python backend
   ├── app/          - Application code
   │   ├── models/   - Database models
   │   ├── routes/   - API endpoints
   │   ├── services/ - Business logic
   │   └── utils/    - Helper functions
   └── tests/        - Pytest tests

📚 docs/             - Documentation (AGENTS.md, API.md, ARCHITECTURE.md)
🔧 config/           - Environment variables (.env)
🧪 tests/            - Test suites (frontend + backend)
🔨 .vscode/          - VS Code configuration
🚀 .github/          - CI/CD workflows
```

### ✅ Configuration Files Created
- ✅ `requirements.txt` - Python dependencies
- ✅ `package.json` - Node.js dependencies
- ✅ `App.js` - React Native entry point
- ✅ `backend/app/main.py` - FastAPI entry point
- ✅ `.vscode/settings.json` - Editor config
- ✅ `.vscode/launch.json` - Debug config
- ✅ `docker-compose.yml` - Docker services
- ✅ `.gitignore` - Git ignore patterns
- ✅ `LICENSE` - MIT License
- ✅ All documentation files

---

## Step 3: Backend Setup (2 minutes)

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

**What this does:**
- Creates Python virtual environment
- Installs FastAPI, SQLAlchemy, Stripe, Celery, Redis, etc.
- Sets up testing framework (Pytest)

---

## Step 4: Frontend Setup (2 minutes)

```bash
cd frontend
npm install
```

**What this does:**
- Installs React Native, Expo, React Navigation
- Installs Expo Location, Maps, Notifications
- Installs Stripe React Native, Firebase, Axios

---

## Step 5: Environment Configuration (1 minute)

```bash
cd config
copy .env.example .env
```

Then edit `.env` with your credentials:
- Database connection (PostgreSQL)
- Firebase API keys
- Stripe API keys
- WhatsApp Business API (Twilio)
- Google Maps API key

---

## Step 6: Open in VS Code

```bash
code DRIVE_ALIVE.code-workspace
```

**VS Code Features:**
- ✅ Multi-root workspace (6 folders with emojis)
- ✅ Python virtual environment auto-detection
- ✅ Auto-formatting (Black, Prettier)
- ✅ Linting (Flake8, ESLint)
- ✅ Debugging configs (FastAPI + Expo)
- ✅ Build tasks (backend + frontend)
- ✅ Recommended extensions

---

## Step 7: Run the Application

### Option A: VS Code (Easiest)
1. Press `F5`
2. Select **"Full Stack"**
3. Both backend and frontend start automatically!

### Option B: Manual

**Terminal 1 - Backend:**
```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npx expo start
```

---

## 🎉 You're Running!

- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/api/docs
- **Frontend**: Expo Dev Tools opens in browser
  - Press `a` for Android
  - Press `i` for iOS (Mac only)
  - Press `w` for web browser
  - Scan QR code with Expo Go app

---

## 📋 Tech Stack Summary

### Frontend
- React Native 0.73 + Expo 50
- React Navigation, Expo Location, Maps
- Stripe React Native, Firebase Auth
- Jest testing framework

### Backend
- FastAPI (Python 3.11+)
- SQLAlchemy ORM + PostgreSQL
- Celery + Redis (background tasks)
- Stripe/PayFast payments
- Twilio WhatsApp API
- Pytest testing framework

### DevOps
- Docker + Docker Compose
- GitHub Actions CI/CD
- VS Code debugging

---

## 📚 Documentation

- **QUICKSTART.md** - 5-minute quick start
- **SETUP_GUIDE.md** - Comprehensive setup
- **PROJECT_STATUS.md** - Status and checklist
- **docs/AGENTS.md** - Team roles and TODO
- **docs/API.md** - API endpoints
- **docs/ARCHITECTURE.md** - System design
- **CONTRIBUTING.md** - Contribution guidelines

---

## 🔥 Quick Commands

```bash
# Run setup script
python complete_setup.py

# Backend setup
cd backend && python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Frontend setup
cd frontend && npm install

# Start backend
cd backend && venv\Scripts\activate && uvicorn app.main:app --reload

# Start frontend
cd frontend && npx expo start

# Run tests
cd backend && pytest -v
cd frontend && npm test

# Format code
cd backend && black app/ tests/
cd frontend && npm run format

# Docker (all services)
docker-compose up -d
```

---

## 🎯 Development Roadmap

See `docs/AGENTS.md` for detailed TODO list:

### Phase 1: MVP
- [ ] User authentication (Firebase)
- [ ] Instructor profiles with GPS
- [ ] Student booking system
- [ ] Payment integration (Stripe/PayFast)
- [ ] Cancellation policy

### Phase 2: Core Features
- [ ] WhatsApp reminders
- [ ] Push notifications
- [ ] Dashboards (instructor/student)
- [ ] Web support

### Phase 3: Advanced
- [ ] Live lesson tracking
- [ ] Lesson packages
- [ ] Multi-language support
- [ ] Analytics

### Phase 4: Compliance
- [ ] Admin dashboard
- [ ] POPIA compliance
- [ ] PCI DSS compliance

---

## ⚠️ Prerequisites

Before starting, ensure you have:
- ✅ Python 3.11+ installed
- ✅ Node.js 18+ and npm installed
- ✅ VS Code installed (recommended)
- ✅ Git installed
- ⏳ PostgreSQL 14+ (install later)
- ⏳ Redis (install later)

---

## 🆘 Troubleshooting

### Python venv won't activate (Windows)
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### npm install fails
```bash
npm cache clean --force
npm install
```

### Port already in use
```bash
# Backend (8000)
netstat -ano | findstr :8000
taskkill /PID <pid> /F

# Frontend (19000)
npx expo start --clear
```

---

## 🌟 Next Steps After Setup

1. ✅ Run `python complete_setup.py`
2. ✅ Setup backend virtual environment
3. ✅ Install frontend dependencies
4. ⏳ Install PostgreSQL and create database
5. ⏳ Configure `.env` with your API keys
6. ⏳ Setup Firebase project
7. ⏳ Setup Stripe account
8. ⏳ Review `docs/AGENTS.md` roadmap
9. ⏳ Start building features!

---

**Ready to build the future of driving school booking in South Africa! 🚗🇿🇦**

Questions? Check the `docs/` folder for detailed documentation.

---

Last Updated: 2025-12-11 | Version: 1.0.0-alpha
