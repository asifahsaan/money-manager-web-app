# Registers a Windows Scheduled Task that runs `npm run mirror:sync` once a day.
# If the PC is off at the scheduled time, the task runs as soon as it is back on.
#
#   powershell -ExecutionPolicy Bypass -File scripts\mirror\register-daily-task.ps1            # 23:00 daily
#   powershell -ExecutionPolicy Bypass -File scripts\mirror\register-daily-task.ps1 -At 21:30
#   powershell -ExecutionPolicy Bypass -File scripts\mirror\register-daily-task.ps1 -Remove
param(
  [string]$At = '23:00',
  [string]$TaskName = 'MoneyManager-MirrorSync',
  [switch]$Remove
)

if ($Remove) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Write-Host "Removed scheduled task '$TaskName'."
  return
}

$backendDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$npm = (Get-Command npm.cmd -ErrorAction Stop).Source

$action = New-ScheduledTaskAction -Execute 'cmd.exe' `
  -Argument "/c `"(if not exist backups mkdir backups) && `"$npm`" run mirror:sync >> backups\mirror-task-output.log 2>&1`"" `
  -WorkingDirectory $backendDir
$trigger = New-ScheduledTaskTrigger -Daily -At $At
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings `
  -Description 'Copies the Money Manager production PostgreSQL DB into the local database mirror.' -Force | Out-Null

Write-Host "Scheduled task '$TaskName' will run daily at $At in $backendDir"
Write-Host "Run it now with:  Start-ScheduledTask -TaskName $TaskName"
