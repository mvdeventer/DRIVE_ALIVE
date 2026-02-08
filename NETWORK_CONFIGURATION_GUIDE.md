# Network Configuration Guide for Drive Alive

## Problem
Verification links sent via email/WhatsApp use `localhost` URLs, which don't work:
- ❌ On mobile devices (can't reach your computer's localhost)
- ❌ When deployed to production (need actual domain name)

## Solution: Environment-Based Configuration

### 📋 Quick Setup Checklist

1. **Find Your Computer's IP Address**
   ```powershell
   # Windows (PowerShell)
   ipconfig | findstr IPv4
   
   # Look for line like: IPv4 Address. . . . . . . . . . . : 192.168.1.100
   ```

2. **Create/Update `.env` File**
   ```bash
   # In backend folder
   cd c:\Projects\DRIVE_ALIVE\backend
   copy .env.example .env  # If .env doesn't exist
   ```

3. **Configure for Your Environment**

---

## 🏠 Local Development (Computer Only)

**Use when:** Testing on your computer's browser only

**`.env` configuration:**
```env
FRONTEND_URL=http://localhost:8081
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081,http://localhost:19000
```

**Result:**
- ✅ Works on your computer's browser
- ❌ Won't work on mobile devices
- ❌ Won't work on other computers

---

## 📱 Home Network Testing (Mobile + Computer)

**Use when:** Testing on mobile devices connected to your home WiFi

**Steps:**
1. Find your computer's IP address (e.g., `192.168.1.100`)
2. Update `.env`:

```env
FRONTEND_URL=http://192.168.1.100:8081
ALLOWED_ORIGINS=http://localhost:8081,http://192.168.1.100:8081,http://192.168.1.100:3000
```

3. **Important:** Update Expo config to use your IP:
   ```bash
   # In frontend folder
   npx expo start --host 192.168.1.100
   ```

4. **Access app on mobile:**
   - Open Expo Go app
   - Scan QR code or enter: `exp://192.168.1.100:8081`

**Result:**
- ✅ Verification links work on mobile devices
- ✅ Can test WhatsApp/email verification on phone
- ✅ Works on any device on your home network
- ❌ Won't work outside your home network
- ❌ IP may change if router resets (DHCP)

**Troubleshooting:**
- If IP changes, update `.env` and restart backend
- Make sure firewall allows connections on port 8081
- Ensure mobile and computer are on same WiFi network

---

## 🌐 Production (Render Deployment)

**Use when:** Deploying to Render.com

**Steps:**
1. Deploy your app to Render
2. Get your Render URL (e.g., `https://drivealive.onrender.com`)
3. Update `.env` for production:

```env
FRONTEND_URL=https://drivealive.onrender.com
ALLOWED_ORIGINS=https://drivealive.onrender.com
ENVIRONMENT=production
DEBUG=False
```

4. **Set environment variables in Render dashboard:**
   - Go to Render.com → Your App → Environment
   - Add/update:
     - `FRONTEND_URL=https://drivealive.onrender.com`
     - `ALLOWED_ORIGINS=https://drivealive.onrender.com`
     - All other production secrets (DATABASE_URL, STRIPE_SECRET_KEY, etc.)

**Result:**
- ✅ Verification links work worldwide
- ✅ Permanent URL (doesn't change)
- ✅ HTTPS (secure)
- ✅ Professional

---

## 🔄 Quick Switch Between Environments

### Option 1: Multiple .env Files
```bash
# Create separate configs
.env.local     # localhost only
.env.network   # home network IP
.env.production # Render domain

# Copy the one you need
copy .env.network .env
```

### Option 2: Script (Recommended)
Create `switch-env.ps1` in backend folder:

```powershell
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('local','network','production')]
    [string]$Environment
)

switch ($Environment) {
    'local' {
        $env:FRONTEND_URL = "http://localhost:8081"
        $env:ALLOWED_ORIGINS = "http://localhost:8081,http://localhost:19000"
        Write-Host "✅ Switched to LOCAL development mode"
    }
    'network' {
        # Auto-detect local IP
        $IP = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi" | Select-Object -First 1).IPAddress
        $env:FRONTEND_URL = "http://$IP:8081"
        $env:ALLOWED_ORIGINS = "http://$IP:8081,http://$IP:19000,http://localhost:8081"
        Write-Host "✅ Switched to NETWORK mode (IP: $IP)"
    }
    'production' {
        Write-Host "⚠️  For production, set environment variables in Render dashboard"
        Write-Host "   FRONTEND_URL=https://your-app.onrender.com"
    }
}

# Update .env file
$envContent = @"
FRONTEND_URL=$($env:FRONTEND_URL)
ALLOWED_ORIGINS=$($env:ALLOWED_ORIGINS)
"@

$envContent | Out-File -FilePath ".env" -Encoding utf8 -NoNewline
Write-Host "📄 Updated .env file"
```

**Usage:**
```powershell
# Interactive menu (easiest - just run without options)
.\switch-env.ps1

# Or use direct commands with short syntax:
# Switch to local development  
.\switch-env.ps1 -Env loc

# Switch to network testing (auto-detects your IP)
.\switch-env.ps1 -Env net

# View production reminder
.\switch-env.ps1 -Env prod

# Show help
.\switch-env.ps1 -h
```

---

## 🧪 Testing Verification Links

### After Configuration:

1. **Register a student account**
2. **Check verification email/WhatsApp - link should be:**
   - Local: `http://localhost:8081/verify-account?token=...`
   - Network: `http://192.168.1.100:8081/verify-account?token=...`
   - Production: `https://drivealive.onrender.com/verify-account?token=...`

3. **Click link:**
   - Should open in browser/app
   - Navigate to verification screen
   - Show success message

### Troubleshooting:

**"Cannot GET /verify-account" error:**
- ✅ Restart backend server after changing .env
- ✅ Check frontend navigation routes in App.tsx

**"Network request failed" error:**
- ✅ Ensure ALLOWED_ORIGINS includes the URL you're accessing from
- ✅ Check firewall settings
- ✅ Verify mobile and computer on same network (network testing)

**Verification link shows wrong URL:**
- ✅ Update FRONTEND_URL in .env
- ✅ Restart backend server (changes only apply after restart)
- ✅ Register new account to test (old tokens have old URL cached)

---

## 🎯 Recommended Workflow

### Daily Development:
1. Use **local mode** (`localhost`) for speed
2. Test on computer browser only

### Before Mobile Testing:
1. Switch to **network mode** (your IP)
2. Test on phone via Expo Go
3. Verify WhatsApp/email links work on mobile

### Before Production Deploy:
1. Commit all code to GitHub
2. Render auto-deploys from GitHub
3. Set **production environment variables** in Render dashboard
4. Test verification with real email/phone

---

## 📦 Render Deployment Checklist

When deploying to Render:

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for production"
   git push origin main
   ```

2. **Set Render Environment Variables:**
   ```
   FRONTEND_URL=https://your-app-name.onrender.com
   ALLOWED_ORIGINS=https://your-app-name.onrender.com
   DATABASE_URL=<render-postgres-url>
   # Set SECRET_KEY, ENCRYPTION_KEY, TWILIO_*, STRIPE_* in Render (see .env.example)
   # ... all other production secrets
   ```

3. **Test Production Verification:**
   - Register student on live site
   - Check email/WhatsApp for verification link
   - Link should be: `https://your-app-name.onrender.com/verify-account?token=...`
   - Click and verify it works

---

## 🔐 Security Notes

- ✅ Never commit `.env` to GitHub (already in .gitignore)
- ✅ Use different secrets for production vs development
- ✅ Set `DEBUG=False` in production
- ✅ Use HTTPS in production (Render provides this automatically)
- ✅ Keep `.env.example` updated as a template (no real secrets)

---

## 💡 Tips

1. **Static IP for Home Network:**
   - Configure router to assign static IP to your computer
   - Prevents having to update .env when IP changes

2. **Auto-Start Backend with Correct Config:**
   ```bash
   # Add to s.bat before starting backend:
   copy .env.network .env
   ```

3. **Monitor Backend Logs:**
   - Check verification link generation: `[INFO] Sending verification to: http://...`
   - Confirms which URL is being used

4. **Test Before Deploying:**
   - Always test verification flow on network mode
   - Ensures production will work when deployed

---

## 📞 Support

If verification links still don't work:
1. Check backend logs for generated URLs
2. Verify FRONTEND_URL matches where app is running
3. Ensure ALLOWED_ORIGINS includes all accessing domains
4. Restart backend after .env changes
5. Clear browser cache if links show old URLs
