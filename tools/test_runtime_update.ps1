$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'runtime_update.ps1')
$project = Split-Path -Parent $PSScriptRoot
$fixture = Join-Path $project ('runtimes\.test-' + [guid]::NewGuid().ToString('N'))
try {
    $metadata = '{"versions":{"5.9.0":{},"5.13.0":{},"5.14.0-beta.1":{},"5.10.0":{}}}' | ConvertFrom-Json
    if ((Get-StableMaaVersion $metadata) -ne '5.13.0') { throw 'Stable version selection failed' }
    $entries = @()
    foreach ($name in @('node','maa')) {
        $target = Join-Path $fixture ('runtimes\' + $name)
        $source = Join-Path $fixture ('runtimes\staged-' + $name)
        New-Item -ItemType Directory -Path $target,$source -Force | Out-Null
        [IO.File]::WriteAllText((Join-Path $target 'marker'),'old')
        [IO.File]::WriteAllText((Join-Path $source 'marker'),'new')
        $entries += [pscustomobject]@{Source=$source;Target=$target;Backup=(Join-Path $fixture ('runtimes\backup-' + $name))}
    }
    $failed = $false
    try { Invoke-RuntimeCommit $fixture $entries { throw 'Simulated incompatible runtime' } } catch { $failed = $true }
    if (!$failed) { throw 'Expected validation failure' }
    foreach ($e in $entries) {
        if ([IO.File]::ReadAllText((Join-Path $e.Target 'marker')) -ne 'old') { throw 'Rollback lost installed runtime' }
        if ([IO.File]::ReadAllText((Join-Path $e.Source 'marker')) -ne 'new') { throw 'Rollback lost staged runtime' }
    }
    Invoke-RuntimeCommit $fixture $entries { }
    foreach ($e in $entries) {
        if ([IO.File]::ReadAllText((Join-Path $e.Target 'marker')) -ne 'new') { throw 'Commit failed' }
    }
    $blocked = $false
    try { Remove-RuntimePath $fixture (Join-Path $fixture '.state') } catch { $blocked = $true }
    if (!$blocked) { throw 'Account state cleanup was not rejected' }

    function Invoke-WebRequest { throw 'Simulated network outage' }
    function Test-ProjectRuntime { if ($script:BrokenRuntime) { throw 'Missing runtime' }; $script:FallbackTested = $true }
    $script:BrokenRuntime = $false
    $script:FallbackTested = $false
    Invoke-ProjectRuntimeUpdate $fixture -Startup
    if (!$script:FallbackTested) { throw 'Offline startup did not validate old runtime' }
    $script:BrokenRuntime = $true
    $failed = $false
    try { Invoke-ProjectRuntimeUpdate $fixture -Startup } catch { $failed = $true }
    if (!$failed) { throw 'Fresh install must fail without network' }
    Write-Host 'PASS stable versions, atomic rollback, account-state protection, offline fallback and missing-runtime errors'
} finally {
    Remove-RuntimePath $project $fixture
}
