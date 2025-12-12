# Installing PowerShell 7+ (Latest Version)

## Why Install PowerShell 7+?
- Required for GitHub Copilot CLI to run commands directly
- Better performance and features than Windows PowerShell 5.1
- Cross-platform (works on Windows, Linux, macOS)
- Regular updates and modern features

---

## Method 1: Using winget (Easiest)

Run the helper script:
```powershell
cd C:\Projects\DRIVE_ALIVE
.\install-powershell.bat
```

Or manually:
```powershell
winget install --id Microsoft.Powershell --source winget
```

---

## Method 2: Direct Download (Recommended)

1. **Visit:** https://aka.ms/powershell
2. **Download:** Windows MSI installer (x64)
3. **Run:** The downloaded .msi file
4. **Follow:** Installation wizard
5. **Restart:** VS Code after installation

**Direct link to releases:**
https://github.com/PowerShell/PowerShell/releases

---

## Method 3: Microsoft Store

1. Open **Microsoft Store**
2. Search for **"PowerShell"**
3. Install **PowerShell** (not "Windows PowerShell")
4. Wait for installation
5. Restart VS Code

---

## Method 4: Using Chocolatey

If you have Chocolatey installed:
```powershell
choco install powershell-core
```

---

## After Installation

### Verify Installation:
```powershell
# Open new terminal
pwsh --version

# Should show: PowerShell 7.x.x or higher
```

### Set as Default in VS Code:

1. Open VS Code
2. Press `Ctrl + Shift + P`
3. Type: "Terminal: Select Default Profile"
4. Choose: **PowerShell (pwsh.exe)**

Or manually edit settings.json:
```json
{
  "terminal.integrated.defaultProfile.windows": "PowerShell",
  "terminal.integrated.profiles.windows": {
    "PowerShell": {
      "path": "pwsh.exe",
      "icon": "terminal-powershell"
    }
  }
}
```

---

## Difference Between PowerShell Versions

| Feature | Windows PowerShell 5.1 | PowerShell 7+ |
|---------|----------------------|---------------|
| Version | 5.1 (built into Windows) | 7.4+ (latest) |
| Command | `powershell.exe` | `pwsh.exe` |
| Cross-platform | ❌ Windows only | ✅ Windows, Linux, macOS |
| Modern features | ❌ Limited | ✅ Full support |
| Performance | ⚠️ Slower | ✅ Faster |
| GitHub Copilot CLI | ❌ Not supported | ✅ Fully supported |

---

## Quick Install Commands

### Windows 11/10 (winget):
```powershell
winget install Microsoft.PowerShell
```

### Chocolatey:
```powershell
choco install powershell-core
```

### Scoop:
```powershell
scoop install pwsh
```

---

## Troubleshooting

### Issue: "winget not found"
**Solution:** Update Windows or install from https://aka.ms/powershell

### Issue: "Execution policy error"
**Solution:** 
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue: "pwsh not recognized after install"
**Solution:** 
- Close all terminals
- Restart VS Code
- Open new terminal
- Try: `pwsh --version`

### Issue: Still using old PowerShell
**Solution:**
1. Check VS Code terminal profile settings
2. Select PowerShell 7 as default
3. Open new terminal

---

## Verification Checklist

After installation, verify:

```powershell
# 1. Check PowerShell version
pwsh --version
# Expected: PowerShell 7.4.x or higher

# 2. Check it's in PATH
where.exe pwsh
# Expected: C:\Program Files\PowerShell\7\pwsh.exe

# 3. Launch PowerShell 7
pwsh
# You should see: PS C:\...>

# 4. Check $PSVersionTable
$PSVersionTable.PSVersion
# Expected: Major = 7, Minor = 4+
```

---

## After Successful Installation

Once PowerShell 7+ is installed:

1. ✅ **GitHub Copilot CLI** can run commands directly
2. ✅ **Automation scripts** will work
3. ✅ **Better performance** in terminal
4. ✅ **Modern features** available

### Next Steps:
```powershell
# Navigate to frontend
cd C:\Projects\DRIVE_ALIVE\frontend

# Run the Expo fix script
.\USE_MODERN_EXPO.bat

# Or start directly
npm start
```

---

## Benefits for This Project

With PowerShell 7+:
- ✅ I can run npm/expo commands for you
- ✅ Automated testing and building
- ✅ Better debugging capabilities
- ✅ Faster development workflow
- ✅ Direct execution of setup scripts

---

## Quick Links

- **Official Download:** https://aka.ms/powershell
- **GitHub Releases:** https://github.com/PowerShell/PowerShell/releases
- **Documentation:** https://docs.microsoft.com/powershell
- **What's New:** https://docs.microsoft.com/powershell/scripting/whats-new

---

**Recommended:** Install via winget or direct download for best experience!

After installation, restart VS Code and you'll be all set! 🚀
