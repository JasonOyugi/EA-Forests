# Installs or refreshes the two EA Forests Hermes cron jobs:
#   - EA Forests skill scout      09:00 on the 1st and 15th: safe updates and recommendations
#   - EA Forests skill installer  hourly: installs skills approved in automation/skills.json
# Run from anywhere:  powershell -ExecutionPolicy Bypass -File automation\skill-scout\install-hermes-job.ps1
# Re-run it after editing the scripts or prompt.md. Jobs are replaced, not duplicated.

# By default the scout delivers its report as is (no model needed). Pass -WithAgent once Hermes
# has a working model provider (`hermes status`) to get a short written briefing instead.
param([switch]$WithAgent)

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$hermesHome = if ($env:HERMES_HOME) { $env:HERMES_HOME } else { Join-Path $env:LOCALAPPDATA 'hermes' }
if (-not (Get-Command hermes -ErrorAction SilentlyContinue)) { throw 'hermes is not on PATH.' }

# Hermes only runs cron scripts from <HERMES_HOME>\scripts.
$scriptsDir = Join-Path $hermesHome 'scripts'
New-Item -ItemType Directory -Force $scriptsDir | Out-Null
Copy-Item (Join-Path $here 'scout_skills.py') (Join-Path $scriptsDir 'ea_forests_skill_scout.py') -Force
Copy-Item (Join-Path $here 'install_approved.py') (Join-Path $scriptsDir 'ea_forests_skill_installer.py') -Force
Write-Output "Copied the scripts to $scriptsDir"

# The installer needs a checkout of the repo (any worktree finds the rest) and where approvals live.
$commonDir = (git -C $here rev-parse --path-format=absolute --git-common-dir).Trim()
$repoRoot = Split-Path -Parent $commonDir
$remote = (git -C $here remote get-url origin).Trim() -replace '\.git$', ''
if ($remote -notmatch 'github\.com[/:]([^/]+)/([^/]+)$') { throw "Cannot work out the GitHub repository from $remote" }
$approvalsUrl = "https://raw.githubusercontent.com/$($Matches[1])/$($Matches[2])/main/automation/skills.json"
$stateDir = Join-Path $hermesHome 'skill-scout'
New-Item -ItemType Directory -Force $stateDir | Out-Null
$config = @{ repo = ($repoRoot -replace '\\', '/'); approvals_url = $approvalsUrl } | ConvertTo-Json
[IO.File]::WriteAllText((Join-Path $stateDir 'config.json'), $config, (New-Object Text.UTF8Encoding $false))
Write-Output "Installer config: repo $repoRoot, approvals $approvalsUrl"

function Get-JobIds([string]$name) {
    $ids = @()
    $lines = @(hermes cron list)
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "^\s+([0-9a-f]{8,})\s+\[") {
            $jobId = $Matches[1]
            if (($i + 1) -lt $lines.Count -and $lines[$i + 1] -match "Name:\s+$([regex]::Escape($name))\s*$") { $ids += $jobId }
        }
    }
    return $ids
}

# Creates the new job first and removes old ones only if that worked.
function Set-Job([string]$name, [string[]]$createArgs) {
    $oldIds = Get-JobIds $name
    $created = hermes cron create @createArgs --name $name
    $created
    if (-not ($created -match 'Created job:')) { throw "Creating '$name' failed; the existing job was left in place." }
    foreach ($id in $oldIds) {
        Write-Output "Removed the previous job $id"
        hermes cron remove $id | Out-Null
    }
}

if ($WithAgent) {
    $prompt = Get-Content (Join-Path $here 'prompt.md') -Raw -Encoding UTF8
    # Windows PowerShell 5.1 does not escape embedded double quotes for native programs.
    if ($PSVersionTable.PSVersion.Major -lt 7) { $prompt = $prompt -replace '"', '\"' }
    Set-Job 'EA Forests skill scout' @('0 9 1,15 * *', $prompt, '--script', 'ea_forests_skill_scout.py', '--deliver', 'local')
} else {
    Set-Job 'EA Forests skill scout' @('0 9 1,15 * *', '--script', 'ea_forests_skill_scout.py', '--no-agent', '--deliver', 'local')
}
# Hourly and silent unless an approval changed something.
Set-Job 'EA Forests skill installer' @('0 * * * *', '--script', 'ea_forests_skill_installer.py', '--no-agent', '--deliver', 'local')

Write-Output ''
Write-Output 'Jobs only fire while the Hermes scheduler runs. Check with:  hermes cron status'
Write-Output 'Start it at login with:                                      hermes gateway install'
