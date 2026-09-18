$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'run_nightfall_then_maayuan.ps1') -MaaYuanPath 'unused.exe' -LibraryOnly
$script:events=New-Object 'System.Collections.Generic.List[string]'
Invoke-NightfallThenMaaYuan -RunNightfall { $script:events.Add('nightfall'); throw 'simulated error' } -StartMaaYuan { $script:events.Add('maayuan') } -Log { param($text) }
if (($script:events -join ',') -ne 'nightfall,maayuan') { throw 'MaaYuan not started after Nightfall failure' }

$projectRoot=Split-Path -Parent $PSScriptRoot
$fixture=Join-Path $projectRoot ('.analysis\chain test ' + [guid]::NewGuid().ToString('N'))
$previousLog=$env:MAANIGHTFALL_CHAIN_TEST_LOG
try {
    $fixtureTools=Join-Path $fixture 'tools'
    New-Item -ItemType Directory -Path $fixtureTools -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'run_nightfall_then_maayuan.ps1') -Destination $fixtureTools
    $fakeNightfall=@'
param([string]$Modules)
if ($Modules -ne 'all') { throw 'Expected unattended all modules' }
[IO.File]::AppendAllText($env:MAANIGHTFALL_CHAIN_TEST_LOG,('night-start'+[Environment]::NewLine))
Start-Sleep -Milliseconds 1000
[IO.File]::AppendAllText($env:MAANIGHTFALL_CHAIN_TEST_LOG,('night-end'+[Environment]::NewLine))
exit [int]([IO.File]::ReadAllText((Join-Path $PSScriptRoot '..\exit-code.txt')))
'@
    [IO.File]::WriteAllText((Join-Path $fixtureTools 'run_daily.ps1'),$fakeNightfall)
    $fakeMaaYuan=Join-Path $fixture 'MaaYuan test.exe'
    $code='public static class ChainTestApp { public static void Main() { System.IO.File.AppendAllText(System.Environment.GetEnvironmentVariable("MAANIGHTFALL_CHAIN_TEST_LOG"), "maayuan\n"); } }'
    Add-Type -TypeDefinition $code -OutputAssembly $fakeMaaYuan -OutputType WindowsApplication
    $env:MAANIGHTFALL_CHAIN_TEST_LOG=Join-Path $fixture 'events.txt'
    $shell=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    foreach ($exitCode in @(0,7)) {
        [IO.File]::WriteAllText((Join-Path $fixture 'exit-code.txt'),"$exitCode")
        [IO.File]::WriteAllText($env:MAANIGHTFALL_CHAIN_TEST_LOG,'')
        & $shell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $fixtureTools 'run_nightfall_then_maayuan.ps1') -Background -MaaYuanPath $fakeMaaYuan
        if ($LASTEXITCODE -ne 0) { throw 'Background dispatch failed' }
        [IO.File]::AppendAllText($env:MAANIGHTFALL_CHAIN_TEST_LOG,('pc-continued'+[Environment]::NewLine))
        $timer=[Diagnostics.Stopwatch]::StartNew()
        do {
            Start-Sleep -Milliseconds 100
            $sequence=@([IO.File]::ReadAllLines($env:MAANIGHTFALL_CHAIN_TEST_LOG))
            if ($timer.Elapsed.TotalSeconds -gt 20) { throw ('Chain timeout: ' + ($sequence -join ',')) }
        } until ($sequence -contains 'maayuan')
        $nightEnd=[array]::IndexOf($sequence,'night-end')
        if ($nightEnd -lt 0 -or [array]::IndexOf($sequence,'maayuan') -le $nightEnd) { throw 'MaaYuan started before Nightfall ended' }
        if ([array]::IndexOf($sequence,'pc-continued') -gt $nightEnd) { throw 'PC branch was blocked by Nightfall' }
        $logs=Get-ChildItem -LiteralPath (Join-Path $fixture 'debug\daily-chain') -Filter '*.log' | Where-Object { $_.Name -notmatch 'nightfall' }
        if (!($logs | Where-Object { [IO.File]::ReadAllText($_.FullName).Contains("code $exitCode.") })) { throw "Missing completion log for exit code $exitCode" }
        Start-Sleep -Milliseconds 100
    }
    Write-Host 'PASS real background dispatch, spaced paths, unattended all, success/failure continuation and PC concurrency'
} finally {
    $env:MAANIGHTFALL_CHAIN_TEST_LOG=$previousLog
    $resolved=[IO.Path]::GetFullPath($fixture)
    if (!$resolved.StartsWith([IO.Path]::GetFullPath($projectRoot).TrimEnd('\') + '\.analysis\chain test ',[StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe fixture cleanup path' }
    if (Test-Path -LiteralPath $resolved) {
        if (@(Get-ChildItem -LiteralPath $resolved -Recurse -Force | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }).Count) { throw 'Unexpected link' }
        Remove-Item -LiteralPath $resolved -Recurse -Force
    }
}
