[CmdletBinding()]
param([switch]$Startup)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'runtime_update.ps1')
try {
    Invoke-ProjectRuntimeUpdate -ProjectRoot (Split-Path -Parent $PSScriptRoot) -Startup:$Startup
} catch {
    Write-Host ('[MaaYMZX] Runtime setup failed: ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
}
