$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'mumu.ps1')
function Find-MuMuManager { return 'fake-manager.exe' }
function Wait-MuMuTick { }
function Get-MuMuDeviceParentId {
    param([int]$DevicePid)
    if ($DevicePid -ne 4242) { throw 'Wrong device PID' }
    return 8000
}
function Get-MuMuMainProcesses {
    $existing = [pscustomobject]@{ProcessId=7000;ParentProcessId=8000;CommandLine='"MuMuNxMain.exe"'}
    if ($script:scenario -eq 'cold' -and $script:reads -ge 3) {
        return @(
            $existing,
            [pscustomobject]@{ProcessId=7001;ParentProcessId=8000;CommandLine='"MuMuNxMain.exe"'},
            [pscustomobject]@{ProcessId=7002;ParentProcessId=9999;CommandLine='"MuMuNxMain.exe"'},
            [pscustomobject]@{ProcessId=7003;ParentProcessId=4242;CommandLine='"MuMuNxMain.exe" --from-device'}
        )
    }
    return @($existing)
}

function Stop-Process {
    param([int]$Id,[switch]$Force,$ErrorAction)
    $script:stoppedPids += $Id
}
function Invoke-MuMuManager {
    param($ManagerPath,$ManagerArguments)
    if ($ManagerArguments[0] -eq 'control') {
        $script:launches++
        if (($ManagerArguments -join ' ') -ne 'control --vmindex 0 launch') { throw 'Incorrect launch arguments' }
        return '{"error_code":0}'
    }
    $script:reads++
    if ($script:scenario -eq 'unknown') { return '{"index":"99","error_code":1}' }
    $ready = $script:scenario -eq 'running' -or ($script:scenario -eq 'cold' -and $script:reads -ge 3)
    $started = $script:scenario -ne 'cold' -or $script:reads -ge 2
    return ([pscustomobject]@{index='0';error_code=0;pid=4242;is_process_started=$started;is_android_started=$ready;adb_port=16384;adb_host_ip='127.0.0.1'} | ConvertTo-Json -Compress)
}
$script:stoppedPids=@(); $script:launches=0; $script:reads=0; $script:scenario='running'
$result=Start-MuMuInstance
if ($script:stoppedPids.Count -ne 0) { throw 'Running instance main process was stopped' }
if ($script:launches -ne 0 -or $result.launched -or $result.address -ne '127.0.0.1:16384') { throw 'Running instance was not reused' }
$script:stoppedPids=@(); $script:launches=0; $script:reads=0; $script:scenario='cold'
$result=Start-MuMuInstance
if (($script:stoppedPids -join ',') -ne '7001,7003') { throw 'Wrong MuMu main process stopped' }
if ($script:launches -ne 1 -or !$result.launched -or $script:reads -ne 3) { throw 'Cold startup did not wait for readiness' }
$script:reads=0; $script:scenario='booting'
$failed=$false
try { Start-MuMuInstance -TimeoutSeconds 0 | Out-Null } catch { $failed=$true }
if (!$failed) { throw 'Expected readiness timeout' }
$script:scenario='unknown'
$failed=$false
try { Start-MuMuInstance | Out-Null } catch { $failed=$true }
if (!$failed) { throw 'Unknown instance accepted' }
Write-Host 'PASS MuMu reuse, cold launch, readiness wait, timeout and unknown-instance errors'
