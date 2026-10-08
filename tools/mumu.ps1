function Find-MuMuManager {
    param([string]$ManagerPath)
    if ($ManagerPath) {
        if (!(Test-Path -LiteralPath $ManagerPath -PathType Leaf)) { throw "MuMuManager not found: $ManagerPath" }
        return [IO.Path]::GetFullPath($ManagerPath)
    }
    $candidates = @()
    foreach ($base in @($env:ProgramFiles, [Environment]::GetEnvironmentVariable('ProgramFiles(x86)'))) {
        if ($base) {
            $candidates += Join-Path $base 'Netease\MuMu\nx_main\MuMuManager.exe'
            $candidates += Join-Path $base 'Netease\MuMuPlayer-12.0\shell\MuMuManager.exe'
        }
    }
    $uninstallKeys = @(
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
        'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*',
        'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
    )
    foreach ($entry in @(Get-ItemProperty $uninstallKeys -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -match 'MuMu' })) {
        if ($entry.InstallLocation) {
            foreach ($relative in @('nx_main\MuMuManager.exe','shell\MuMuManager.exe','MuMuManager.exe')) {
                $candidates += Join-Path $entry.InstallLocation $relative
            }
        }
    }
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }
    }
    throw 'MuMuManager was not found. Install MuMu or set MAANIGHTFALL_MUMU_MANAGER to its full path.'
}

function Invoke-MuMuManager {
    param([string]$ManagerPath, [string[]]$ManagerArguments)
    $output = & $ManagerPath @ManagerArguments
    if ($LASTEXITCODE -ne 0) { throw ("MuMuManager failed: " + ($output -join ' ')) }
    return ($output -join [Environment]::NewLine)
}

function Get-MuMuInstance {
    param([string]$ManagerPath, [int]$Instance)
    $info = (Invoke-MuMuManager $ManagerPath @('info','--vmindex',"$Instance")) | ConvertFrom-Json
    if ($info.error_code -ne 0 -or "$($info.index)" -ne "$Instance") {
        throw "MuMu instance $Instance was not found or returned an error."
    }
    return $info
}

function Wait-MuMuTick { Start-Sleep -Seconds 2 }

function Get-MuMuMainProcesses {
    return @(Get-CimInstance Win32_Process -Filter "Name = 'MuMuNxMain.exe'")
}

function Get-MuMuDeviceParentId {
    param([int]$DevicePid)
    $device = Get-CimInstance Win32_Process -Filter "ProcessId = $DevicePid"
    if ($device -and $device.Name -eq 'MuMuNxDevice.exe') { return [int]$device.ParentProcessId }
    return 0
}

function Stop-LaunchedMuMuMain {
    param([int]$DevicePid, [int[]]$ExistingPids)
    $launcherPid = Get-MuMuDeviceParentId $DevicePid
    if ($launcherPid -le 0) { throw "Cannot identify the launcher of MuMu device PID $DevicePid." }
    foreach ($process in @(Get-MuMuMainProcesses)) {
        if ($process.ProcessId -in $ExistingPids -or
            ($process.ParentProcessId -ne $DevicePid -and $process.ParentProcessId -ne $launcherPid)) { continue }
        Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
    }
}
function Start-MuMuInstance {
    param([string]$ManagerPath, [ValidateRange(0,65535)][int]$Instance = 0, [ValidateRange(0,600)][int]$TimeoutSeconds = 120)
    $manager = Find-MuMuManager $ManagerPath
    $info = Get-MuMuInstance $manager $Instance
    $launched = $false
    if (!$info.is_process_started) {
        $existingMainPids = @(Get-MuMuMainProcesses | ForEach-Object { [int]$_.ProcessId })
        $result = Invoke-MuMuManager $manager @('control','--vmindex',"$Instance",'launch')
        if ($result -and $result.Trim().StartsWith('{')) {
            $launchResult = $result | ConvertFrom-Json
            if ($launchResult.error_code -and $launchResult.error_code -ne 0) { throw "MuMu launch failed: $result" }
        }
        $launched = $true
        $info = Get-MuMuInstance $manager $Instance
    }
    $timer = [Diagnostics.Stopwatch]::StartNew()
    while (!$info.is_android_started -or [int]$info.adb_port -le 0) {
        if ($timer.Elapsed.TotalSeconds -ge $TimeoutSeconds) { throw "MuMu instance $Instance did not become ready within $TimeoutSeconds seconds." }
        Wait-MuMuTick
        $info = Get-MuMuInstance $manager $Instance
    }
    if ($launched) {
        if ([int]$info.pid -le 0) { throw "MuMu instance $Instance did not return a device PID; cannot close its main process safely." }
        Stop-LaunchedMuMuMain -DevicePid ([int]$info.pid) -ExistingPids $existingMainPids
    }
    $hostAddress = if ($info.adb_host_ip) { [string]$info.adb_host_ip } else { '127.0.0.1' }
    return [pscustomobject]@{
        index = $Instance
        address = ($hostAddress + ':' + $info.adb_port)
        launched = $launched
    }
}
