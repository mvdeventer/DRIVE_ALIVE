# Drive Alive - Packaging Reference

## Quick Reference

### Build Commands

```bash
# Get current version
drive-alive.bat version get

# Increment version
drive-alive.bat version patch    # 1.0.0 -> 1.0.1
drive-alive.bat version minor    # 1.0.0 -> 1.1.0
drive-alive.bat version major    # 1.0.0 -> 2.0.0

# Set specific version
drive-alive.bat version set 2.1.3

# Build installer
drive-alive.bat build-installer

# Commit with version bump
drive-alive.bat commit -m "fix: bug fix" --patch
drive-alive.bat commit -m "feat: new feature" --minor
drive-alive.bat commit -m "feat!: breaking change" --major
```

---

## File Structure

### Version Files

| File                      | Purpose               | Format                    |
| ------------------------- | --------------------- | ------------------------- |
| `VERSION`                 | Plain text version    | `1.0.0`                   |
| `version.json`            | Version metadata      | JSON with date/build      |
| `frontend/package.json`   | NPM package version   | JSON `"version": "1.0.0"` |
| `backend/app/__init__.py` | Python module version | `__version__ = "1.0.0"`   |

### Build Output

```
Drive Alive/
├── VERSION                           # Version file
├── version.json                      # Version metadata
├── backend/
│   ├── drive-alive.spec             # PyInstaller spec
│   ├── setup.py                     # Python package setup
│   └── dist/
│       └── drive-alive-api.exe      # Backend executable
├── frontend/
│   └── web-build/                   # Frontend web bundle
│       ├── index.html
│       └── static/
├── scripts/
│   ├── version-manager.bat          # Version management
│   ├── build-installer.bat          # Build script
│   └── installer.iss                # Inno Setup script
└── dist/
    └── DriveAlive-Setup-1.0.0.exe   # Final installer
```

---

## PyInstaller Spec File

### Key Configuration

**File**: `backend/drive-alive.spec`

```python
# Main executable settings
exe = EXE(
    name='drive-alive-api',           # Output name
    debug=False,                      # No debug console
    console=True,                     # Show console window
    upx=True,                         # Compress with UPX
    icon='../image/logo.ico',         # App icon
)

# Hidden imports (auto-detected modules)
hiddenimports = [
    'uvicorn.logging',
    'uvicorn.loops.auto',
    'sqlalchemy.ext.asyncio',
    'passlib.handlers.bcrypt',
    'stripe',
]

# Data files to include
datas = [
    ('../VERSION', '.'),
    ('../version.json', '.'),
    ('app', 'app'),
]
```

### Build Process

```bash
cd backend
venv\Scripts\activate
pyinstaller drive-alive.spec --clean --noconfirm
```

**Output**: `backend\dist\drive-alive-api.exe`

---

## Inno Setup Installer

### Key Configuration

**File**: `scripts/installer.iss`

```ini
[Setup]
AppName=Drive Alive
AppVersion={#APP_VERSION}
DefaultDirName={autopf}\Drive Alive
OutputDir=..\dist
OutputBaseFilename=DriveAlive-Setup-{#APP_VERSION}
Compression=lzma2/max
ArchitecturesAllowed=x64

[Files]
Source: "..\backend\dist\drive-alive-api.exe"; DestDir: "{app}\backend"
Source: "..\frontend\web-build\*"; DestDir: "{app}\frontend"; Flags: recursesubdirs

[Icons]
Name: "{group}\Drive Alive"; Filename: "{app}\drive-alive-api.exe"
Name: "{autodesktop}\Drive Alive"; Filename: "{app}\drive-alive-api.exe"
```

### Build Process

```bash
cd scripts
iscc installer.iss /DAPP_VERSION=1.0.0
```

**Output**: `dist\DriveAlive-Setup-1.0.0.exe`

---

## Version Management

### Semantic Versioning

Format: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (incompatible API changes)
- **MINOR**: New features (backwards-compatible)
- **PATCH**: Bug fixes (backwards-compatible)

### Examples

| Change Type      | Command             | Example       |
| ---------------- | ------------------- | ------------- |
| Bug fix          | `version patch`     | 1.0.0 → 1.0.1 |
| New feature      | `version minor`     | 1.0.0 → 1.1.0 |
| Breaking change  | `version major`     | 1.0.0 → 2.0.0 |
| Specific version | `version set 2.1.3` | any → 2.1.3   |

### Git Tags

Version changes automatically create git tags:

```bash
# Version 1.2.3 creates tag: v1.2.3
drive-alive.bat version set 1.2.3

# View tags
git tag

# Push tags
git push --tags
```

---

## Build Automation

### Complete Build Workflow

```bash
# 1. Start development
drive-alive.bat start

# 2. Make changes
# ... edit code ...

# 3. Test
drive-alive.bat test

# 4. Commit with version bump
drive-alive.bat commit -m "feat: added feature X" --minor

# 5. Build installer
drive-alive.bat build-installer

# 6. Test installer
.\dist\DriveAlive-Setup-1.1.0.exe

# 7. Create GitHub release
drive-alive.bat release --minor
```

### Build Script Breakdown

**File**: `scripts/build-installer.bat`

#### Step 1: Build Backend

```batch
cd backend
venv\Scripts\activate
pyinstaller drive-alive.spec --clean --noconfirm
```

#### Step 2: Build Frontend

```batch
cd frontend
npx expo export:web
```

#### Step 3: Create Installer

```batch
cd scripts
iscc installer.iss /DAPP_VERSION=%VERSION%
```

---

## Dependencies

### Backend Dependencies

Packaged in `drive-alive-api.exe`:

- Python 3.9+ runtime
- FastAPI framework
- SQLAlchemy ORM
- Uvicorn ASGI server
- Pydantic validation
- Passlib encryption
- PyJWT tokens
- Stripe SDK
- All `requirements.txt` packages

### Frontend Dependencies

Bundled in `web-build/`:

- React Native Web
- Expo SDK
- React Navigation
- AsyncStorage
- All `package.json` dependencies

### Installer Dependencies

**Required for building**:

- PyInstaller (`pip install pyinstaller`)
- Inno Setup (download from website)

**Not required for end users**:

- Backend: All dependencies bundled
- Frontend: All dependencies bundled
- Installer: Self-contained `.exe`

---

## Environment Variables

### Build-time Variables

Set during build process:

| Variable       | Description         | Example      |
| -------------- | ------------------- | ------------ |
| `APP_VERSION`  | Application version | `1.0.0`      |
| `BUILD_NUMBER` | Build iteration     | `42`         |
| `RELEASE_DATE` | Build date          | `2025-12-26` |

### Runtime Variables

Set by installer or manually:

| Variable           | Description    | Default                          |
| ------------------ | -------------- | -------------------------------- |
| `DRIVE_ALIVE_DATA` | Data directory | `C:\ProgramData\Drive Alive`     |
| `DRIVE_ALIVE_DB`   | Database URL   | `postgresql://localhost/drivedb` |
| `DRIVE_ALIVE_PORT` | Backend port   | `8000`                           |

---

## Installer Features

### What the Installer Does

1. **Pre-installation**

   - Checks for admin rights
   - Validates system requirements
   - Detects existing installations

2. **Installation**

   - Copies backend executable
   - Copies frontend web bundle
   - Creates data directories
   - Sets environment variables
   - Creates shortcuts

3. **Post-installation**

   - Optionally starts API server
   - Opens README
   - Configures auto-start (optional)

4. **Uninstallation**
   - Stops running processes
   - Removes installed files
   - Optionally deletes user data
   - Cleans registry entries

### Installer Customization

Modify `scripts/installer.iss`:

```ini
; Change install location
DefaultDirName={autopf}\MyApp

; Add custom files
Source: "myfile.txt"; DestDir: "{app}"

; Add registry keys
Root: HKLM; Subkey: "Software\MyApp"; ValueType: string; ValueName: "InstallPath"; ValueData: "{app}"

; Add custom icons
Name: "{group}\MyLink"; Filename: "{app}\myapp.exe"
```

---

## Distribution

### Release Artifacts

Each release should include:

1. **Windows Installer** (`DriveAlive-Setup-{VERSION}.exe`)

   - Self-contained
   - Includes backend + frontend
   - ~50-100 MB

2. **Standalone Backend** (`drive-alive-api.exe`) [Optional]

   - Backend only
   - For server deployment
   - ~30-50 MB

3. **Frontend Bundle** (`web-build.zip`) [Optional]
   - Static web files
   - For separate web hosting
   - ~5-10 MB

### Upload to GitHub Releases

```bash
# Create release with auto-generated notes
gh release create v1.0.0 \
  dist/DriveAlive-Setup-1.0.0.exe \
  --title "Drive Alive v1.0.0" \
  --generate-notes

# Or with manual notes
gh release create v1.0.0 \
  dist/DriveAlive-Setup-1.0.0.exe \
  --title "Drive Alive v1.0.0" \
  --notes "See CHANGELOG.md for details"
```

---

## Testing

### Pre-release Testing

1. **Clean VM Test**

   - Install on fresh Windows VM
   - Verify no missing dependencies
   - Test all features

2. **Upgrade Test**

   - Install previous version
   - Install new version
   - Verify data migration

3. **Uninstall Test**
   - Install application
   - Uninstall completely
   - Verify cleanup

### Automated Testing

```bash
# Run all tests before build
drive-alive.bat test

# Test backend compilation
cd backend
python -m compileall -q app

# Test frontend build
cd frontend
npx expo export:web --dev
```

---

## Troubleshooting

### Common Build Errors

#### Error: "PyInstaller not found"

```bash
cd backend
venv\Scripts\activate
pip install pyinstaller
```

#### Error: "Inno Setup not found"

- Install from: https://jrsoftware.org/isinfo.php
- Add to PATH: `C:\Program Files (x86)\Inno Setup 6\`

#### Error: "Module not found"

```bash
# Add to hiddenimports in drive-alive.spec
hiddenimports = [
    'missing_module',
]
```

#### Error: "Expo build failed"

```bash
cd frontend
npx expo start -c  # Clear cache
rm -rf node_modules
npm install
npx expo export:web
```

---

## Advanced Configuration

### Custom Build Options

#### Change App Icon

1. Replace `image/logo.ico`
2. Update spec file:
   ```python
   exe = EXE(
       ...
       icon='../image/custom-logo.ico'
   )
   ```

#### Add Splash Screen

Modify `scripts/installer.iss`:

```ini
[Setup]
WizardImageFile=splash.bmp
WizardSmallImageFile=icon.bmp
```

#### Code Signing

```ini
[Setup]
SignTool=signtool sign /f "certificate.pfx" /p "password" $f
```

---

## Best Practices

### Before Building

- ✅ Run all tests
- ✅ Update documentation
- ✅ Increment version appropriately
- ✅ Clear build caches
- ✅ Commit all changes

### During Building

- ✅ Use `--clean` flag for PyInstaller
- ✅ Verify version numbers match
- ✅ Check file sizes (detect missing dependencies)
- ✅ Review build logs for warnings

### After Building

- ✅ Test installer on clean VM
- ✅ Verify all features work
- ✅ Check file associations
- ✅ Test uninstaller
- ✅ Create GitHub release

---

## Resources

- [PyInstaller Documentation](https://pyinstaller.org/)
- [Inno Setup Documentation](https://jrsoftware.org/ishelp/)
- [Semantic Versioning](https://semver.org/)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github)

---

**Last Updated**: December 26, 2025
**Version**: 1.0.0
