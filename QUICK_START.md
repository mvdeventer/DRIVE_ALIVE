# 🚀 Drive Alive - Quick Start Guide

## One-Command Setup & Start

```bash
# 1. Check if everything is ready
scripts\drive-alive.bat check

# 2. Install all dependencies (if needed)
scripts\drive-alive.bat install

# 3. Start development servers
scripts\drive-alive.bat start
```

That's it! Your backend and frontend will start, and browsers will open automatically.

---

## 📋 Common Commands

```bash
# Development
scripts\drive-alive.bat start              # Start both servers + open browsers
scripts\drive-alive.bat start -b           # Start backend only
scripts\drive-alive.bat start -f           # Start frontend only
scripts\drive-alive.bat stop               # Stop all servers
scripts\drive-alive.bat restart            # Restart all servers

# Dependencies & Testing
scripts\drive-alive.bat check              # Check all dependencies
scripts\drive-alive.bat install            # Install all dependencies
scripts\drive-alive.bat test               # Run all tests
scripts\drive-alive.bat test -b            # Test backend only

# Git Operations (requires GitHub CLI)
scripts\drive-alive.bat commit -m "message"        # Commit changes
scripts\drive-alive.bat release -v v1.0.0          # Create release
scripts\drive-alive.bat status                      # Show Git status

# Build
scripts\drive-alive.bat build              # Dry-run production build
```

---

## 🌐 Access Points

Once servers are running:

| Service               | URL                        | Description              |
| --------------------- | -------------------------- | ------------------------ |
| **Backend API**       | http://localhost:8000      | FastAPI backend server   |
| **API Documentation** | http://localhost:8000/docs | Interactive Swagger docs |
| **Frontend**          | http://localhost:19000     | Expo development server  |
| **Expo DevTools**     | Opens automatically        | Mobile app controls      |

---

## 🆘 Troubleshooting

### Dependencies not installed?

```bash
scripts\drive-alive.bat check              # See what's missing
scripts\drive-alive.bat install            # Install everything
```

### Servers won't start?

```bash
scripts\drive-alive.bat stop               # Stop any hanging processes
scripts\drive-alive.bat start              # Start fresh
```

### Port already in use?

```bash
scripts\drive-alive.bat start --port 8080  # Use different backend port
```

### Need help?

```bash
scripts\drive-alive.bat help               # Show all commands
```

---

## 📚 Full Documentation

- **Complete Guide:** [README.md](README.md)
- **Script Details:** [scripts/README.md](scripts/README.md)
- **Setup Instructions:** [SETUP_COMPLETE.md](SETUP_COMPLETE.md)
- **Team Structure:** [AGENTS.md](AGENTS.md)

---

## ⚡ Pro Tips

1. **First time?** Run `scripts\drive-alive.bat check` to verify setup
2. **Need to test?** Run `scripts\drive-alive.bat test` before committing
3. **Committing code?** Use `scripts\drive-alive.bat commit -m "message"`
4. **Clean shutdown?** Always use `scripts\drive-alive.bat stop`

---

**Happy Coding! 🚗💨**
