[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$MaaYuanPath,
    [switch]$Background,
    [switch]$LibraryOnly
)
$ErrorActionPreference = 'Stop'

function Invoke-NightfallThenMaaYuan {
    param([scriptblock]$RunNightfall, [scriptblock]$StartMaaYuan, [scriptblock]$Log)
    try {
        $result = & $RunNightfall
        & $Log "Nightfall exited with code $result."
    } catch {
        & $Log ("Nightfall failed: " + $_.Exception.Message)
    }
    & $Log 'Starting MaaYuan.'
    & $StartMaaYuan
}

if ($LibraryOnly) { return }
$MaaYuanPath = [IO.Path]::GetFullPath($MaaYuanPath)
if (!(Test-Path -LiteralPath $MaaYuanPath -PathType Leaf)) { throw "MaaYuan executable not found: $MaaYuanPath" }
$windowsPowerShell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
if ($Background) {
    $workerArgs = @('-NoProfile','-ExecutionPolicy','Bypass','-File',('"' + $PSCommandPath + '"'),'-MaaYuanPath',('"' + $MaaYuanPath + '"'))
    $worker = Start-Process -FilePath $windowsPowerShell -ArgumentList $workerArgs -WindowStyle Hidden -PassThru
    Write-Host ("Nightfall -> MaaYuan started in background. PID: " + $worker.Id)
    return
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$logDirectory = Join-Path $projectRoot 'debug\daily-chain'
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
$logPath = Join-Path $logDirectory ((Get-Date -Format 'yyyyMMdd-HHmmss') + "-$PID.log")
$writeLog = {
    param($message)
    Add-Content -LiteralPath $logPath -Value ("[" + (Get-Date -Format 'HH:mm:ss') + "] " + $message) -Encoding UTF8
}
try {
    Invoke-NightfallThenMaaYuan -RunNightfall {
        & $writeLog 'Starting Nightfall with all modules.'
        $nightArgs = @('-NoProfile','-ExecutionPolicy','Bypass','-File',('"' + (Join-Path $PSScriptRoot 'run_daily.ps1') + '"'),'all')
        $night = Start-Process -FilePath $windowsPowerShell -ArgumentList $nightArgs -WindowStyle Hidden -PassThru -RedirectStandardOutput ($logPath + '.nightfall.log') -RedirectStandardError ($logPath + '.nightfall-error.log')
        # Wait for this script only, not the emulator processes it started.
        $null = $night.Handle
        $night.WaitForExit()
        return $night.ExitCode
    } -StartMaaYuan {
        Start-Process -FilePath $MaaYuanPath -WorkingDirectory (Split-Path -Parent $MaaYuanPath) | Out-Null
    } -Log $writeLog
} catch {
    & $writeLog ("Chain failed: " + $_.Exception.Message)
    exit 1
}
