# Installs or refreshes the EA Forests skill scout as a Hermes cron job.
# Run from anywhere:  powershell -ExecutionPolicy Bypass -File automation\skill-scout\install-hermes-job.ps1
# Re-run it after editing scout_skills.py or prompt.md. The job is replaced, not duplicated.

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$hermesHome = if ($env:HERMES_HOME) { $env:HERMES_HOME } else { Join-Path $env:LOCALAPPDATA 'hermes' }
$jobName = 'EA Forests skill scout'
$scriptName = 'ea_forests_skill_scout.py'
$schedule = '0 9 1,15 * *'   # 09:00 local time on the 1st and 15th

if (-not (Get-Command hermes -ErrorAction SilentlyContinue)) { throw 'hermes is not on PATH.' }

# Hermes only runs cron scripts from <HERMES_HOME>\scripts.
$scriptsDir = Join-Path $hermesHome 'scripts'
New-Item -ItemType Directory -Force $scriptsDir | Out-Null
Copy-Item (Join-Path $here 'scout_skills.py') (Join-Path $scriptsDir $scriptName) -Force
Write-Output "Copied the scout to $scriptsDir\$scriptName"

# Find existing jobs with the same name; they are removed only after the new one is created.
$oldIds = @()
$lines = @(hermes cron list)
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^\s+([0-9a-f]{8,})\s+\[") {
        $jobId = $Matches[1]
        if (($i + 1) -lt $lines.Count -and $lines[$i + 1] -match "Name:\s+$([regex]::Escape($jobName))\s*$") { $oldIds += $jobId }
    }
}

$prompt = Get-Content (Join-Path $here 'prompt.md') -Raw -Encoding UTF8
# Windows PowerShell 5.1 does not escape embedded double quotes for native programs.
if ($PSVersionTable.PSVersion.Major -lt 7) { $prompt = $prompt -replace '"', '\"' }
$created = hermes cron create $schedule $prompt --name $jobName --script $scriptName --deliver local
$created
if (-not ($created -match 'Created job:')) { throw 'Creating the job failed; the existing job was left in place.' }
foreach ($id in $oldIds) {
    Write-Output "Removed the previous job $id"
    hermes cron remove $id | Out-Null
}

Write-Output ''
Write-Output 'The job only fires while the Hermes scheduler runs. Check with:  hermes cron status'
Write-Output 'Start it at login with:                                      hermes gateway install'
