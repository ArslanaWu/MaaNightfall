# Per-installation settings are kept under ignored config/.
$localMuMuPath = Join-Path (Split-Path -Parent $PSScriptRoot) 'config\mumu.json'
if (!$env:MAANIGHTFALL_MUMU_INSTANCE -and (Test-Path -LiteralPath $localMuMuPath)) {
    $localMuMu = Get-Content -LiteralPath $localMuMuPath -Raw | ConvertFrom-Json
    $env:MAANIGHTFALL_MUMU_INSTANCE = [string]$localMuMu.instance
}
if (!$env:MAANIGHTFALL_MUMU_INSTANCE) { $env:MAANIGHTFALL_MUMU_INSTANCE = '0' }
if ($env:MAANIGHTFALL_MUMU_INSTANCE -notmatch '^\d+$' -or [long]$env:MAANIGHTFALL_MUMU_INSTANCE -gt 65535) {
    throw 'Invalid MuMu instance in config/mumu.json or MAANIGHTFALL_MUMU_INSTANCE.'
}
