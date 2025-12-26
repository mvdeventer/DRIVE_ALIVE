# Drive Alive - Quick Command Reference

## Usage

Run the script from project root:

```bash
.\scripts\drive-alive.bat
```

## Menu Options

### 1. Commit Changes (Auto-generated message)

- **Automatically analyzes** your code changes
- **Generates smart commit messages** like:
  - `feat(frontend): update frontend (3 files)`
  - `feat(backend): update backend (5 files)`
  - `build(scripts): update build scripts (1 files)`
  - `docs: update documentation (2 files)`
  - `chore: update configuration (1 files)`
- **Stages all changes** with `git add .`
- **Commits with generated message**
- **Option to push** to GitHub

**What it detects:**

- Frontend changes → `feat(frontend)`
- Backend changes → `feat(backend)`
- Script changes → `build(scripts)`
- Documentation → `docs`
- Config files → `chore`
- Test files → `test`

### 2. Build Installer

- **Builds backend** executable with PyInstaller
- **Builds frontend** web bundle with Expo
- **Creates installer** with Inno Setup
- **Output:** `DriveAlive-Setup-X.X.X.exe`

**Requirements:**

- Python venv at `backend/venv`
- Node.js and npm installed
- Inno Setup installed

### 3. Release (Full Workflow)

- **Auto-commits** any uncommitted changes
- **Prompts for version** (or keeps current)
- **Updates VERSION file** and project files
- **Creates git tag** (v1.0.0)
- **Pushes to GitHub**
- **Creates GitHub Release** with auto-generated notes

**Requirements:**

- GitHub CLI (gh) installed
- GitHub authentication configured

### 4. Exit

- Close the script

## Examples

### Quick Commit Workflow

```bash
# Make your code changes
# Run script
.\scripts\drive-alive.bat
# Select: 1
# Review generated message
# Press Y to commit
# Press Y to push
```

### Release Workflow

```bash
# Make sure all changes are saved
# Run script
.\scripts\drive-alive.bat
# Select: 3
# Enter new version: 1.0.1
# Script handles rest automatically
```

## Auto-Generated Commit Messages

The script analyzes your changes and creates **conventional commit** messages:

| Changes Detected        | Generated Message                                |
| ----------------------- | ------------------------------------------------ |
| Only frontend files     | `feat(frontend): update frontend (X files)`      |
| Only backend files      | `feat(backend): update backend (X files)`        |
| Both frontend & backend | `feat(app): update application (X files)`        |
| Only scripts/ folder    | `build(scripts): update build scripts (X files)` |
| Only .md files          | `docs: update documentation (X files)`           |
| package.json or config  | `chore: update configuration (X files)`          |
| Test files              | `test: update test files (X files)`              |

## Files Backed Up

- Old script saved as: `scripts/drive-alive-backup.bat`
- Restore if needed: `copy drive-alive-backup.bat drive-alive.bat`

## Troubleshooting

### "GitHub CLI not installed"

Install from: https://cli.github.com/

```bash
winget install GitHub.cli
```

### "Inno Setup not found"

Install from: https://jrsoftware.org/isdl.php

### "Virtual environment not found"

Create venv:

```bash
cd backend
python -m venv venv
```

## Clean & Simple

This new script is:

- ✅ **Clean and tested** - No complex logic
- ✅ **Auto-generates commit messages** - Scans files intelligently
- ✅ **Menu-driven** - Easy to use
- ✅ **Error-handled** - Checks requirements
- ✅ **Visual feedback** - Color-coded output
