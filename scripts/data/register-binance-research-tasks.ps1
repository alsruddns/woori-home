$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$url = [Environment]::GetEnvironmentVariable('BINANCE_RESEARCH_DATABASE_URL', 'User')
if (-not $url -or $url -notmatch '^postgresql://woori_crypto_research_app@127\.0\.0\.1:55432/woori_crypto_research$') {
  throw 'Set the dedicated loopback BINANCE_RESEARCH_DATABASE_URL before registering local research tasks.'
}
$user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 2) -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
$start = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$repo\scripts\data\start-binance-research-postgres.ps1`""
$startTrigger = New-ScheduledTaskTrigger -AtLogOn -User $user
Register-ScheduledTask -TaskName 'Woori Crypto Research PostgreSQL' -Action $start -Trigger $startTrigger -Settings $settings -Principal $principal -Description 'Starts the loopback-only personal crypto research database.' -Force | Out-Null
$update = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$repo\scripts\data\run-binance-research-daily.ps1`""
$updateTrigger = New-ScheduledTaskTrigger -Daily -At '11:00AM'
Register-ScheduledTask -TaskName 'Woori Crypto Research Daily Update' -Action $update -Trigger $updateTrigger -Settings $settings -Principal $principal -Description 'Refreshes verified Binance Vision daily candles in the local private research database.' -Force | Out-Null
Get-ScheduledTask -TaskName 'Woori Crypto Research PostgreSQL','Woori Crypto Research Daily Update' | Select-Object TaskName,State
