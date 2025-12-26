# Git Credentials Setup - Automatic Authentication

## How It Works

The `drive-alive.bat` script now **automatically handles authentication** for you!

### What Happens Automatically:

1. **First Time Only**: Script detects you're not authenticated
2. **Opens Browser**: GitHub login page opens automatically
3. **One-Time Login**: You log in via web browser
4. **Credentials Saved**: GitHub CLI remembers your credentials forever
5. **Future Runs**: Script uses saved credentials automatically

## Quick Setup (One-Time)

### Option 1: Automatic (Recommended)

```bash
# Just run the script
.\scripts\drive-alive.bat

# Select: 3 (Release)
# Script will automatically prompt for authentication
# Follow browser prompts
# Done! Never asked again
```

### Option 2: Manual Setup

```bash
# Install GitHub CLI (if not installed)
winget install GitHub.cli

# Authenticate once
gh auth login

# Select:
# - GitHub.com
# - HTTPS
# - Login with web browser
# - Follow browser prompts

# Done! Credentials saved
```

## Your Git Credentials

The script uses **TWO** authentication methods:

### 1. **Git Push/Pull** (Already Working)

- Uses: Windows Credential Manager
- Location: Control Panel > Credential Manager > Windows Credentials
- Status: ✅ Already configured (you can push/pull)

### 2. **GitHub CLI** (For Releases)

- Uses: GitHub CLI token
- Location: `%USERPROFILE%\.config\gh\hosts.yml`
- Setup: One-time browser login
- Expires: Never (unless you revoke it)

## Script Features

### Auto-Detection

```
✅ Checks if GitHub CLI installed
✅ Checks if authenticated
✅ Prompts for one-time setup if needed
✅ Uses saved credentials on future runs
```

### What Gets Saved

```
C:\Users\YourName\.config\gh\
├── hosts.yml          # Your GitHub token (encrypted)
└── config.yml         # CLI preferences
```

## Troubleshooting

### "GitHub CLI not installed"

**Script automatically offers to install:**

```bash
# Option 1: Via script (automatic)
# Select Y when prompted

# Option 2: Manual
winget install GitHub.cli
# OR
# Download from: https://cli.github.com/
```

### "Authentication failed"

**Try manual login:**

```bash
gh auth login --web
```

### "Token expired" (rare)

**Refresh authentication:**

```bash
gh auth refresh
```

### Check Auth Status

```bash
# See if authenticated
gh auth status

# Output should show:
# ✓ Logged in to github.com as YOUR_USERNAME
# ✓ Git operations protocol: https
# ✓ Token: *******************
```

## Security

### Your credentials are:

- ✅ **Encrypted** on disk
- ✅ **Never stored in script**
- ✅ **Managed by GitHub**
- ✅ **Revocable** anytime at github.com/settings/tokens

### The script:

- ❌ **Never sees your password**
- ❌ **Never stores credentials**
- ✅ **Uses GitHub's official CLI**
- ✅ **Standard OAuth flow**

## Summary

**You only authenticate ONCE:**

1. Run script
2. Browser opens
3. Click "Authorize"
4. Done forever!

**Future runs:**

- No prompts
- No passwords
- No tokens to enter
- Completely automatic

The script handles everything automatically. Just run it and follow the one-time browser prompts! 🚀
