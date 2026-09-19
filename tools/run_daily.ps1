[CmdletBinding()]
param(
    [Parameter(Position = 0, ValueFromRemainingArguments = $true)]
    [string[]]$Modules,
    [switch]$Check,
    [switch]$Probe
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'local_mumu.ps1')
$adbExe = 'C:\Program Files\Netease\MuMu\nx_main\adb.exe'
$deviceAddress = $null
$gamePackage = 'com.bmystu.peng.gw'

. (Join-Path $PSScriptRoot 'runtime_update.ps1')
try {
    if (!(Test-Path -LiteralPath (Join-Path $projectRoot '.gui-release'))) { Invoke-ProjectRuntimeUpdate -ProjectRoot $projectRoot -Startup }
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
    try {
        . (Join-Path $PSScriptRoot 'mumu.ps1')
        $manager = Find-MuMuManager $env:MAANIGHTFALL_MUMU_MANAGER
        $info = Get-MuMuInstance $manager ([int]$env:MAANIGHTFALL_MUMU_INSTANCE)
        if ($info.is_android_started -and [int]$info.adb_port -gt 0) {
            $deviceAddress = ([string]$info.adb_host_ip + ':' + $info.adb_port)
            & $adbExe -s $deviceAddress shell am force-stop $gamePackage *> $null
        }
    } catch {
        Write-Warning 'Could not resolve the selected emulator; skipping cleanup.'
    }
}

exit $runResult
