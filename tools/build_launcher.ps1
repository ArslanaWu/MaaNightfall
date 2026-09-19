[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (!(Test-Path -LiteralPath $compiler)) { throw 'Windows .NET Framework 4 compiler is missing.' }
& $compiler /nologo /target:winexe /platform:x64 /optimize+ /reference:System.Windows.Forms.dll "/out:$projectRoot\MaaNightfall.exe" (Join-Path $PSScriptRoot 'launcher.cs')
if ($LASTEXITCODE -ne 0) { throw 'MaaNightfall launcher compilation failed.' }
Write-Host 'Built MaaNightfall.exe'
