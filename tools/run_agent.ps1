$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'resolve_node.ps1')
$nodeExe = Resolve-ProjectNode -ProjectRoot $projectRoot
& $nodeExe (Join-Path $PSScriptRoot 'agent_server.mjs') @args
exit $LASTEXITCODE
