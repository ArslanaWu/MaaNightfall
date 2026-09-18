[CmdletBinding()]
param(
    [ValidateRange(0,65535)][int]$Instance = 0,
    [string]$ManagerPath,
    [ValidateRange(0,600)][int]$TimeoutSeconds = 120
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
. (Join-Path $PSScriptRoot 'mumu.ps1')
try {
    Start-MuMuInstance -ManagerPath $ManagerPath -Instance $Instance -TimeoutSeconds $TimeoutSeconds | ConvertTo-Json -Compress
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}
