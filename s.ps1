param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$CliArgs
)

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$batPath = Join-Path $repoRoot "s.bat"

if (-not (Test-Path $batPath)) {
  Write-Error "Could not find s.bat at $batPath"
  exit 1
}

& $batPath @CliArgs
exit $LASTEXITCODE
