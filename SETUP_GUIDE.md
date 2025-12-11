# Drive Alive - Complete Setup Guide

## Step 1: Create Directory Structure

Run the Python script to create all necessary directories:

```bash
cd C:\Projects\DRIVE_ALIVE
python create_dirs.py
```

This will create the complete folder structure for frontend, backend, docs, config, and tests.

---

## Step 2: Backend Setup (FastAPI + Python)

### 2.1 Create Virtual Environment
```bash
cd backend
python -m venv venv
```

### 2.2 Activate Virtual Environment
**Windows:**
```bash
venv\Scripts\activate
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

### 2.3 Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 2.4 Configure Environment
```bash
cd ..\config
copy .env.example .env
```

Edit `.env` with your actual credentials (database, API keys, etc.)

### 2.5 Run Backend Development Server
```bash
cd ..\backend
uvicorn app.main:app --reload
```

Backend will be available at: `http://localhost:8000`
API docs at: `http://localhost:8000/api/docs`

---

## Step 3: Frontend Setup (React Native + Expo)

### 3.1 Install Node Dependencies
```bash
cd frontend
npm install
```

### 3.2 Start Expo Development Server
```bash
npx expo start
```

This will open Expo Dev Tools in your browser.

### 3.3 Run on Device/Emulator
- Press `a` for Android emulator
- Press `i` for iOS simulator (Mac only)
- Press `w` for web browser
- Scan QR code with Expo Go app on your phone

---

## Step 4: Database Setup (PostgreSQL)

### 4.1 Install PostgreSQL
Download from: https://www.postgresql.org/download/

### 4.2 Create Database
```sql
CREATE DATABASE drivealive;
CREATE USER drivealive_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE drivealive TO drivealive_user;
```

### 4.3 Run Migrations (Coming Soon)
```bash
cd backend
alembic upgrade head
```

---

## Step 5: Redis Setup (for Background Tasks)

### 5.1 Install Redis
**Windows:** Download from https://github.com/microsoftarchive/redis/releases
**Linux:** `sudo apt-get install redis-server`
**Mac:** `brew install redis`

### 5.2 Start Redis Server
```bash
redis-server
```

### 5.3 Start Celery Worker
```bash
cd backend
celery -A app.celery_app worker --loglevel=info
```

---

## Step 6: VS Code Setup

### 6.1 Open Workspace
Open `DRIVE_ALIVE.code-workspace` in VS Code

### 6.2 Install Recommended Extensions
VS Code will prompt you to install recommended extensions. Click "Install All".

Required extensions:
- Python
- Pylance
- Black Formatter
- ESLint
- Prettier
- Expo Tools
- React Native Tools
- GitHub Copilot (optional)

### 6.3 Configure Python Interpreter
1. Open Command Palette (Ctrl+Shift+P)
2. Type "Python: Select Interpreter"
3. Choose: `.\backend\venv\Scripts\python.exe`

---

## Step 7: Testing

### Backend Tests
```bash
cd backend
pytest -v --cov=app
```

### Frontend Tests
```bash
cd frontend
npm test
```

---

## Step 8: Running Full Stack

### Option 1: VS Code (Recommended)
1. Open `DRIVE_ALIVE.code-workspace`
2. Press F5
3. Select "Full Stack" configuration
4. Both backend and frontend will start

### Option 2: Manual
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

## Project Structure Overview

```
C:\Projects\DRIVE_ALIVE\
├── frontend/              # React Native + Expo (mobile/web)
│   ├── assets/           # Images, icons, fonts
│   ├── components/       # Reusable UI components
│   ├── screens/          # App screens
│   ├── navigation/       # Navigation setup
│   ├── services/         # API calls
│   ├── utils/            # Helper functions
│   ├── App.js            # Entry point
│   └── package.json      # Dependencies
│
├── backend/              # FastAPI Python backend
│   ├── app/
│   │   ├── models/       # Database models
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Business logic
│   │   └── main.py       # FastAPI entry
│   ├── requirements.txt  # Python dependencies
│   └── venv/             # Virtual environment
│
├── docs/                 # Documentation
│   ├── AGENTS.md         # Team roles & todos
│   ├── API.md            # API documentation
│   └── ARCHITECTURE.md   # System design
│
├── config/               # Configuration
│   ├── .env              # Environment variables
│   └── .env.example      # Template
│
├── tests/                # Testing
│   ├── frontend/         # Frontend tests
│   └── backend/          # Backend tests
│
├── .vscode/              # VS Code workspace
│   ├── settings.json     # Editor settings
│   ├── launch.json       # Debug configs
│   ├── tasks.json        # Build tasks
│   └── extensions.json   # Recommended extensions
│
├── .github/              # GitHub Actions
│   └── workflows/        # CI/CD pipelines
│
├── DRIVE_ALIVE.code-workspace  # VS Code workspace file
├── README.md             # Project overview
├── .gitignore            # Git ignore patterns
└── SETUP_GUIDE.md        # This file
```

---

## Common Issues & Troubleshooting

### Python Virtual Environment Not Activating
**Windows:**
```bash
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Expo Won't Start
```bash
npm cache clean --force
rm -rf node_modules
npm install
npx expo start --clear
```

### Database Connection Failed
- Check PostgreSQL is running
- Verify credentials in `.env`
- Ensure database exists: `psql -U postgres -l`

### Redis Connection Failed
- Check Redis is running: `redis-cli ping`
- Should return: `PONG`

### Port Already in Use
**Backend (8000):**
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <pid> /F

# Linux/Mac
lsof -ti:8000 | xargs kill
```

**Frontend (19000/19001):**
```bash
# Kill Expo process
npx expo start --clear
```

---

## Next Steps

1. ✅ Complete directory structure setup
2. ✅ Install backend dependencies
3. ✅ Install frontend dependencies
4. ⏳ Setup PostgreSQL database
5. ⏳ Configure environment variables
6. ⏳ Implement authentication (Firebase)
7. ⏳ Create database models
8. ⏳ Build API endpoints
9. ⏳ Design mobile UI screens
10. ⏳ Integrate payment gateway

See `docs/AGENTS.md` for detailed feature roadmap and team responsibilities.

---

## Resources

- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **React Native Docs**: https://reactnative.dev/
- **Expo Docs**: https://docs.expo.dev/
- **SQLAlchemy Docs**: https://docs.sqlalchemy.org/
- **Stripe Docs**: https://stripe.com/docs
- **Firebase Docs**: https://firebase.google.com/docs

---

## Support

For issues or questions:
1. Check `docs/` folder for detailed documentation
2. Review troubleshooting section above
3. Create GitHub issue
4. Contact development team

---

**Drive Alive Team** | Building the future of driving school booking in South Africa 🚗🇿🇦
