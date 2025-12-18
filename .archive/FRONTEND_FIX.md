# Frontend Expo Error - FIXED! ✅

## Problem
```
'expo' is not recognized as an internal or external command
```

## Root Cause
The `expo` command wasn't globally installed or not in PATH. The package.json was trying to run `expo start` directly.

## Solution Applied ✅

### 1. Updated package.json Scripts
Changed all expo commands to use `npx`:
```json
"scripts": {
  "start": "npx expo start",      // Was: "expo start"
  "android": "npx expo start --android",
  "ios": "npx expo start --ios",
  "web": "npx expo start --web"
}
```

**Why this works:** `npx` runs packages from `node_modules/.bin` without needing global installation.

### 2. Created Helper Scripts

**`start-expo.bat`** - Quick start script:
```bash
cd C:\Projects\DRIVE_ALIVE\frontend
start-expo.bat
```

**`fix-and-start.bat`** - Full setup + start:
```bash
cd C:\Projects\DRIVE_ALIVE\frontend
fix-and-start.bat
```
This script:
- Checks Node.js installation
- Checks npm installation
- Runs `npm install` to ensure all dependencies
- Starts Expo with `npx expo start`

## How to Start Frontend Now

### Option 1: Use npm (Recommended)
```bash
cd C:\Projects\DRIVE_ALIVE\frontend
npm start
```

### Option 2: Use batch script
```bash
cd C:\Projects\DRIVE_ALIVE\frontend
start-expo.bat
```

### Option 3: Use npx directly
```bash
cd C:\Projects\DRIVE_ALIVE\frontend
npx expo start
```

## What Happens When You Start

Expo will:
1. Start the Metro bundler
2. Generate a QR code
3. Open in browser (usually http://localhost:8081)
4. Show options:
   - Press `w` - Open in web browser
   - Press `a` - Open Android emulator (needs Android Studio)
   - Press `i` - Open iOS simulator (Mac only, needs Xcode)
   - Press `q` - Quit

## Testing on Mobile

### Option 1: Expo Go App (Easiest)
1. Install **Expo Go** from App Store (iOS) or Play Store (Android)
2. Scan the QR code shown in terminal
3. App will load on your phone

### Option 2: Web Browser (Development)
1. Press `w` when Expo starts
2. Opens at http://localhost:8081
3. Good for quick testing, not all features work

### Option 3: Emulator (Best for Development)
**Android:**
- Install Android Studio
- Create Android Virtual Device (AVD)
- Press `a` when Expo starts

**iOS (Mac only):**
- Install Xcode
- Open iOS Simulator
- Press `i` when Expo starts

## Verifying Installation

Check everything is working:
```bash
cd C:\Projects\DRIVE_ALIVE\frontend

# Check Node.js
node --version
# Should show: v18.x.x or v20.x.x

# Check npm
npm --version
# Should show: 9.x.x or 10.x.x

# Check if expo is in node_modules
npx expo --version
# Should show: ~51.0.0

# List installed packages
npm list --depth=0
```

## Common Issues & Solutions

### Issue: "Cannot find module 'expo'"
**Solution:**
```bash
npm install
```

### Issue: "Port 8081 already in use"
**Solution:**
```bash
# Kill the process using port 8081
npx expo start -c
# The -c flag clears cache and restarts
```

### Issue: "Metro bundler error"
**Solution:**
```bash
# Clear Expo cache
npx expo start --clear
```

### Issue: QR code not scanning
**Solution:**
- Make sure phone and computer are on same WiFi
- Or use tunnel mode: `npx expo start --tunnel`

## Development Workflow

1. **Start backend** (in another terminal):
```bash
cd C:\Projects\DRIVE_ALIVE\backend
venv\Scripts\activate
cd app
uvicorn main:app --reload
```

2. **Start frontend**:
```bash
cd C:\Projects\DRIVE_ALIVE\frontend
npm start
```

3. **Open on device**:
- Press `w` for web, or
- Scan QR with Expo Go app

## VS Code Integration

You can also run from VS Code:
1. Open `DRIVE_ALIVE.code-workspace`
2. Press `F5`
3. Select "Expo: Start"
4. Or use integrated terminal

## Next Steps

Now that Expo is working, you can:
1. ✅ View the app at http://localhost:8081
2. ✅ Login/Register screens are functional
3. ⏳ Start implementing instructor list screen
4. ⏳ Add map view with react-native-maps
5. ⏳ Build booking flow screens

## Quick Reference

**Start frontend:**
```bash
npm start
```

**Start with options:**
```bash
npm run web      # Web browser
npm run android  # Android emulator
npm run ios      # iOS simulator (Mac)
```

**Troubleshooting:**
```bash
npm install              # Reinstall dependencies
npx expo start --clear   # Clear cache
npx expo doctor          # Check for issues
```

---

**Status:** ✅ FIXED - Frontend now starts successfully!  
**Next:** Implement missing UI screens (map, booking, payment)
