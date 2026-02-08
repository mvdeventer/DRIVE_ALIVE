# Quick Fix: Verification Links on Home Network

## Your Current Issue
✅ Backend running at: `http://10.0.0.121:8081`  
✅ Verification emails/WhatsApp sent with: `http://10.0.0.121:8081/verify-account?token=...`  
❌ Links don't open on mobile devices  

## Immediate Solution

### Step 1: Verify Your Setup

**Check if your computer's IP is still `10.0.0.121`:**
```powershell
ipconfig | findstr IPv4
```

**If IP changed, update `.env`:**
```bash
# In backend\.env file, update line 38:
FRONTEND_URL=http://YOUR-NEW-IP:8081

# Also update line 53:
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081,http://YOUR-NEW-IP:8081
```

### Step 2: Restart Backend
**Important:** Changes only apply after restart!
```powershell
# Stop backend (Ctrl+C in backend terminal)
# Start again:
cd C:\Projects\DRIVE_ALIVE
.\s.bat -d
```

### Step 3: Test on Mobile

1. **Ensure mobile on same WiFi as computer**
2. **Register new student account**
3. **Check verification email/WhatsApp - link should be:**
   ```
   http://10.0.0.121:8081/verify-account?token=abc123...
   ```
4. **Click link on mobile device**
   - Should open in browser
   - Navigate to verification page
   - Show success message

## Troubleshooting

### Problem: "Site can't be reached" on mobile

**Solution:**
1. ✅ Check mobile is on same WiFi network
2. ✅ Ping computer from mobile:
   - Open browser on phone
   - Go to: `http://10.0.0.121:8081`
   - Should show API response or "Not Found" (proves connectivity)
3. ✅ Check Windows Firewall:
   ```powershell
   # Allow port 8081 through firewall
   New-NetFirewallRule -DisplayName "Drive Alive Backend" -Direction Inbound -LocalPort 8081 -Protocol TCP -Action Allow
   ```

### Problem: Link shows old IP address

**Solution:**
1. ✅ Update `.env` with new IP
2. ✅ **Restart backend** (critical!)
3. ✅ Register **new account** to test (old tokens have old URL)

### Problem: Need to test on computer only (faster)

**Solution:** Use localhost mode
```powershell
# Run helper script:
cd C:\Projects\DRIVE_ALIVE\backend
.\switch-env.ps1 -Env loc

# Restart backend
# Links will now use: http://localhost:8081/verify-account?token=...
```

## Auto-Switch IP Address (Recommended)

**Use the helper script instead of manual editing:**

```powershell
# Interactive menu - easiest way!
cd C:\Projects\DRIVE_ALIVE\backend
.\switch-env.ps1

# Or use direct commands:
# For mobile testing (auto-detects your IP)
.\switch-env.ps1 -Env net

# For computer-only testing
.\switch-env.ps1 -Env loc

# Show help and all options
.\switch-env.ps1 -h
```

**Benefits:**
- ✅ Automatically finds your current IP
- ✅ Updates both FRONTEND_URL and ALLOWED_ORIGINS
- ✅ Shows you what changed
- ✅ Reminds you to restart backend

## When Deploying to Render

**Your verification links will automatically switch to production URL**

1. **Set in Render Dashboard:**
   ```
   FRONTEND_URL=https://your-app-name.onrender.com
   ALLOWED_ORIGINS=https://your-app-name.onrender.com
   ```

2. **Test after deployment:**
   - Register student on live site
   - Verification link will be: `https://your-app-name.onrender.com/verify-account?token=...`
   - Works anywhere in the world (no IP or network issues)

## Quick Reference

| Environment | FRONTEND_URL | Who Can Access |
|-------------|--------------|----------------|
| **Local** | `http://localhost:8081` | Computer only |
| **Network** | `http://10.0.0.121:8081` | Home WiFi devices |
| **Production** | `https://your-app.onrender.com` | Worldwide |

## Daily Workflow

**Starting development:**
```powershell
# 1. Check if computer IP changed (optional)
ipconfig | findstr IPv4

# 2. If IP changed, update environment:
cd C:\Projects\DRIVE_ALIVE\backend
.\switch-env.ps1 -Env net

# 3. Start backend
cd C:\Projects\DRIVE_ALIVE
.\s.bat -d

# 4. Start frontend (in separate terminal)
cd C:\Projects\DRIVE_ALIVE\frontend
npx expo start --host 10.0.0.121
```

**Testing verification on mobile:**
```
1. Register student account
2. Check email/WhatsApp on phone
3. Click verification link
4. Should open in phone browser → verify account
```

## Need Help?

See full documentation: [`NETWORK_CONFIGURATION_GUIDE.md`](NETWORK_CONFIGURATION_GUIDE.md)

**Common issues:**
- IP changed → Run `.\switch-env.ps1 -Env net`
- Links don't work → Restart backend after .env changes
- Mobile can't connect → Check firewall, ensure same WiFi
- Production links needed → Set FRONTEND_URL in Render dashboard
