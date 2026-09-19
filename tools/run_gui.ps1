[CmdletBinding()]
param([switch]$PrepareOnly)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$guiPath = Join-Path $projectRoot 'MFAAvalonia.exe'
if (!$PrepareOnly -and (Get-Process MFAAvalonia -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $guiPath })) {
    Start-Process -FilePath $guiPath -WorkingDirectory $projectRoot
    exit 0
}
. (Join-Path $PSScriptRoot 'runtime_update.ps1')
# A release pins its matched runtime; source checkouts retain the existing updater.
if (!(Test-Path -LiteralPath (Join-Path $projectRoot '.gui-release'))) {
    Invoke-ProjectRuntimeUpdate -ProjectRoot $projectRoot -Startup
}
. (Join-Path $PSScriptRoot 'resolve_node.ps1')
$nodeExe = Resolve-ProjectNode -ProjectRoot $projectRoot
& $nodeExe (Join-Path $PSScriptRoot 'gui_runtime.mjs')
if ($LASTEXITCODE -ne 0) { throw 'GUI setup failed.' }
if (!(Test-Path -LiteralPath (Join-Path $projectRoot '.gui-release'))) {
    & $nodeExe (Join-Path $PSScriptRoot 'build_gui_interface.mjs') --root
    if ($LASTEXITCODE -ne 0) { throw 'GUI interface generation failed.' }
}
& (Join-Path $PSScriptRoot 'setup_dotnet.ps1')
if ($PrepareOnly) { exit 0 }
Start-Process -FilePath (Join-Path $projectRoot 'MFAAvalonia.exe') -WorkingDirectory $projectRoot
