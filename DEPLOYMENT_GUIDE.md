# Drive Alive - Deployment & Packaging Guide

## Overview

This guide covers building, packaging, and deploying the Drive Alive application as a complete Windows installer package.

---

## Table of Contents

1. [Version Management](#version-management)
2. [Building the Installer](#building-the-installer)
3. [Development Workflow](#development-workflow)
4. [Production Deployment](#production-deployment)
5. [Server Requirements](#server-requirements)
6. [Troubleshooting](#troubleshooting)

---

## Version Management

Drive Alive uses a centralized version management system that automatically updates version numbers across all project files.

### Version Files

- `VERSION` - Plain text version number (e.g., `1.0.0`)
- `version.json` - JSON version metadata
- `frontend/package.json` - Frontend package version
- `backend/app/__init__.py` - Backend module version

### Version Commands

```bash
# Get current version
drive-alive.bat version get

# Increment major version (1.0.0 -> 2.0.0)
drive-alive.bat version major

# Increment minor version (1.0.0 -> 1.1.0)
drive-alive.bat version minor

# Increment patch version (1.0.0 -> 1.0.1)
drive-alive.bat version patch

# Set specific version
drive-alive.bat version set 2.1.3
```

### Git Integration

Version management is integrated with Git workflows:

```bash
# Commit with automatic patch version increment
drive-alive.bat commit -m "fix: bug fix" --patch

# Commit with minor version increment
drive-alive.bat commit -m "feat: new feature" --minor

# Commit with major version increment (breaking changes)
drive-alive.bat commit -m "feat!: breaking change" --major
```

When using version flags, the system:

1. Increments the version number
2. Updates all version files
3. Creates a Git commit
4. Creates a Git tag (e.g., `v1.2.3`)
5. Optionally pushes to remote (including tags)

---

## Building the Installer

### Prerequisites

Install the following tools:

1. **Python 3.9+** - Backend runtime

   - Download: https://www.python.org/downloads/

2. **Node.js 18+** - Frontend tooling

   - Download: https://nodejs.org/

3. **Inno Setup** - Windows installer creator

   - Download: https://jrsoftware.org/isinfo.php
   - Required for creating `.exe` installers

4. **PyInstaller** - Python executable packager
   - Installed automatically by build script

### Build Process

#### Quick Build

```bash
# Build complete installer
drive-alive.bat build-installer
```

This will:

- Build backend executable (`drive-alive-api.exe`)
- Build frontend web bundle
- Create Windows installer (`DriveAlive-Setup-{VERSION}.exe`)

#### Manual Build Steps

If you prefer manual control:

```bash
# 1. Build backend executable
cd backend
venv\Scripts\activate
pyinstaller drive-alive.spec --clean --noconfirm

# 2. Build frontend web bundle
cd ..\frontend
npx expo export:web

# 3. Create installer (if Inno Setup installed)
cd ..\scripts
iscc installer.iss /DAPP_VERSION=1.0.0
```

### Build Output

```
dist/
├── DriveAlive-Setup-1.0.0.exe    # Windows installer
backend/dist/
├── drive-alive-api.exe            # Standalone backend
frontend/web-build/
├── index.html                     # Frontend web app
├── static/
└── ...
```

---

## Development Workflow

### Typical Development Cycle

1. **Start Development Servers**

   ```bash
   drive-alive.bat start
   ```

2. **Make Changes**

   - Edit backend code in `backend/app/`
   - Edit frontend code in `frontend/screens/` or `frontend/components/`

3. **Test Changes**

   ```bash
   drive-alive.bat test
   ```

4. **Commit Changes**

   ```bash
   # For bug fixes (patch version)
   drive-alive.bat commit -m "fix: resolved booking conflict bug" --patch

   # For new features (minor version)
   drive-alive.bat commit -m "feat: added SMS notifications" --minor

   # For breaking changes (major version)
   drive-alive.bat commit -m "feat!: redesigned booking API" --major
   ```

5. **Build Installer (Release)**

   ```bash
   # Build installer with current version
   drive-alive.bat build-installer
   ```

6. **Test Installer**

   - Run `dist\DriveAlive-Setup-{VERSION}.exe`
   - Test on clean Windows VM
   - Verify all features work

7. **Create GitHub Release**
   ```bash
   drive-alive.bat release --minor
   # Or specify version:
   drive-alive.bat release -v v2.0.0
   ```

---

## Production Deployment

### Windows Server Deployment

#### Option 1: Using Installer (Recommended)

1. Copy `DriveAlive-Setup-{VERSION}.exe` to server
2. Run installer as Administrator
3. Follow installation wizard
4. Configure database location
5. Start Drive Alive API service

#### Option 2: Manual Deployment

1. **Copy Files**

   ```bash
   # Backend
   xcopy backend\dist\drive-alive-api.exe C:\DriveAlive\backend\

   # Frontend
   xcopy frontend\web-build\* C:\DriveAlive\frontend\ /E /I

   # Config
   copy VERSION C:\DriveAlive\
   copy version.json C:\DriveAlive\
   ```

2. **Set Environment Variables**

   ```powershell
   [Environment]::SetEnvironmentVariable("DRIVE_ALIVE_DATA", "C:\DriveAlive\data", "Machine")
   [Environment]::SetEnvironmentVariable("DRIVE_ALIVE_DB", "postgresql://user:pass@localhost/drivedb", "Machine")
   ```

3. **Configure Database**

   - Setup PostgreSQL database
   - Run migrations (if needed)

4. **Setup Web Server**

   - Configure IIS or Nginx to serve `C:\DriveAlive\frontend\`
   - Proxy API requests to backend (default: `http://localhost:8000`)

5. **Run Backend**

   ```bash
   C:\DriveAlive\backend\drive-alive-api.exe
   ```

6. **Setup as Windows Service** (Optional)
   ```powershell
   # Using NSSM (Non-Sucking Service Manager)
   nssm install DriveAliveAPI C:\DriveAlive\backend\drive-alive-api.exe
   nssm start DriveAliveAPI
   ```

### Linux Server Deployment (Docker)

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t drive-alive-backend ./backend
docker run -d -p 8000:8000 drive-alive-backend
```

---

## Server Requirements

### Minimum Requirements

- **OS**: Windows Server 2016+ or Windows 10+
- **CPU**: 2 cores
- **RAM**: 4 GB
- **Disk**: 10 GB free space
- **Database**: PostgreSQL 12+

### Recommended Requirements

- **OS**: Windows Server 2019+ or Windows 11
- **CPU**: 4+ cores
- **RAM**: 8+ GB
- **Disk**: 50+ GB SSD
- **Database**: PostgreSQL 14+ (separate server)

### Network Requirements

- **Backend Port**: 8000 (configurable)
- **Frontend Port**: 80/443 (HTTP/HTTPS)
- **Database Port**: 5432 (PostgreSQL)
- **Outbound**: HTTPS access for payment gateways (Stripe, PayFast)

---

## Installer Features

The Windows installer provides:

- ✅ Automatic dependency checking
- ✅ Custom database location selection
- ✅ Environment variable configuration
- ✅ Desktop and Start Menu shortcuts
- ✅ Optional auto-start on boot
- ✅ Clean uninstall with data cleanup option
- ✅ Registry integration
- ✅ Version tracking

### Installer Options

During installation, you can configure:

1. **Installation Directory** (default: `C:\Program Files\Drive Alive`)
2. **Data Directory** (default: `C:\ProgramData\Drive Alive`)
3. **Desktop Shortcut** (optional)
4. **Auto-start on Boot** (optional)

### Uninstallation

The uninstaller will:

1. Stop any running services
2. Remove installed files
3. Optionally delete user data (confirmation required)
4. Clean up registry entries
5. Remove shortcuts

---

## Troubleshooting

### Build Issues

#### PyInstaller Errors

**Problem**: `ModuleNotFoundError` during build

**Solution**:

```bash
# Ensure virtual environment is activated
cd backend
venv\Scripts\activate

# Reinstall dependencies
pip install -r requirements.txt

# Clear PyInstaller cache
pyinstaller --clean drive-alive.spec
```

#### Expo Build Errors

**Problem**: `expo export:web` fails

**Solution**:

```bash
cd frontend

# Clear cache
npx expo start -c

# Reinstall dependencies
rm -rf node_modules
npm install

# Build again
npx expo export:web
```

### Version Management Issues

#### Git Tag Conflicts

**Problem**: "Tag already exists"

**Solution**:

```bash
# Delete local tag
git tag -d v1.0.0

# Delete remote tag
git push origin :refs/tags/v1.0.0

# Recreate tag
drive-alive.bat version set 1.0.0
git tag -a v1.0.0 -m "Version 1.0.0"
git push origin v1.0.0
```

#### Version File Sync Issues

**Problem**: Version files out of sync

**Solution**:

```bash
# Get current git tag version
git describe --tags --abbrev=0

# Update all files to match
drive-alive.bat version set 1.2.3
```

### Installer Issues

#### Inno Setup Not Found

**Problem**: "iscc not found"

**Solution**:

- Install Inno Setup from https://jrsoftware.org/isinfo.php
- Add to PATH: `C:\Program Files (x86)\Inno Setup 6\`
- Restart command prompt

#### Missing Dependencies

**Problem**: Installer runs but app doesn't start

**Solution**:

- Check Windows Event Viewer for errors
- Verify database connection string
- Ensure PostgreSQL is running
- Check environment variables

---

## Release Checklist

Before releasing a new version:

- [ ] All tests pass (`drive-alive.bat test`)
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] Version number incremented appropriately
- [ ] Changelog updated
- [ ] Build installer successfully
- [ ] Test installer on clean VM
- [ ] Verify database migrations work
- [ ] Check payment gateway integration
- [ ] Test on production-like environment
- [ ] Create Git tag
- [ ] Push to GitHub
- [ ] Create GitHub Release
- [ ] Upload installer to release
- [ ] Notify stakeholders

---

## Continuous Deployment

### GitHub Actions (Future)

Automate builds with GitHub Actions:

```yaml
# .github/workflows/release.yml
name: Build and Release
on:
  push:
    tags:
      - "v*"
jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build Installer
        run: scripts\build-installer.bat
      - name: Upload Release
        uses: softprops/action-gh-release@v1
        with:
          files: dist\*.exe
```

---

## Support

For deployment assistance:

- Email: support@drivealive.co.za
- Documentation: See `README.md` and `QUICK_START.md`
- Issues: https://github.com/mvdeventer/DRIVE_ALIVE/issues

---

## License

See [LICENSE](LICENSE) for details.
