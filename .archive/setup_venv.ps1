# Setup Script for VS Code Python Environment

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Python Virtual Environment Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$venvPath = "$PSScriptRoot\.venv"
$backendPath = "$PSScriptRoot\backend"
$frontendPath = "$PSScriptRoot\frontend"

# Check if venv exists
if (Test-Path $venvPath) {
    Write-Host "✓ Virtual environment found at $venvPath" -ForegroundColor Green
} else {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv $venvPath
    Write-Host "✓ Virtual environment created" -ForegroundColor Green
}

# Activate venv
Write-Host "`nActivating virtual environment..." -ForegroundColor Yellow
& "$venvPath\Scripts\Activate.ps1"

# Install Python packages
Write-Host "`nInstalling Python packages..." -ForegroundColor Yellow
Set-Location $backendPath
python -m pip install --upgrade pip
pip install -r requirements.txt

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Python packages installed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Error installing Python packages" -ForegroundColor Red
}

# Install frontend packages
Set-Location $frontendPath
Write-Host "`nInstalling frontend packages..." -ForegroundColor Yellow
& "npm" install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Frontend packages installed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Error installing frontend packages" -ForegroundColor Red
}

Set-Location $PSScriptRoot

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nVirtual environment: $venvPath" -ForegroundColor Yellow
Write-Host "Python interpreter: $venvPath\Scripts\python.exe" -ForegroundColor Yellow
Write-Host "`nTo activate venv manually:" -ForegroundColor Cyan
Write-Host "  .\.venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "`nTo start backend:" -ForegroundColor Cyan
Write-Host "  cd backend\app" -ForegroundColor White
Write-Host "  uvicorn main:app --reload" -ForegroundColor White
Write-Host "`nTo start frontend:" -ForegroundColor Cyan
Write-Host "  cd frontend" -ForegroundColor White
Write-Host "  npm start" -ForegroundColor White
Write-Host ""
