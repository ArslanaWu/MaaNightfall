$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'mumu.ps1')
function Find-MuMuManager { return 'fake-manager.exe' }
function Wait-MuMuTick { }
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
    return ([pscustomobject]@{index='0';error_code=0;is_process_started=$started;is_android_started=$ready;adb_port=16384;adb_host_ip='127.0.0.1'} | ConvertTo-Json -Compress)
}
$script:launches=0; $script:reads=0; $script:scenario='running'
$result=Start-MuMuInstance
if ($script:launches -ne 0 -or $result.launched -or $result.address -ne '127.0.0.1:16384') { throw 'Running instance was not reused' }
$script:launches=0; $script:reads=0; $script:scenario='cold'
$result=Start-MuMuInstance
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
