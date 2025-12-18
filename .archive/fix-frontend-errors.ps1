# Fix Frontend TypeScript Errors
# Run this script to install all dependencies and fix TypeScript configuration

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fixing Frontend TypeScript Errors" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$frontendPath = Join-Path $PSScriptRoot "frontend"

if (-not (Test-Path $frontendPath)) {
    Write-Host "Error: Frontend directory not found!" -ForegroundColor Red
    exit 1
}

Set-Location $frontendPath

Write-Host "Current Directory: $(Get-Location)" -ForegroundColor Yellow
Write-Host ""

# Install dependencies
Write-Host "Installing npm packages..." -ForegroundColor Green
Write-Host "This may take a few minutes..." -ForegroundColor Yellow
Write-Host ""

# Use cmd.exe to run npm to avoid PowerShell issues
& cmd /c "npm install"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Dependencies installed successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Error installing dependencies" -ForegroundColor Red
    Write-Host "Trying with --legacy-peer-deps..." -ForegroundColor Yellow
    & cmd /c "npm install --legacy-peer-deps"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Installation failed. Please run manually:" -ForegroundColor Red
        Write-Host "  cd frontend" -ForegroundColor White
        Write-Host "  npm install" -ForegroundColor White
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Verifying installation..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if key packages are installed
$packages = @("react", "react-native", "expo", "axios", "@react-navigation")
$allInstalled = $true

foreach ($package in $packages) {
    $packagePath = Join-Path "node_modules" $package
    if (Test-Path $packagePath) {
        Write-Host "OK $package" -ForegroundColor Green
    } else {
        Write-Host "MISSING $package" -ForegroundColor Red
        $allInstalled = $false
    }
}

Write-Host ""

if ($allInstalled) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "SUCCESS! All TypeScript errors fixed." -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Reload VS Code to see changes:" -ForegroundColor Yellow
    Write-Host "  Ctrl+Shift+P then Reload Window" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "Some packages are missing. Try:" -ForegroundColor Yellow
    Write-Host "  npm install --legacy-peer-deps" -ForegroundColor White
    Write-Host ""
}

Write-Host "To start the frontend:" -ForegroundColor Cyan
Write-Host "  npm start" -ForegroundColor White
Write-Host "  then press w for web" -ForegroundColor Gray
Write-Host ""

Set-Location $PSScriptRoot
