# Stop anything on port 3001, remove corrupted .next cache, then start dev.
$ErrorActionPreference = "SilentlyContinue"
$root = Split-Path -Parent $PSScriptRoot

Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue |
  ForEach-Object { taskkill /PID $_.OwningProcess /F 2>$null }

Start-Sleep -Seconds 1

$nextDir = Join-Path $root ".next"
if (Test-Path $nextDir) {
  Remove-Item -Recurse -Force $nextDir
  Write-Host "Removed .next cache"
}

Set-Location $root
npm run dev
