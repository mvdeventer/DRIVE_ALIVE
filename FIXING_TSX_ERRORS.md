# ⚠️ Fixing TypeScript Errors in .tsx Files

## The Problem

You're seeing errors like:
- `Cannot find module 'react'`
- `Cannot find module 'react-native'`
- `Cannot find module 'axios'`
- `Cannot find name 'console'`
- `File 'expo/tsconfig.base' not found`

## ✅ Quick Fix (Recommended)

### Option 1: Run the Fix Script

```powershell
.\fix-frontend-errors.ps1
```

This script will:
1. Install all npm dependencies
2. Verify installation
3. Tell you when to reload VS Code

### Option 2: Run Installation Script

```powershell
.\scripts\install-dependencies.bat
```

This installs both Python and npm dependencies.

### Option 3: Manual Fix

```powershell
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Go back to root
cd ..
```

After installation, **reload VS Code**:
- Press `Ctrl+Shift+P`
- Type "Reload Window"
- Press Enter

## Why This Happens

TypeScript errors occur because:
1. ❌ **npm packages not installed** - `node_modules` folder is empty
2. ❌ **VS Code hasn't detected the packages** - Need to reload

## What Gets Installed

The `npm install` command installs **50+ packages**, including:

### Core Dependencies
- ✅ react (18.2.0)
- ✅ react-native (0.73.2)
- ✅ expo (~50.0.0)

### Navigation
- ✅ @react-navigation/native
- ✅ @react-navigation/native-stack
- ✅ @react-navigation/bottom-tabs

### API & Storage
- ✅ axios (HTTP requests)
- ✅ expo-secure-store (secure storage)

### Location & Maps
- ✅ expo-location (GPS)
- ✅ react-native-maps (maps)

### Payments
- ✅ @stripe/stripe-react-native

### Firebase
- ✅ firebase

## Verification

After running the fix, check:

```powershell
# Check if node_modules exists
dir frontend\node_modules

# Check specific packages
dir frontend\node_modules\react
dir frontend\node_modules\react-native
dir frontend\node_modules\axios
```

All should exist with folders full of files.

## After Installation

1. **Reload VS Code**: `Ctrl+Shift+P` → "Reload Window"
2. **Check errors are gone**: Open any `.tsx` file
3. **TypeScript should now work**: Hover over imports - should show types
4. **IntelliSense should work**: Type `React.` and see suggestions

## If Errors Persist

### 1. Check node_modules exists
```powershell
# Should show a large folder
dir frontend\node_modules
```

### 2. Try legacy peer deps
```powershell
cd frontend
npm install --legacy-peer-deps
```

### 3. Clear cache and reinstall
```powershell
cd frontend
rm -r node_modules
rm package-lock.json
npm install
```

### 4. Check TypeScript SDK
In VS Code:
- Press `Ctrl+Shift+P`
- Type "TypeScript: Select TypeScript Version"
- Choose "Use Workspace Version"

### 5. Restart VS Code completely
- Close all VS Code windows
- Open project fresh

## Common Errors Explained

### "Cannot find module 'react'"
**Cause**: React not installed  
**Fix**: Run `npm install` in frontend directory

### "Cannot find name 'console'"
**Cause**: TypeScript lib config missing DOM  
**Fix**: Already fixed in tsconfig.json (includes "DOM" lib)

### "File 'expo/tsconfig.base' not found"
**Cause**: Expo not installed yet  
**Fix**: Run `npm install` - Expo provides this file

### "FormData is not defined"
**Cause**: DOM types not included  
**Fix**: Already fixed in tsconfig.json

## Testing After Fix

### 1. Check Imports Work
Open `LoginScreen.tsx` and hover over:
```typescript
import React from 'react';  // Should show type info
```

### 2. Check IntelliSense
Type in a .tsx file:
```typescript
React.  // Should show Component, useState, useEffect, etc.
```

### 3. Check No Red Squiggles
All .tsx files should have no error underlines

### 4. Build Check
```powershell
cd frontend
npm run web  # Should compile without TypeScript errors
```

## File Modifications Made

✅ **Created**:
- `frontend/tsconfig.json` - TypeScript configuration
- `frontend/babel.config.js` - Babel configuration  
- `frontend/.eslintrc.js` - ESLint rules
- `frontend/.gitignore` - Git ignore patterns
- `fix-frontend-errors.ps1` - Fix script

✅ **Updated**:
- `tsconfig.json` - Added "DOM" to lib for console, FormData, etc.
- `tsconfig.json` - Changed moduleResolution to "bundler"

## Expected Result

After fixing:
- ✅ No TypeScript errors in .tsx files
- ✅ IntelliSense works (auto-complete)
- ✅ Type checking works
- ✅ Can hover over imports to see types
- ✅ Can run `npm start` without errors
- ✅ Can build app successfully

## Quick Reference

| Problem | Solution |
|---------|----------|
| Import errors | `npm install` in frontend folder |
| Still errors after install | Reload VS Code window |
| console not found | Already fixed in tsconfig |
| Expo types missing | Run `npm install` |
| Old errors cached | Close/reopen VS Code |

## Next Steps

1. ✅ Run `fix-frontend-errors.ps1` or `npm install`
2. ✅ Reload VS Code window
3. ✅ Verify errors are gone
4. ✅ Start developing!

To start the app:
```powershell
# Option 1: Use script
.\scripts\start-frontend.bat

# Option 2: Manual
cd frontend
npm start
# Press 'w' for web
```

---

**TL;DR**: Run `.\fix-frontend-errors.ps1` then reload VS Code (Ctrl+Shift+P → "Reload Window")
