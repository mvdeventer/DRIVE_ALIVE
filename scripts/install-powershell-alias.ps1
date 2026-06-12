$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$sBatPath = Join-Path $repoRoot "s.bat"

if (-not (Test-Path $sBatPath)) {
  Write-Error "Could not find s.bat at $sBatPath"
  exit 1
}

if (-not (Test-Path $PROFILE)) {
  New-Item -ItemType File -Path $PROFILE -Force | Out-Null
}

$profileLine = "function s { & '$sBatPath' @args }"
$profileContent = Get-Content $PROFILE -Raw

if ($profileContent -notmatch "function\s+s\s*\{") {
  Add-Content -Path $PROFILE -Value "`n$profileLine`n"
  Write-Host "Added 's' function to $PROFILE"
} else {
  Write-Host "'s' function already exists in $PROFILE"
}

Write-Host "Restart PowerShell, then run: s webtest"
