# Quick Fix for Expo Not Found

## Run This Command:

```powershell
cd C:\Projects\DRIVE_ALIVE\frontend
.\FIX_EXPO.bat
```

This will:
1. Clean node_modules
2. Reinstall all dependencies
3. Verify expo installation
4. Test the expo command
5. Start the app

## Manual Alternative:

```powershell
cd C:\Projects\DRIVE_ALIVE\frontend

# Remove old installation
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue

# Fresh install
npm install

# Start expo
npm start
```

## If Still Not Working:

Try installing expo globally:
```powershell
npm install -g expo-cli
expo start
```

Or use the full path:
```powershell
.\node_modules\.bin\expo start
```
