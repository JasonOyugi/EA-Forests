[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$HermesArgs
)

$hermesHome = if ($env:HERMES_HOME) {
    $env:HERMES_HOME
} else {
    Join-Path $env:LOCALAPPDATA "hermes"
}

$hermesExe = Join-Path $hermesHome "hermes-agent\venv\Scripts\hermes.exe"

if (-not (Test-Path -LiteralPath $hermesExe -PathType Leaf)) {
    Write-Error "Hermes was not found at '$hermesExe'. Set HERMES_HOME or install Hermes first."
    exit 1
}

& $hermesExe @HermesArgs
exit $LASTEXITCODE
