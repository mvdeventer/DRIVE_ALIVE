# Drive Alive - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Python 3.11+ installed
- Node.js 18+ and npm installed
- VS Code installed (recommended)
- Git installed

---

## Step 1: Create Directory Structure (30 seconds)

```bash
cd C:\Projects\DRIVE_ALIVE
python create_dirs.py
```

This creates all folders for frontend, backend, docs, config, and tests.

---

## Step 2: Create Configuration Files (10 seconds)

```bash
python setup_files.py
```

This creates all necessary README files and Python `__init__.py` files.

---

## Step 3: Backend Setup (2 minutes)

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

---

## Step 4: Frontend Setup (2 minutes)

```bash
cd frontend
npm install
```

---

## Step 5: Configure Environment (1 minute)

```bash
cd config
copy .env.example .env
```

Edit `.env` with your settings (database, API keys, etc.)

---

## Step 6: Open in VS Code

```bash
code DRIVE_ALIVE.code-workspace
```

VS Code will:
- Load the multi-root workspace
- Prompt to install recommended extensions
- Configure Python interpreter automatically
- Setup formatters (Black, Prettier, ESLint)

---

## Step 7: Run the Application

### Option A: VS Code (Easiest)
1. Press `F5`
2. Select "Full Stack" from dropdown
3. Both backend and frontend will start automatically

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

## 🎉 You're Ready!

- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/api/docs
- **Frontend**: Expo Dev Tools will open in browser

---

## File Structure Created

```
DRIVE_ALIVE/
├── 📱 frontend/          # React Native + Expo
├── ⚙️  backend/          # FastAPI + Python
├── 📚 docs/             # Documentation
├── 🔧 config/           # Environment files
├── 🧪 tests/            # Test suites
├── .vscode/            # VS Code config
├── .github/            # CI/CD workflows
└── DRIVE_ALIVE.code-workspace
```

---

## What's Included

### Backend (FastAPI)
- ✅ FastAPI app with CORS
- ✅ SQLAlchemy ORM setup
- ✅ Celery + Redis background tasks
- ✅ Stripe/PayFast payment integration
- ✅ WhatsApp Business API (Twilio)
- ✅ JWT authentication
- ✅ PostgreSQL database support
- ✅ Pytest testing framework

### Frontend (React Native + Expo)
- ✅ Expo 50 + React Native 0.73
- ✅ React Navigation configured
- ✅ Expo Location for GPS
- ✅ React Native Maps
- ✅ Stripe React Native
- ✅ Firebase authentication
- ✅ Axios for API calls
- ✅ React Native Paper UI
- ✅ Jest testing framework

### VS Code Configuration
- ✅ Multi-root workspace
- ✅ Python virtual environment auto-detection
- ✅ Auto-formatting (Black, Prettier)
- ✅ Linting (Flake8, ESLint)
- ✅ Debugging configurations
- ✅ Build tasks
- ✅ Extension recommendations

---

## Next Steps

1. **Setup Database**: Install PostgreSQL and create `drivealive` database
2. **Configure Firebase**: Add Firebase project credentials to `.env`
3. **Setup Stripe**: Add Stripe API keys to `.env`
4. **Build Features**: See `docs/AGENTS.md` for development roadmap

---

## Need Help?

- 📖 **Full Setup Guide**: See `SETUP_GUIDE.md`
- 🏗️ **Architecture**: See `docs/ARCHITECTURE.md`
- 📋 **API Docs**: See `docs/API.md`
- 👥 **Team Guide**: See `docs/AGENTS.md`

---

## Troubleshooting

### Virtual Environment Won't Activate (Windows)
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### npm Install Fails
```bash
npm cache clean --force
npm install
```

### Python Dependencies Fail
```bash
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

---

**Ready to build the future of driving school booking in South Africa! 🚗🇿🇦**
