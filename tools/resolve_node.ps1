function Resolve-ProjectNode {
    param([Parameter(Mandatory = $true)][string]$ProjectRoot)
    $bundledDirectory = Join-Path $ProjectRoot 'runtimes\node'
    $bundledNode = Join-Path $bundledDirectory 'node.exe'
    if (Test-Path -LiteralPath $bundledDirectory) {
        if (-not (Test-Path -LiteralPath $bundledNode -PathType Leaf)) {
            throw "Bundled Node.js is incomplete: $bundledNode"
        }
        return $bundledNode
    }
    $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($nodeCommand) { return $nodeCommand.Source }
    $developmentNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
    if (Test-Path -LiteralPath $developmentNode -PathType Leaf) { return $developmentNode }
    throw 'Node.js was not found. Use a complete release package or install Node.js 22 or later.'
}
