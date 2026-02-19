# Environment Switcher for Drive Alive Backend
param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('loc','net','prod','local','network','production')]
    [string]$Env,
    
    [Parameter(Mandatory=$false)]
    [switch]$h
)

# Helper functions
function Write-Success { param($msg) Write-Host "Success: $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "Warning: $msg" -ForegroundColor Yellow }
function Write-Info { param($msg) Write-Host "Info: $msg" -ForegroundColor Cyan }

# Show help
if ($h) {
    Write-Host ""
    Write-Host "Environment Switcher for Drive Alive" -ForegroundColor Cyan
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "USAGE:" -ForegroundColor Yellow
    Write-Host "  .\switch-env.ps1 -Env [environment]"
    Write-Host "  .\switch-env.ps1 -h                  # Show this help"
    Write-Host ""
    Write-Host "ENVIRONMENTS:" -ForegroundColor Yellow
    Write-Host "  loc, local       - Localhost (http://localhost:8081)"
    Write-Host "  net, network     - Network mode (auto-detect your IP)"
    Write-Host "  prod, production - Show production deployment instructions"
    Write-Host ""
    Write-Host "EXAMPLES:" -ForegroundColor Yellow
    Write-Host "  .\switch-env.ps1 -Env loc"
    Write-Host "  .\switch-env.ps1 -Env net"
    Write-Host "  .\switch-env.ps1 -Env prod"
    Write-Host ""
    exit 0
}

# Interactive menu
if (-not $Env) {
    Write-Host ""
    Write-Host "Environment Switcher" -ForegroundColor Cyan
    Write-Host "====================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Select environment:"
    Write-Host "  [1] Local (localhost)"
    Write-Host "  [2] Network (mobile testing)"
    Write-Host "  [3] Production (deployment info)"
    Write-Host "  [H] Help"
    Write-Host ""
    
    $choice = Read-Host "Choice [1-3, H]"
    
    switch ($choice.ToLower()) {
        '1' { $Env = 'loc' }
        '2' { $Env = 'net' }
        '3' { $Env = 'prod' }
        'h' { & $PSCommandPath -h; exit 0 }
        default { Write-Host "Invalid choice" -ForegroundColor Red; exit 1 }
    }
}

# Normalize environment
$NormalizedEnv = switch ($Env) {
    { $_ -in 'loc','local' } { 'local' }
    { $_ -in 'net','network' } { 'network' }
    { $_ -in 'prod','production' } { 'production' }
}

# Get paths
$BackendPath = $PSScriptRoot
$EnvFile = Join-Path $BackendPath ".env"

# Check .env exists
if (-not (Test-Path $EnvFile)) {
    Write-Warn ".env not found. Creating from template..."
    Copy-Item (Join-Path $BackendPath ".env.example") $EnvFile
    Write-Success "Created .env file"
}

# Read .env
$EnvContent = Get-Content $EnvFile -Raw

# Process environment
switch ($NormalizedEnv) {
    'local' {
        Write-Info "Configuring for LOCAL mode"
        $FrontendUrl = "https://localhost:8443"
        $AllowedOrigins = "http://localhost:3000,http://localhost:8081,http://localhost:19000,https://localhost:3000,https://localhost:8081,https://localhost:8443"
        
        Write-Success "Frontend URL: $FrontendUrl"
        Write-Success "Allowed Origins: $AllowedOrigins"
    }
    
    'network' {
        Write-Info "Configuring for NETWORK mode"
        Write-Info "Detecting IP address..."
        
        $IP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
            $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" 
        } | Select-Object -First 1).IPAddress
        
        if ($IP) {
            $FrontendUrl = "http://" + $IP + ":8081"
            $AllowedOrigins = "http://" + $IP + ":8081,http://" + $IP + ":19000,http://localhost:8081,http://localhost:19000,https://localhost:8081"
            
            Write-Success "Detected IP: $IP"
            Write-Success "Frontend URL: $FrontendUrl"
            Write-Success "Allowed Origins: $AllowedOrigins"
            Write-Host ""
            Write-Warn "NEXT STEPS:"
            Write-Host "  1. Restart backend server (Ctrl+C, then run s.bat)"
            Write-Host "  2. s.bat will auto-detect network mode and start frontend with LAN access" -ForegroundColor Yellow
            Write-Host "  3. On mobile: Open Expo Go, scan QR code or enter exp://$IP:8081" -ForegroundColor Yellow
            Write-Host "  4. Test verification: Register student, check email/WhatsApp, click link" -ForegroundColor Yellow
        } else {
            Write-Host "Could not detect IP. Find it with: ipconfig | findstr IPv4" -ForegroundColor Red
            exit 1
        }
    }
    
    'production' {
        Write-Info "Production deployment requires Render configuration"
        Write-Host ""
        Write-Host "RENDER SETUP:" -ForegroundColor Cyan
        Write-Host "1. Push to GitHub:"
        Write-Host "   git add ."
        Write-Host "   git commit -m 'Deploy'"
        Write-Host "   git push"
        Write-Host ""
        Write-Host "2. In Render Dashboard (dashboard.render.com):"
        Write-Host "   Set environment variables:"
        Write-Host "   FRONTEND_URL=https://your-app.onrender.com"
        Write-Host "   ALLOWED_ORIGINS=https://your-app.onrender.com"
        Write-Host ""
        exit 0
    }
}

# Update .env for local and network modes
if ($NormalizedEnv -ne 'production') {
    $EnvContent = $EnvContent -replace 'FRONTEND_URL=.*', "FRONTEND_URL=$FrontendUrl"
    $EnvContent = $EnvContent -replace 'ALLOWED_ORIGINS=.*', "ALLOWED_ORIGINS=$AllowedOrigins"
    $EnvContent | Set-Content $EnvFile -NoNewline -Encoding UTF8
    
    Write-Success "Updated .env file"
    Write-Info "File: $EnvFile"
}
