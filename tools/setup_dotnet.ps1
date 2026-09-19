$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$portable = Join-Path $projectRoot 'runtimes\dotnet\dotnet.exe'
$systemDotnet = Join-Path $env:ProgramFiles 'dotnet\dotnet.exe'
if (Test-Path -LiteralPath $portable) {
    $env:DOTNET_ROOT = Split-Path -Parent $portable
    $env:DOTNET_ROOT_X64 = $env:DOTNET_ROOT
    return
}
if (Test-Path -LiteralPath $systemDotnet) {
    if ((& $systemDotnet --list-runtimes) -match 'Microsoft.NETCore.App 10\.') { return }
}
. (Join-Path $PSScriptRoot 'resolve_node.ps1')
$nodeExe = Resolve-ProjectNode -ProjectRoot $projectRoot
& $nodeExe (Join-Path $PSScriptRoot 'setup_dotnet.mjs')
if ($LASTEXITCODE -ne 0) { throw '.NET setup failed.' }
$env:DOTNET_ROOT = Split-Path -Parent $portable
$env:DOTNET_ROOT_X64 = $env:DOTNET_ROOT
