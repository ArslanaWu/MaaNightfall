[CmdletBinding()]
param(
    [Parameter(Position = 0, ValueFromRemainingArguments = $true)]
    [string[]]$Modules,
    [switch]$Check,
    [switch]$Probe
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$adbExe = 'C:\Program Files\Netease\MuMu\nx_device\12.0\shell\adb.exe'
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

function Connect-MuMuAdb {
    param(
        [int]$Attempts,
        [int]$DelaySeconds
    )

    for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
        $connectMessage = & $adbExe connect $deviceAddress 2>&1
        if ($connectMessage) { Write-Host ($connectMessage -join [Environment]::NewLine) }

        $stateOutput = & $adbExe -s $deviceAddress get-state 2>$null
        $stateExitCode = $LASTEXITCODE
        $deviceState = ($stateOutput | Out-String).Trim()
        if ($stateExitCode -eq 0 -and $deviceState -eq 'device') {
            return $true
        }

        if ($attempt -lt $Attempts) { Start-Sleep -Seconds $DelaySeconds }
    }

    return $false
}

if (-not $Check) {
    Write-Host '[MaaYMZX] Connecting to MuMu...'
    & $adbExe start-server *> $null
    $deviceReady = Connect-MuMuAdb -Attempts 3 -DelaySeconds 1

    if (-not $deviceReady) {
        Write-Host '[MaaYMZX] Normal connection failed. Restarting the ADB daemon...'
        & $adbExe disconnect $deviceAddress *> $null
        & $adbExe kill-server *> $null
        Start-Sleep -Seconds 1
        & $adbExe start-server *> $null
        $deviceReady = Connect-MuMuAdb -Attempts 5 -DelaySeconds 2
    }

    if (-not $deviceReady) {
        Write-Error "MuMu ADB did not become ready at $deviceAddress after reconnecting and restarting the daemon."
        exit 4
    }

    Start-Sleep -Milliseconds 500
}

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
