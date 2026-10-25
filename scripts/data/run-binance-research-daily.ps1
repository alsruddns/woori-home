$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$base = Join-Path $env:LOCALAPPDATA 'WooriCryptoResearch'
$url = [Environment]::GetEnvironmentVariable('BINANCE_RESEARCH_DATABASE_URL', 'User')
if (-not $url) { throw 'BINANCE_RESEARCH_DATABASE_URL is not configured for this Windows user.' }
$env:BINANCE_RESEARCH_DATABASE_URL = $url
$env:BINANCE_RESEARCH_DATA_DIR = Join-Path $base 'archive'
$node = (Get-Command node.exe -ErrorAction Stop).Source
$pgReady = 'C:\Program Files\PostgreSQL\16\bin\pg_isready.exe'
$log = Join-Path $base 'daily-update.log'
New-Item -ItemType Directory -Path $base -Force | Out-Null
for ($attempt = 0; $attempt -lt 30; $attempt++) {
  & $pgReady -h 127.0.0.1 -p 55432 -q
  if ($LASTEXITCODE -eq 0) { break }
  Start-Sleep -Seconds 2
}
if ($LASTEXITCODE -ne 0) { throw 'Research PostgreSQL did not start after the logon task.' }
Push-Location $repo
try {
  & $node 'scripts/data/binance-research-import.mjs' 'daily' *>> $log
  exit $LASTEXITCODE
} finally { Pop-Location }
