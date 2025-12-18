# Drive Alive - Driving School Booking App

Professional driving school booking application for South Africa, built with React Native (Expo) and FastAPI.

## 🏗️ Project Structure

```
DRIVE_ALIVE/
├── backend/               # FastAPI Python backend
│   ├── app/
│   │   ├── main.py       # Application entry point
│   │   ├── config.py     # Configuration
│   │   ├── database.py   # Database setup
│   │   ├── models/       # SQLAlchemy models
│   │   ├── routes/       # API endpoints
│   │   ├── schemas/      # Pydantic schemas
│   │   └── services/     # Business logic
│   ├── tests/            # Backend tests
│   └── requirements.txt  # Python dependencies
│
├── frontend/             # React Native (Expo) mobile app
│   ├── screens/          # App screens
│   ├── components/       # Reusable components
│   ├── services/         # API & location services
│   ├── navigation/       # Navigation setup
│   └── package.json      # Node dependencies
│
├── .vscode/              # VS Code workspace configuration
│   ├── settings.json     # Workspace settings
│   ├── tasks.json        # Build & run tasks
│   ├── launch.json       # Debug configurations
│   └── extensions.json   # Recommended extensions
│
├── .github/              # GitHub workflows & instructions
├── AGENTS.md             # Team roles & todo list
├── CONTRIBUTING.md       # Contribution guidelines
├── LICENSE               # Project license
└── README.md             # This file
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.9+** (for backend)
- **Node.js 18+** & **npm** (for frontend)
- **Git** (for version control)
- **VS Code** (recommended IDE)

### 1. Clone & Open Project

```bash
git clone <your-repo-url>
cd DRIVE_ALIVE
code DRIVE_ALIVE.code-workspace
```

### 2. Automatic Setup (Recommended)

When you open the workspace in VS Code:

1. Install recommended extensions when prompted
2. Open the Command Palette (`Ctrl+Shift+P`)
3. Run: `Tasks: Run Task` → `Full Project Setup`

This will:

- Create Python virtual environment
- Install backend dependencies
- Install frontend dependencies

### 3. Manual Setup (Alternative)

#### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # On Windows
pip install -r requirements.txt
```

#### Frontend Setup

```bash
cd frontend
npm install
```

## 🎯 Development

### Running the Project

#### Using VS Code Tasks (Recommended)

- Press `Ctrl+Shift+P` → `Tasks: Run Task`
- Choose:
  - `Start Backend Server` - FastAPI server on http://localhost:8000
  - `Start Expo Dev Server` - Expo dev server

#### Using VS Code Debugger

- Press `F5` or click "Run and Debug"
- Select: `Full Stack: Frontend + Backend`

#### Manual Commands

**Backend:**

```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload
```

**Frontend:**

```bash
cd frontend
npx expo start
```

## 🧪 Testing

### Backend Tests

```bash
cd backend
venv\Scripts\activate
pytest -v
```

### Using VS Code

- Open Command Palette (`Ctrl+Shift+P`)
- Run: `Tasks: Run Task` → `Run Backend Tests`

## 📦 Project Features

### Phase 1: MVP ✅

- ✅ User registration & authentication
- ✅ Instructor GPS location & availability
- ✅ Student booking system
- ✅ Payment integration (Stripe/PayFast)
- ✅ Cancellation policy enforcement

### Phase 2: Core Features (In Progress)

- ⏳ WhatsApp reminders
- ⏳ Push notifications
- ⏳ Instructor/student dashboards
- ⏳ Web support

### Phase 3: Advanced Features (Planned)

- 📋 Live lesson tracking
- 📋 Lesson packages
- 📋 Certification tracking
- 📋 Multi-language support
- 📋 Analytics

## 🛠️ Tech Stack

### Backend

- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM
- **PostgreSQL** - Database
- **Uvicorn** - ASGI server
- **pytest** - Testing

### Frontend

- **React Native** - Mobile framework
- **Expo** - React Native toolchain
- **React Navigation** - Navigation
- **Axios** - HTTP client
- **Expo Location** - GPS services

## 📝 VS Code Features

This workspace is configured with:

### Automatic Python Virtual Environment

- Activates automatically when you open a terminal
- Pre-configured Python interpreter path
- Integrated terminal environment variables

### Code Formatting

- Python: Black formatter (on save)
- JavaScript/TypeScript: Prettier (on save)
- Auto-organize imports

### Debugging

- Pre-configured launch configurations
- FastAPI debugging
- Expo app debugging
- Compound debugging (run both together)

### Tasks

- One-click backend/frontend startup
- Automated testing
- Project setup automation

### Recommended Extensions

- Python language support
- ESLint & Prettier
- Expo Tools
- React Native Tools
- GitLens

## 🔧 Configuration Files

| File                      | Purpose                       |
| ------------------------- | ----------------------------- |
| `.vscode/settings.json`   | Workspace-specific settings   |
| `.vscode/tasks.json`      | Build and run tasks           |
| `.vscode/launch.json`     | Debug configurations          |
| `.vscode/extensions.json` | Recommended extensions        |
| `backend/.env`            | Backend environment variables |
| `frontend/config.ts`      | Frontend configuration        |

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

See [LICENSE](LICENSE) file.

## 🆘 Troubleshooting

### Python Virtual Environment Not Activating

1. Open Command Palette (`Ctrl+Shift+P`)
2. Run: `Python: Select Interpreter`
3. Choose: `backend/venv/Scripts/python.exe`

### Expo Not Starting

```bash
cd frontend
npx expo start --clear
```

### Port Already in Use

- Backend (8000): Check if another FastAPI instance is running
- Frontend: Expo will automatically assign a different port

### Dependencies Issues

```bash
# Backend
cd backend
pip install --upgrade pip
pip install -r requirements.txt

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## 📞 Support

For issues and questions:

- Check [AGENTS.md](AGENTS.md) for team roles
- Open an issue on GitHub
- Contact the development team

---

**Happy Coding! 🚗💨**
