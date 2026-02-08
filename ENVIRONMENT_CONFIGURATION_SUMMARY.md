# Environment Configuration Summary

✅ **FIXED** - Verification links now work across all environments

## What Changed

### 1. Backend Configuration (`backend/app/config.py`)
- Changed default `FRONTEND_URL` from hardcoded IP to `http://localhost:8081`
- Added documentation for different environments

### 2. Environment Files
- **`.env.example`** - Updated with FRONTEND_URL examples and documentation
- **`.env`** - Your existing file updated with better documentation
  - Current: `http://10.0.0.121:8081` (your home network IP)
  - Reminder to update when IP changes

### 3. Helper Tools Created

#### `backend/switch-env.ps1` - Automated Environment Switcher
```powershell
# Interactive menu (just run without options)
.\switch-env.ps1

## Or use direct commands:
# Local development (localhost)
.\switch-env.ps1 -Env loc

# Home network testing (auto-detects your IP)
.\switch-env.ps1 -Env net

# Production instructions
.\switch-env.ps1 -Env prod

# Show help
.\switch-env.ps1 -h
```

### 4. Documentation Created

- **`NETWORK_CONFIGURATION_GUIDE.md`** - Complete guide for all scenarios
- **`QUICK_FIX_VERIFICATION_LINKS.md`** - Quick troubleshooting for your current issue

## Your Current Setup

**Backend `.env` file configured for:**
- **FRONTEND_URL:** `http://10.0.0.121:8081`
- **ALLOWED_ORIGINS:** Includes localhost and your IP
- **Environment:** Home network testing mode

**What this means:**
- ✅ Verification emails/WhatsApp will have: `http://10.0.0.121:8081/verify-account?token=...`
- ✅ Links work on mobile devices connected to your home WiFi
- ✅ Links work on your computer
- ⚠️ If your IP changes, you need to update `.env` and restart backend

## Testing Verification Links Now

### Quick Test on Mobile

1. **✅ Ensure mobile on same WiFi as computer (10.0.0.x network)**

2. **✅ Restart backend** (important after .env changes):
   ```powershell
   # Stop current backend (Ctrl+C)
   cd C:\Projects\DRIVE_ALIVE
   .\s.bat -d
   ```

3. **✅ Register student account**

4. **✅ Check email/WhatsApp on phone**
   - Link should show: `http://10.0.0.121:8081/verify-account?token=...`

5. **✅ Click link on mobile**
   - Opens in phone browser
   - Navigates to verification screen
   - Shows success message

### If Links Don't Work

**Problem:** "Site can't be reached" on mobile  
**Fix:** 
```powershell
# Allow backend through Windows Firewall
New-NetFirewallRule -DisplayName "Drive Alive Backend" -Direction Inbound -LocalPort 8081 -Protocol TCP -Action Allow
```

**Problem:** Link shows old IP address  
**Fix:** 
```powershell
# Run auto-detection script
cd C:\Projects\DRIVE_ALIVE\backend
.\switch-env.ps1 -Env net
# Then restart backend
```

## When You Deploy to Render

### Current Local Setup
```env
FRONTEND_URL=http://10.0.0.121:8081
```

### Production Setup (Set in Render Dashboard)
```env
FRONTEND_URL=https://your-app-name.onrender.com
ALLOWED_ORIGINS=https://your-app-name.onrender.com
ENVIRONMENT=production
DEBUG=False
```

**Result:**
- Verification links will be: `https://your-app-name.onrender.com/verify-account?token=...`
- Works anywhere in the world
- No IP address issues
- HTTPS (secure)

## How It Works

### Verification Link Generation

**Backend services use `settings.FRONTEND_URL`:**
```python
# In verification_service.py
verification_link = f"{frontend_url}/verify-account?token={token}"
```

**Sources for `settings.FRONTEND_URL`:**
1. **First:** Checks `.env` file (`FRONTEND_URL=...`)
2. **Fallback:** Uses `config.py` default (`http://localhost:8081`)

**When you change `.env`:**
- Backend reads new value on next restart
- All new verification links use updated URL
- Old tokens still have old URL (register new account to test)

### Email/WhatsApp Messages

**Student Registration:**
```
Email: Account verification link → http://YOUR-FRONTEND-URL/verify-account?token=abc123
WhatsApp: Account verification link → http://YOUR-FRONTEND-URL/verify-account?token=abc123
```

**Instructor Registration:**
```
Email to ALL Admins: New instructor notification → http://YOUR-FRONTEND-URL/instructor-verify?token=xyz789
WhatsApp to ALL Admins: New instructor details → http://YOUR-FRONTEND-URL/instructor-verify?token=xyz789
```

**Password Reset:**
```
Email: Password reset link → http://YOUR-FRONTEND-URL/reset-password?token=def456
```

## Daily Development Workflow

### Morning Setup

1. **Check if IP changed** (router restart, DHCP):
   ```powershell
   ipconfig | findstr IPv4
   ```

2. **If IP changed, update config:**
   ```powershell
   cd C:\Projects\DRIVE_ALIVE\backend
   .\switch-env.ps1 -Env net
   ```

3. **Start backend:**
   ```powershell
   cd C:\Projects\DRIVE_ALIVE
   .\s.bat -d
   ```

4. **Start frontend (in separate terminal):**
   ```powershell
   cd C:\Projects\DRIVE_ALIVE\frontend
   npx expo start --host 10.0.0.121
   ```

### Testing on Mobile

1. Open Expo Go on phone
2. Scan QR code or enter: `exp://10.0.0.121:8081`
3. Register student account
4. Check verification email/WhatsApp
5. Click link → Should open verification page

### Testing on Computer Only (Faster)

```powershell
# Switch to localhost mode
cd C:\Projects\DRIVE_ALIVE\backend
.\switch-env.ps1 -Env loc

# Restart backend
cd C:\Projects\DRIVE_ALIVE
.\s.bat -d
```

Now verification links use `http://localhost:8081/verify-account?token=...`  
(Works on your computer browser only)

## Render Deployment Checklist

### Before Deploying

- [ ] All code committed to GitHub
- [ ] Tested verification flow locally
- [ ] Tested on mobile devices
- [ ] All features working

### On Render Dashboard

1. **Create Web Service** (if not exists)
   - Connect to GitHub repo
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

2. **Set Environment Variables:**
   ```
   FRONTEND_URL=https://your-app-name.onrender.com
   ALLOWED_ORIGINS=https://your-app-name.onrender.com
   ENVIRONMENT=production
   DEBUG=False
   DATABASE_URL=<render-postgres-url>
   # Set SECRET_KEY, ENCRYPTION_KEY, TWILIO_*, STRIPE_* in Render (see .env.example)
   # ... all other production secrets
   ```

3. **Deploy:**
   - Push to GitHub → Render auto-deploys
   - Monitor build logs
   - Check deployment status

4. **Test Production Verification:**
   - Register student on live site
   - Check email/WhatsApp
   - Link should be: `https://your-app-name.onrender.com/verify-account?token=...`
   - Click and verify it works worldwide

### After Deployment

- [ ] Test student registration and verification
- [ ] Test instructor registration and admin notifications
- [ ] Test password reset
- [ ] Test booking confirmation emails/WhatsApp
- [ ] Monitor Render logs for errors

## Quick Reference

| Task | Command |
|------|---------|
| Switch to localhost | `.\backend\switch-env.ps1 -Env loc` |
| Switch to home network | `.\backend\switch-env.ps1 -Env net` |
| Show help | `.\backend\switch-env.ps1 -h` |
| Find your IP | `ipconfig \| findstr IPv4` |
| Start backend | `.\s.bat -d` |
| Start frontend (network) | `npx expo start --host YOUR-IP` |
| Allow firewall | `New-NetFirewallRule -DisplayName "Drive Alive" -Direction Inbound -LocalPort 8081 -Protocol TCP -Action Allow` |

## Documentation Files

- **`NETWORK_CONFIGURATION_GUIDE.md`** - Complete setup guide for all environments
- **`QUICK_FIX_VERIFICATION_LINKS.md`** - Troubleshooting verification link issues
- **This file** - Summary and quick reference

## Need Help?

**Verification links not working?**
→ See `QUICK_FIX_VERIFICATION_LINKS.md`

**Setting up for production?**
→ See `NETWORK_CONFIGURATION_GUIDE.md` → Production section

**IP address changed?**
→ Run `.\backend\switch-env.ps1 -Env net`

**Testing on mobile?**
→ Ensure same WiFi, check firewall, use network IP
