# Windows PowerShell 5.1 compatible; no external PowerShell modules required.
function Remove-RuntimePath {
    param([string]$ProjectRoot, [string]$Path)
    $root = [IO.Path]::GetFullPath($ProjectRoot).TrimEnd('\')
    $target = [IO.Path]::GetFullPath($Path)
    $allowed = $target.StartsWith($root + '\runtimes\', [StringComparison]::OrdinalIgnoreCase)
    if (!$allowed) { throw "Unsafe runtime cleanup path: $target" }
    if (!(Test-Path -LiteralPath $target)) { return }
    $items = @(Get-Item -LiteralPath $target -Force) + @(Get-ChildItem -LiteralPath $target -Recurse -Force)
    if (@($items | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }).Count) { throw "Unexpected link: $target" }
    Remove-Item -LiteralPath $target -Recurse -Force -ErrorAction Stop
}

function Invoke-RuntimeCommit {
    param([string]$ProjectRoot, [object[]]$Entries, [scriptblock]$Validate)
    $changed = @()
    try {
        foreach ($entry in $Entries) {
            # All targets must remain inside the explicitly supplied project.
            $root = [IO.Path]::GetFullPath($ProjectRoot).TrimEnd('\') + '\'
            foreach ($p in @($entry.Source, $entry.Target, $entry.Backup)) {
                if (![IO.Path]::GetFullPath($p).StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid transaction path' }
            }
            if (!(Test-Path -LiteralPath $entry.Source -PathType Container)) { throw "Missing staged directory: $($entry.Source)" }
            $state = [pscustomobject]@{ Entry=$entry; BackedUp=$false; Installed=$false }
            $changed += $state
            if (Test-Path -LiteralPath $entry.Target) {
                Move-Item -LiteralPath $entry.Target -Destination $entry.Backup -ErrorAction Stop
                $state.BackedUp = $true
            }
            Move-Item -LiteralPath $entry.Source -Destination $entry.Target -ErrorAction Stop
            $state.Installed = $true
        }
        & $Validate
    } catch {
        $originalError = $_
        [array]::Reverse($changed)
        foreach ($state in $changed) {
            if ($state.Installed) {
                # Return the new directory to staging, then restore the old one.
                Move-Item -LiteralPath $state.Entry.Target -Destination $state.Entry.Source -ErrorAction Stop
            }
            if ($state.BackedUp) {
                Move-Item -LiteralPath $state.Entry.Backup -Destination $state.Entry.Target -ErrorAction Stop
            }
        }
        throw $originalError
    }
}

function Get-StableMaaVersion {
    param($Metadata)
    $versions = @($Metadata.versions.PSObject.Properties.Name | Where-Object { $_ -match '^\d+\.\d+\.\d+$' } | Sort-Object { [version]$_ } -Descending)
    if (!$versions.Count) { throw 'No stable MaaFramework version found.' }
    return $versions[0]
}

function Receive-RuntimeFile {
    param([string]$Uri, [string]$Destination)
    Invoke-WebRequest -UseBasicParsing -Uri $Uri -OutFile $Destination -TimeoutSec 180 -ErrorAction Stop
}

function Test-OcrFiles {
    param([string]$Directory)
    foreach ($name in @('det.onnx','rec.onnx','keys.txt')) {
        $file = Join-Path $Directory $name
        if (!(Test-Path -LiteralPath $file -PathType Leaf) -or (Get-Item -LiteralPath $file).Length -eq 0) { return $false }
    }
    return $true
}

function Test-ProjectRuntime {
    param([string]$ProjectRoot, [string]$Node, [string]$MaaRoot, [string]$Resource)
    if (!(Test-Path -LiteralPath $Node -PathType Leaf)) { throw 'Node.js is missing.' }
    $verifier = Join-Path $ProjectRoot 'tools\verify_runtime.mjs'
    & $Node $verifier $MaaRoot $Resource
    if ($LASTEXITCODE -ne 0) { throw 'MaaFramework resource validation failed.' }
    & $Node $verifier $MaaRoot $Resource --server
    if ($LASTEXITCODE -ne 0) { throw 'MaaFramework Agent validation failed.' }
}

function Invoke-ProjectRuntimeUpdate {
    param([string]$ProjectRoot, [switch]$Startup)
    $ErrorActionPreference = 'Stop'
    $ProgressPreference = 'SilentlyContinue'
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    if (![Environment]::Is64BitOperatingSystem) { throw 'Windows x64 is required.' }
    $root = [IO.Path]::GetFullPath($ProjectRoot)
    $runtimeRoot = Join-Path $root 'runtimes'
    New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null
    $lock = $null
    $stage = $null
    $keepStage = $false
    $node = Join-Path $runtimeRoot 'node\node.exe'
    $maaRoot = Join-Path $runtimeRoot 'maa'
    $resource = Join-Path $root 'assets\resource'
    $ocr = Join-Path $resource 'model\ocr'
    try {
        try {
            $lock = [IO.File]::Open((Join-Path $runtimeRoot '.update.lock'), [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
        } catch { throw 'Another runtime update is running. Please wait and retry.' }

        Write-Host '[MaaYMZX] Checking Node.js 22 and stable MaaFramework updates...'
        $sums = (Invoke-WebRequest -UseBasicParsing -Uri 'https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt' -TimeoutSec 10).Content
        $match = [regex]::Match($sums, '(?m)^([a-fA-F0-9]{64})\s+(node-(v22\.\d+\.\d+)-win-x64\.zip)\s*$')
        if (!$match.Success) { throw 'Cannot resolve the official Node.js Windows x64 release.' }
        $nodeVersion = $match.Groups[3].Value
        $nodeArchive = $match.Groups[2].Value
        $nodeHash = $match.Groups[1].Value
        $metadata = Invoke-RestMethod -Uri 'https://registry.npmjs.org/@maaxyz%2fmaa-node' -TimeoutSec 10
        $maaVersion = Get-StableMaaVersion $metadata

        $currentNode = ''
        if (Test-Path -LiteralPath $node) { $currentNode = (& $node --version | Out-String).Trim() }
        $currentMaa = ''
        $maaPackage = Join-Path $maaRoot 'node_modules\@maaxyz\maa-node\package.json'
        if (Test-Path -LiteralPath $maaPackage) { $currentMaa = (Get-Content -LiteralPath $maaPackage -Raw | ConvertFrom-Json).version }
        $needNode = $currentNode -ne $nodeVersion -or !(Test-Path -LiteralPath (Join-Path $runtimeRoot 'node\node_modules\npm\bin\npm-cli.js'))
        $needMaa = $currentMaa -ne $maaVersion -or !(Test-Path -LiteralPath (Join-Path $maaRoot 'node_modules\@maaxyz\maa-node\dist\index-client.js')) -or !(Test-Path -LiteralPath (Join-Path $maaRoot 'node_modules\@maaxyz\maa-node\dist\index-server.js'))
        $needOcr = !(Test-OcrFiles $ocr)
        if (!$needNode -and !$needMaa -and !$needOcr) {
            Write-Host "[MaaYMZX] Up to date: Node $nodeVersion, MaaFramework $maaVersion."
            return
        }

        $stage = Join-Path $runtimeRoot ('.update-' + [guid]::NewGuid().ToString('N'))
        New-Item -ItemType Directory -Path $stage | Out-Null
        $entries = @()
        if ($needNode) {
            Write-Host "[MaaYMZX] Downloading Node.js $nodeVersion..."
            $zip = Join-Path $stage 'node.zip'
            Receive-RuntimeFile "https://nodejs.org/dist/$nodeVersion/$nodeArchive" $zip
            if ((Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash -ne $nodeHash) { throw 'Node.js checksum mismatch.' }
            Expand-Archive -LiteralPath $zip -DestinationPath (Join-Path $stage 'node-extract')
            $newNode = Join-Path $stage 'node'
            Move-Item -LiteralPath (Join-Path $stage ('node-extract\node-' + $nodeVersion + '-win-x64')) -Destination $newNode
            $node = Join-Path $newNode 'node.exe'
            $entries += [pscustomobject]@{ Source=$newNode; Target=(Join-Path $runtimeRoot 'node'); Backup=(Join-Path $stage 'old-node') }
        }
        if ($needMaa) {
            Write-Host "[MaaYMZX] Installing MaaFramework $maaVersion..."
            $newMaa = Join-Path $stage 'maa'
            New-Item -ItemType Directory -Path $newMaa | Out-Null
            $packages = @('maa-node','maa-node-win32-x64')
            foreach ($package in $packages) {
                if ($package -eq 'maa-node') { $info = $metadata.versions.$maaVersion }
                else { $info = Invoke-RestMethod -Uri "https://registry.npmjs.org/@maaxyz%2f$package/$maaVersion" -TimeoutSec 15 }
                if ($info.dependencies -and @($info.dependencies.PSObject.Properties).Count) { throw "New package dependencies require an updater upgrade: $package" }
                $url = [string]$info.dist.tarball
                if (!$url.StartsWith('https://registry.npmjs.org/')) { throw 'Unexpected package download host.' }
                Write-Host "[MaaYMZX] Downloading $package $maaVersion..."
                $archive = Join-Path $stage ($package + '.tgz')
                Receive-RuntimeFile $url $archive
                $destination = Join-Path $newMaa ('node_modules\@maaxyz\' + $package)
                New-Item -ItemType Directory -Path $destination -Force | Out-Null
                & $node (Join-Path $root 'tools\install_maa_package.mjs') $archive $destination ([string]$info.dist.integrity) "@maaxyz/$package" $maaVersion
                if ($LASTEXITCODE -ne 0) { throw "MaaFramework package validation failed: $package" }
            }
            $maaRoot = $newMaa
            $entries += [pscustomobject]@{ Source=$newMaa; Target=(Join-Path $runtimeRoot 'maa'); Backup=(Join-Path $stage 'old-maa') }
        }
        $testResource = $resource
        if ($needOcr) {
            Write-Host '[MaaYMZX] Downloading OCR models...'
            $zip = Join-Path $stage 'ocr.zip'
            Receive-RuntimeFile 'https://download.maafw.xyz/MaaCommonAssets/OCR/ppocr_v6/ppocr_v6-small.zip' $zip
            $extract = Join-Path $stage 'ocr-extract'
            Expand-Archive -LiteralPath $zip -DestinationPath $extract
            $model = @(Get-ChildItem -LiteralPath $extract -Recurse -File -Filter 'det.onnx' | Where-Object { Test-OcrFiles $_.DirectoryName })
            if ($model.Count -ne 1) { throw 'OCR archive has an unexpected layout.' }
            $newOcr = Join-Path $stage 'ocr'
            Copy-Item -LiteralPath $model[0].DirectoryName -Destination $newOcr -Recurse
            $testResource = Join-Path $stage 'resource'
            Copy-Item -LiteralPath $resource -Destination $testResource -Recurse
            $testOcr = Join-Path $testResource 'model\ocr'
            Remove-RuntimePath $root $testOcr
            Copy-Item -LiteralPath $newOcr -Destination $testOcr -Recurse
            $entries += [pscustomobject]@{ Source=$newOcr; Target=$ocr; Backup=(Join-Path $stage 'old-ocr') }
        }

        Write-Host '[MaaYMZX] Validating downloaded runtimes and resources...'
        Test-ProjectRuntime $root $node $maaRoot $testResource
        # Keep staging on an exceptional rollback failure, so backups are recoverable.
        $keepStage = $true
        Invoke-RuntimeCommit $root $entries {
            Test-ProjectRuntime $root (Join-Path $runtimeRoot 'node\node.exe') (Join-Path $runtimeRoot 'maa') $resource
        }
        $keepStage = $false
        Write-Host "[MaaYMZX] Ready: Node $nodeVersion, MaaFramework $maaVersion."
    } catch {
        $failure = $_
        if ($Startup -and $lock) {
            try {
                Test-ProjectRuntime $root (Join-Path $runtimeRoot 'node\node.exe') (Join-Path $runtimeRoot 'maa') $resource
                Write-Warning ("Update unavailable; continuing with installed runtimes. " + $failure.Exception.Message)
                return
            } catch { }
        }
        throw $failure
    } finally {
        try { if ($stage -and !$keepStage) { Remove-RuntimePath $root $stage } }
        finally { if ($lock) { $lock.Dispose() } }
    }
}
