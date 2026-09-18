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

if (-not (Test-Path -LiteralPath $adbExe -PathType Leaf)) {
    Write-Error "MuMu ADB was not found: $adbExe"
    exit 2
}

$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
if ($nodeCommand) {
    $nodeExe = $nodeCommand.Source
}
else {
    $nodeExe = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
    if (-not (Test-Path -LiteralPath $nodeExe -PathType Leaf)) {
        Write-Error 'Node.js was not found. Install Node.js 20 or later.'
        exit 3
    }
}

Set-Location -LiteralPath $projectRoot

$arguments = @((Join-Path $PSScriptRoot 'run_daily.mjs'))
if ($Check) { $arguments += '--check' }
if ($Probe) { $arguments += '--probe' }
if ($Modules) { $arguments += @('--modules', ($Modules -join ' ')) }

& $nodeExe @arguments
$runResult = $LASTEXITCODE

if ($runResult -ne 0 -and -not $Check) {
    Write-Host '[MaaYMZX] The run failed. Stopping the game...'
    & $adbExe -s $deviceAddress shell am force-stop $gamePackage *> $null
}

exit $runResult
