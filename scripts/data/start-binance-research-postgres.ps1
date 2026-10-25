$ErrorActionPreference = 'Stop'
$base = Join-Path $env:LOCALAPPDATA 'WooriCryptoResearch'
$data = Join-Path $base 'postgres-data'
$log = Join-Path $base 'postgres.log'
$pgCtl = 'C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe'
if (-not (Test-Path $data)) { throw 'Dedicated research PostgreSQL data directory is missing.' }
$env:BINANCE_RESEARCH_DATABASE_URL = [Environment]::GetEnvironmentVariable('BINANCE_RESEARCH_DATABASE_URL', 'User')
if (-not $env:BINANCE_RESEARCH_DATABASE_URL) { throw 'BINANCE_RESEARCH_DATABASE_URL is not configured for this Windows user.' }
& $pgCtl -D $data -l $log -o '-h 127.0.0.1 -p 55432' start
if ($LASTEXITCODE -ne 0) { throw 'Could not start the loopback-only research PostgreSQL cluster.' }
