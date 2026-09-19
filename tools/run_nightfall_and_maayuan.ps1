[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$MaaYuanPath,
    [ValidateRange(0,65535)][int]$MaaYuanInstance = 0,
    [switch]$Background
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'local_mumu.ps1')
if ([int]$env:MAANIGHTFALL_MUMU_INSTANCE -eq $MaaYuanInstance) { throw 'Parallel tasks must use different MuMu instances.' }
$MaaYuanPath = [IO.Path]::GetFullPath($MaaYuanPath)
if (!(Test-Path -LiteralPath $MaaYuanPath -PathType Leaf)) { throw 'MaaYuan executable not found.' }
$ps = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
if ($Background) {
    Start-Process -FilePath $ps -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',('"' + $PSCommandPath + '"'),'-MaaYuanPath',('"' + $MaaYuanPath + '"'),'-MaaYuanInstance',"$MaaYuanInstance") -WindowStyle Hidden
    return
}
$root = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $root 'debug\daily-parallel'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$log = Join-Path $logDir ((Get-Date -Format 'yyyyMMdd-HHmmss') + "-$PID")
# Start Nightfall independently; do not wait before starting MaaYuan.
Start-Process -FilePath $ps -WorkingDirectory $root -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',('"' + (Join-Path $PSScriptRoot 'run_daily.ps1') + '"'),'all') -WindowStyle Hidden -RedirectStandardOutput ($log + '.nightfall.log') -RedirectStandardError ($log + '.nightfall-error.log')
. (Join-Path $PSScriptRoot 'mumu.ps1')
try {
    $device = Start-MuMuInstance -Instance $MaaYuanInstance
    Add-Content -LiteralPath ($log + '.log') -Value ("MaaYuan device ready: " + $device.address)
    if (!(Get-Process MaaYuan -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $MaaYuanPath })) {
        Start-Process -FilePath $MaaYuanPath -WorkingDirectory (Split-Path -Parent $MaaYuanPath) -WindowStyle Hidden
    }
} catch {
    Add-Content -LiteralPath ($log + '.log') -Value $_.Exception.Message
    throw
}
