[CmdletBinding()]
param(
    [Parameter(Position = 0, ValueFromRemainingArguments = $true)]
    [string[]]$Modules,
    [switch]$Check,
    [switch]$Probe
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$adbExe = 'C:\Program Files\Netease\MuMu\nx_main\adb.exe'
$deviceAddress = '127.0.0.1:16384'
$gamePackage = 'com.bmystu.peng.gw'

. (Join-Path $PSScriptRoot 'runtime_update.ps1')
try {
    Invoke-ProjectRuntimeUpdate -ProjectRoot $projectRoot -Startup
} catch {
    Write-Host ('[MaaYMZX] Runtime setup failed: ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
}

. (Join-Path $PSScriptRoot 'resolve_node.ps1')
$nodeExe = Resolve-ProjectNode -ProjectRoot $projectRoot

Set-Location -LiteralPath $projectRoot

$arguments = @((Join-Path $PSScriptRoot 'run_daily.mjs'))
if ($Check) { $arguments += '--check' }
if ($Probe) { $arguments += '--probe' }
if ($Modules) { $arguments += @('--modules', ($Modules -join ' ')) }

& $nodeExe @arguments
$runResult = $LASTEXITCODE

if ($runResult -ne 0 -and -not $Check -and -not $Probe -and (Test-Path -LiteralPath $adbExe)) {
    Write-Host '[MaaYMZX] The run failed. Stopping the game...'
    & $adbExe -s $deviceAddress shell am force-stop $gamePackage *> $null
}

exit $runResult
