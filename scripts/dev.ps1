[CmdletBinding()]
param(
    [ValidateSet('start', 'status', 'stop', 'restart')]
    [string]$Action = 'start'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $repoRoot 'backend'
$frontendRoot = Join-Path $repoRoot 'vite-version'
$runtimeRoot = Join-Path $repoRoot '.cache/dev'
$pythonExe = Join-Path $backendRoot '.venv/Scripts/python.exe'
$databaseRuntime = Join-Path $backendRoot '.cache/canonical-runtime'
$apiUrl = 'http://127.0.0.1:8000'
$appUrl = 'http://127.0.0.1:5173'
New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null

function Get-LocalJson([string]$Url) {
    try { return Invoke-RestMethod -Uri $Url -TimeoutSec 10 }
    catch { return $null }
}

function Stop-ManagedService([string]$Name) {
    $recordPath = Join-Path $runtimeRoot "$Name.process.json"
    if (-not (Test-Path -LiteralPath $recordPath)) { return }
    $record = Get-Content -Raw -LiteralPath $recordPath | ConvertFrom-Json
    $serviceProcess = Get-Process -Id $record.pid -ErrorAction SilentlyContinue
    if ($serviceProcess) {
        # A reused PID must never cause an unrelated application to be stopped.
        if ($serviceProcess.StartTime.ToUniversalTime().Ticks.ToString() -ne $record.started -or
            $serviceProcess.Path -ne $record.path) {
            throw "$Name process identity changed. Inspect $recordPath before removing its stale record."
        }
        & taskkill.exe /PID $record.pid /T /F | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "Could not stop $Name (PID $($record.pid))." }
        Write-Host "Stopped $Name."
    }
    Remove-Item -LiteralPath $recordPath -Force
}

function Start-ManagedService([string]$Name, [string]$Executable, [string[]]$Arguments, [string]$Directory) {
    $recordPath = Join-Path $runtimeRoot "$Name.process.json"
    if (Test-Path -LiteralPath $recordPath) {
        $record = Get-Content -Raw -LiteralPath $recordPath | ConvertFrom-Json
        if (Get-Process -Id $record.pid -ErrorAction SilentlyContinue) {
            throw "$Name has a tracked process but is not ready. Inspect .cache/dev/$Name.err.log; use restart after resolving the error."
        }
    }
    $serviceProcess = Start-Process -WindowStyle Hidden -FilePath $Executable -ArgumentList $Arguments `
        -WorkingDirectory $Directory -RedirectStandardOutput (Join-Path $runtimeRoot "$Name.out.log") `
        -RedirectStandardError (Join-Path $runtimeRoot "$Name.err.log") -PassThru
    @{
        pid = $serviceProcess.Id
        started = $serviceProcess.StartTime.ToUniversalTime().Ticks.ToString()
        path = $serviceProcess.Path
    } | ConvertTo-Json | Set-Content -LiteralPath $recordPath -Encoding UTF8
}

function Wait-LocalService([string]$Url, [string]$Name) {
    $deadline = (Get-Date).AddSeconds(90)
    do {
        $result = Get-LocalJson $Url
        if ($result -and $result.status -eq 'ok') { return }
        Start-Sleep -Milliseconds 500
    } while ((Get-Date) -lt $deadline)
    throw "$Name did not become ready. See .cache/dev/$Name.err.log and check whether its port is already in use."
}

function Show-SystemStatus {
    $health = Get-LocalJson "$apiUrl/api/health"
    $ready = Get-LocalJson "$apiUrl/api/ready"
    $proxy = Get-LocalJson "$appUrl/api/ready"
    Write-Host "Backend:  $(if ($health -and $health.status -eq 'ok') { 'running' } else { 'stopped/unreachable' }) ($apiUrl)"
    Write-Host "System:   $(if ($ready -and $ready.status -eq 'ok') { 'ready (database, schema, artifacts, admin)' } else { 'not ready; run start and inspect its diagnostic' })"
    Write-Host "Frontend: $(if ($proxy -and $proxy.status -eq 'ok') { 'running; API proxy ready' } else { 'not ready' }) ($appUrl)"
    Write-Host "Logs:     $runtimeRoot"
    return [bool]($ready -and $proxy -and $ready.status -eq 'ok' -and $proxy.status -eq 'ok')
}

try {
    if ($Action -eq 'status') {
        if (Show-SystemStatus) { exit 0 } else { exit 1 }
    }
    if ($Action -in @('stop', 'restart')) {
        Stop-ManagedService 'frontend'
        Stop-ManagedService 'backend'
        if ($Action -eq 'stop') {
            Write-Host 'PostgreSQL remains running; existing data is preserved.'
            exit 0
        }
    }
    if (-not (Test-Path -LiteralPath $pythonExe)) {
        throw 'Backend environment missing. Run: uv sync --project backend --locked'
    }
    $nodeExe = (Get-Command node.exe -ErrorAction Stop).Source
    if (-not (Test-Path -LiteralPath (Join-Path $frontendRoot 'node_modules/vite/bin/vite.js'))) {
        throw 'Frontend dependencies missing. Run: pnpm --dir vite-version install --frozen-lockfile'
    }

    # uvicorn[standard] installs python-dotenv. Process environment takes precedence.
    $envFile = Join-Path $backendRoot '.env'
    if (Test-Path -LiteralPath $envFile) {
        $settingsJson = & $pythonExe -c 'import json, sys; from dotenv import dotenv_values; print(json.dumps(dotenv_values(sys.argv[1])))' $envFile
        if ($LASTEXITCODE -ne 0) { throw 'Could not read backend/.env; run uv sync --project backend --locked.' }
        $settings = $settingsJson | ConvertFrom-Json
        foreach ($property in $settings.PSObject.Properties) {
            if ($null -ne $property.Value -and -not [Environment]::GetEnvironmentVariable($property.Name, 'Process')) {
                [Environment]::SetEnvironmentVariable($property.Name, [string]$property.Value, 'Process')
            }
        }
    }
    $env:PYTHONDONTWRITEBYTECODE = '1'
    if (-not $env:CANONICAL_DATABASE_URL) {
        if (Test-Path -LiteralPath (Join-Path $databaseRuntime 'pgdata/PG_VERSION')) {
            $env:CANONICAL_DATABASE_URL = 'postgresql+psycopg://ea_forests@127.0.0.1:55433/ea_forests_import'
        } else {
            throw 'Set CANONICAL_DATABASE_URL in backend/.env. See backend/README.md for fresh database setup.'
        }
    }
    if (-not $env:CANONICAL_API_TOKEN) {
        $env:CANONICAL_API_TOKEN = & $pythonExe -c 'import secrets; print(secrets.token_urlsafe(32))'
        if ($LASTEXITCODE -ne 0) { throw 'Could not generate the local admin credential.' }
    }
    if (-not $env:CANONICAL_ARTIFACT_ROOT) { $env:CANONICAL_ARTIFACT_ROOT = '.cache/canonical-artifacts' }
    if (-not [IO.Path]::IsPathRooted($env:CANONICAL_ARTIFACT_ROOT)) {
        $env:CANONICAL_ARTIFACT_ROOT = Join-Path $backendRoot $env:CANONICAL_ARTIFACT_ROOT
    }
    New-Item -ItemType Directory -Force -Path $env:CANONICAL_ARTIFACT_ROOT | Out-Null

    # Only manage the already-installed portable database for its documented URL.
    # Other PostgreSQL/Docker installations remain under the user's control.
    if ($env:CANONICAL_DATABASE_URL -match '@(127\.0\.0\.1|localhost):55433/' -and
        (Test-Path -LiteralPath (Join-Path $databaseRuntime 'pgdata/PG_VERSION'))) {
        & (Join-Path $databaseRuntime 'pgsql/bin/pg_isready.exe') -h 127.0.0.1 -p 55433 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            & (Join-Path $databaseRuntime 'pgsql/bin/pg_ctl.exe') -D (Join-Path $databaseRuntime 'pgdata') `
                -l (Join-Path $databaseRuntime 'postgres.log') -o '-h 127.0.0.1 -p 55433' -w start
            if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL could not start. Inspect backend/.cache/canonical-runtime/postgres.log.' }
        }
    }
    Push-Location $backendRoot
    try {
        $diagnosticJson = & $pythonExe -c 'import json; from app.readiness import system_readiness; print(json.dumps(system_readiness()))'
        if ($LASTEXITCODE -ne 0) { throw 'Backend imports failed. Run uv sync --project backend --locked.' }
        $diagnostic = $diagnosticJson | ConvertFrom-Json
        if ($diagnostic.status -ne 'ok') {
            Write-Host $diagnosticJson
            throw 'System is not ready. Check backend/.env. If schema says migration_required, back up your database, then run uv run --env-file .env alembic upgrade head from backend.'
        }
    } finally { Pop-Location }

    $health = Get-LocalJson "$apiUrl/api/health"
    if (-not $health -or $health.status -ne 'ok') {
        Start-ManagedService 'backend' $pythonExe @('-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000') $backendRoot
        Wait-LocalService "$apiUrl/api/health" 'backend'
    }
    $ready = Get-LocalJson "$apiUrl/api/ready"
    if (-not $ready -or $ready.status -ne 'ok') {
        throw 'The backend already listening on port 8000 is not fully configured. Stop that older server in its terminal, or use restart if this script started it.'
    }
    $frontend = Get-LocalJson "$appUrl/api/health"
    if (-not $frontend -or $frontend.status -ne 'ok') {
        Start-ManagedService 'frontend' $nodeExe @('node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort') $frontendRoot
        Wait-LocalService "$appUrl/api/health" 'frontend'
    }
    # Exercise the same cookie and proxy path used by the browser, without printing credentials.
    $browserSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $bootstrap = Invoke-RestMethod -Uri "$appUrl/api/canonical/session/bootstrap" -Method Post `
        -Headers @{ Origin = $appUrl } -WebSession $browserSession -TimeoutSec 10
    if (-not $bootstrap.session_active) { throw 'The browser session could not be established.' }
    $null = Invoke-RestMethod -Uri "$appUrl/api/canonical/worlds" -WebSession $browserSession -TimeoutSec 15
    if (-not (Show-SystemStatus)) { throw 'The API proxy did not pass the final readiness check.' }
    Write-Host "Open $appUrl (reload the page after a backend restart)."
    Write-Host 'Services run in the background. Stop them with: npm run system:stop'
} catch {
    Write-Error $_ -ErrorAction Continue
    exit 1
}
