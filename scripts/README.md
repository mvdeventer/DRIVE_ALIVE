# Launch Scripts for Driving School App

This directory contains convenient batch scripts to launch and manage the application.

## 🚀 Quick Start Scripts

### `start-all.bat` ⭐ (Recommended)
**Starts both backend and frontend in separate windows**
- Opens two terminal windows automatically
- Backend runs on port 8000
- Frontend runs on port 19006
- Best for development

**Usage:**
```
Double-click start-all.bat
```
Or from command line:
```
scripts\start-all.bat
```

### `start-backend.bat`
**Starts only the backend FastAPI server**
- Runs on http://localhost:8000
- API docs at http://localhost:8000/docs
- Checks for .env file
- Uses virtual environment automatically

### `start-frontend.bat`
**Starts only the frontend Expo dev server**
- Runs on http://localhost:19006
- Opens Expo DevTools
- Auto-installs dependencies if needed
- Press 'w' to open in web browser

## 🔧 Utility Scripts

### `install-dependencies.bat`
**Installs all required dependencies**
- Checks Python and Node.js installation
- Creates virtual environment
- Installs Python packages
- Installs npm packages
- Run this first if setting up project

### `setup-database.bat`
**Creates PostgreSQL database**
- Creates 'driving_school_db' database
- Checks if PostgreSQL is installed
- Provides connection string
- Run after installing PostgreSQL

### `open-api-docs.bat`
**Opens API documentation in browser**
- Opens http://localhost:8000/docs
- Backend must be running first

### `open-frontend.bat`
**Opens frontend in browser**
- Opens http://localhost:19006
- Frontend must be running first

## 📋 Setup Workflow

For first-time setup, run scripts in this order:

```
1. install-dependencies.bat    # Install Python & npm packages
2. setup-database.bat          # Create PostgreSQL database
3. Edit backend\.env           # Configure environment
4. start-all.bat               # Launch application
```

## 🛠️ Development Workflow

For daily development:

```
1. start-all.bat               # Start both servers
2. Code your changes
3. Servers auto-reload on save
4. Close terminal windows when done
```

## 📝 Notes

- **Virtual Environment**: All scripts use `.venv` automatically
- **Auto-reload**: Backend and frontend reload on file changes
- **Port Numbers**:
  - Backend: 8000
  - Frontend: 19006 (Expo), 19000 (Metro)
- **Stopping Servers**: Close terminal windows or press Ctrl+C

## 🔍 Troubleshooting

### Backend won't start?
1. Check `.venv` exists: `dir .venv`
2. Check .env file exists: `dir backend\.env`
3. Run `install-dependencies.bat` again

### Frontend won't start?
1. Delete `frontend\node_modules`
2. Run `start-frontend.bat` (auto-installs)
3. Or manually: `cd frontend && npm install`

### Database errors?
1. Check PostgreSQL is installed: `psql --version`
2. Run `setup-database.bat`
3. Update `backend\.env` with correct DATABASE_URL

### Port already in use?
- Backend: Edit `start-backend.bat`, add `--port 8001`
- Frontend: Edit `start-frontend.bat`, add `-- --port 19001`

## 💡 Tips

- **Multiple Instances**: You can run multiple backends on different ports
- **Background Running**: Minimize terminal windows, don't close them
- **Logs**: Check terminal windows for errors and logs
- **API Testing**: Use http://localhost:8000/docs for testing endpoints

## 🔗 Quick Links

When servers are running:

- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- Frontend Web: http://localhost:19006
- Alternative API Docs: http://localhost:8000/redoc

## 📞 Support

If scripts don't work:
1. Check you're in project root directory
2. Ensure Python 3.10+ and Node.js 18+ installed
3. Run as Administrator if permission errors
4. Check firewall allows localhost connections
