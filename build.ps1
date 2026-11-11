#requires -version 3.0
<#
    DePLay build script.

    Produces a fully reproducible build without Visual Studio or the .NET SDK:
    the only compiler needed is csc.exe from the .NET Framework 4.x that ships
    with Windows.

    Targets:
        app        portable app in build\app
        payload    app + payload zip in build\payload
        setup      payload + DePLay-Setup.exe in build\setup
        installer  dist\DePLay-Setup.exe + dist\DePLay-portable.zip + SHA-256
        all        same as installer (default)
        clean      removes build\ and dist\
#>
[CmdletBinding()]
param(
    [ValidateSet('app', 'payload', 'setup', 'installer', 'all', 'clean')]
    [string]$Target = 'all',
    # Skip downloading the embedded Streamlink bundle (offline builds).
    [switch]$SkipStreamlink
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0

$scriptRoot = $PSScriptRoot
$desktopDir = Join-Path $scriptRoot 'desktop'
$buildRoot = Join-Path $scriptRoot 'build'
$appDir = Join-Path $buildRoot 'app'
$payloadDir = Join-Path $buildRoot 'payload'
$setupDir = Join-Path $buildRoot 'setup'
$generatedDir = Join-Path $buildRoot 'generated'
$distDir = Join-Path $scriptRoot 'dist'
$versionFile = Join-Path $scriptRoot 'version.txt'
$generatedVersionFile = Join-Path $generatedDir 'VersionInfo.cs'
$payloadZip = Join-Path $payloadDir 'DePLay.Payload.zip'
$streamlinkDir = Join-Path $buildRoot 'cache\streamlink'
$streamlinkExe = Join-Path $streamlinkDir 'bin\streamlink.exe'

function Write-Step([string]$Text) {
    Write-Host ('==> ' + $Text) -ForegroundColor Cyan
}

function Write-Detail([string]$Text) {
    Write-Host ('    ' + $Text) -ForegroundColor DarkGray
}

function New-CleanDirectory([string]$Path) {
    if (Test-Path -LiteralPath $Path) {
        Remove-Item -LiteralPath $Path -Recurse -Force
    }
    New-Item -ItemType Directory -Force -Path $Path | Out-Null
}

function Get-ProjectVersion {
    if (-not (Test-Path -LiteralPath $versionFile)) {
        throw "version.txt is missing: $versionFile"
    }
    $value = (Get-Content -LiteralPath $versionFile -Raw).Trim()
    if ($value -notmatch '^\d+\.\d+\.\d+$') {
        throw "version.txt must contain a three-part version such as 1.0.0 (found '$value')"
    }
    return $value
}

function Get-CscPath {
    $candidates = @()
    if ($env:WINDIR) {
        $candidates += (Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe')
        $candidates += (Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe')
    }
    $candidates += 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
    $candidates += 'C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe'
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate) {
            return (Resolve-Path -LiteralPath $candidate).Path
        }
    }
    throw 'csc.exe (.NET Framework 4.x) was not found. Install .NET Framework 4.8 or run this script on Windows.'
}

function Quote-ProcessArgument([string]$Value) {
    if ($null -eq $Value -or $Value.Length -eq 0) {
        return '""'
    }
    if ($Value -match '[\s"]') {
        return '"' + $Value.Replace('"', '\"') + '"'
    }
    return $Value
}

function Invoke-Compiler([string]$Name, [string[]]$Arguments) {
    $csc = Get-CscPath
    $commandLine = ($Arguments | ForEach-Object { Quote-ProcessArgument $_ }) -join ' '
    Write-Detail ('compiler: ' + $csc)
    $process = Start-Process -FilePath $csc -ArgumentList $commandLine -Wait -PassThru -NoNewWindow
    if ($process.ExitCode -ne 0) {
        throw ("csc failed for '{0}' with exit code {1}" -f $Name, $process.ExitCode)
    }
}

function Write-VersionInfo {
    $version = Get-ProjectVersion
    $version4 = $version + '.0'
    New-CleanDirectory $generatedDir
    $content = @"
using System.Reflection;

[assembly: AssemblyVersion("$version4")]
[assembly: AssemblyFileVersion("$version4")]

internal static class BuildInfo
{
    internal const string Version = "$version";
    internal const string Version4 = "$version4";
}
"@
    Set-Content -LiteralPath $generatedVersionFile -Value $content -Encoding UTF8
    Write-Detail ('version: ' + $version)
}

function Copy-WebAssets([string]$Destination) {
    $webDir = Join-Path $Destination 'web'
    New-Item -ItemType Directory -Force -Path $webDir | Out-Null

    $required = @('index.html', 'app.js', 'i18n.js', 'styles.css')
    foreach ($name in $required) {
        $source = Join-Path $scriptRoot $name
        if (-not (Test-Path -LiteralPath $source)) {
            if ($name -eq 'app.js' -and (Test-Path -LiteralPath (Join-Path $scriptRoot 'app'))) {
                continue
            }
            throw "Required web asset is missing: $source"
        }
        Copy-Item -LiteralPath $source -Destination (Join-Path $webDir $name) -Force
    }

    $modulesDir = Join-Path $scriptRoot 'app'
    if (Test-Path -LiteralPath $modulesDir) {
        $targetModules = Join-Path $webDir 'app'
        if (Test-Path -LiteralPath $targetModules) { Remove-Item -LiteralPath $targetModules -Recurse -Force }
        Copy-Item -LiteralPath $modulesDir -Destination $targetModules -Recurse -Force
    }

    $vendorDir = Join-Path $scriptRoot 'vendor'
    if (-not (Test-Path -LiteralPath $vendorDir)) {
        throw "Required vendor directory is missing: $vendorDir"
    }
    $targetVendor = Join-Path $webDir 'vendor'
    if (Test-Path -LiteralPath $targetVendor) { Remove-Item -LiteralPath $targetVendor -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $targetVendor | Out-Null
    Get-ChildItem -LiteralPath $vendorDir -Force |
        Where-Object { $_.Name -ne 'streamlink' } |
        ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $targetVendor $_.Name) -Recurse -Force }
}

function Get-StreamlinkBundle {
    if ($SkipStreamlink) {
        Write-Detail 'embedded Streamlink: skipped (-SkipStreamlink)'
        return $null
    }
    if (Test-Path -LiteralPath $streamlinkExe) {
        Write-Detail ('embedded Streamlink: cached (' + (Get-Item -LiteralPath $streamlinkExe).Length + ' bytes)')
        return $streamlinkExe
    }

    Write-Step 'Downloading embedded Streamlink (portable)'
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $headers = @{ 'User-Agent' = 'DePLay-build' }
        $release = Invoke-RestMethod -Uri 'https://api.github.com/repos/streamlink/windows-builds/releases/latest' -Headers $headers -UseBasicParsing

        $asset = $null
        # Only the portable ZIP is usable; the bare .exe asset is an installer
        # and must never be embedded as streamlink.exe.
        foreach ($candidate in @($release.assets)) {
            if ($candidate.name -match 'x86_64.*\.zip$') { $asset = $candidate; break }
        }
        if ($null -eq $asset) {
            throw 'the latest Streamlink release has no portable Windows x86_64 ZIP asset'
        }

        New-Item -ItemType Directory -Force -Path $streamlinkDir | Out-Null
        $extension = [IO.Path]::GetExtension($asset.name)
        $download = Join-Path $streamlinkDir ('download-' + [guid]::NewGuid().ToString('N') + $extension)
        Write-Detail ('downloading ' + $asset.name + ' (' + [math]::Round($asset.size / 1MB, 1) + ' MB)')
        Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $download -UseBasicParsing

        if ($extension -ieq '.zip') {
            $staging = Join-Path $streamlinkDir ('staging-' + [guid]::NewGuid().ToString('N'))
            New-Item -ItemType Directory -Force -Path $staging | Out-Null
            try {
                Expand-Archive -LiteralPath $download -DestinationPath $staging -Force
                Remove-Item -LiteralPath $download -Force

                # The portable archive contains a single versioned folder with
                # bin/streamlink.exe, Python/, pkgs/ and ffmpeg/. Keep the whole
                # folder: the launcher needs its sibling dependencies.
                $inner = Get-ChildItem -LiteralPath $staging -Directory | Select-Object -First 1
                if ($null -eq $inner) { throw 'the portable archive is empty' }
                Get-ChildItem -LiteralPath $inner.FullName -Force | ForEach-Object {
                    Move-Item -LiteralPath $_.FullName -Destination $streamlinkDir -Force
                }
            }
            finally {
                if (Test-Path -LiteralPath $staging) { Remove-Item -LiteralPath $staging -Recurse -Force -ErrorAction SilentlyContinue }
            }
        }
        else {
            $bin = Join-Path $streamlinkDir 'bin'
            New-Item -ItemType Directory -Force -Path $bin | Out-Null
            Move-Item -LiteralPath $download -Destination (Join-Path $bin 'streamlink.exe') -Force
        }

        if (-not (Test-Path -LiteralPath $streamlinkExe)) {
            throw 'streamlink.exe was not found in the downloaded archive'
        }
        Write-Detail ('embedded Streamlink: ' + (Get-Item -LiteralPath $streamlinkExe).Length + ' bytes')
        return $streamlinkExe
    }
    catch {
        Write-Warning ('Embedded Streamlink could not be downloaded: ' + $_.Exception.Message)
        Write-Warning 'The application will still work and fall back to a system Streamlink installation.'
        return $null
    }
}

function Build-App {
    Write-Step 'Building portable application (build\app)'
    Write-VersionInfo
    New-CleanDirectory $appDir

    $frameworkDir = Split-Path -Parent (Get-CscPath)
    $compile = @(
        '/nologo',
        '/target:winexe',
        '/platform:anycpu',
        '/langversion:5',
        '/optimize+',
        ('/out:' + ((Join-Path $appDir 'DePLay.exe'))),
        ('/win32icon:' + ((Join-Path $desktopDir 'app.ico'))),
        ('/win32manifest:' + ((Join-Path $desktopDir 'app.manifest')))
    )
    foreach ($reference in @('System.dll', 'System.Core.dll', 'System.Drawing.dll', 'System.Windows.Forms.dll', 'System.Runtime.Serialization.dll')) {
        $compile += ('/r:' + ((Join-Path $frameworkDir $reference)))
    }
    foreach ($reference in @('Microsoft.Web.WebView2.Core.dll', 'Microsoft.Web.WebView2.WinForms.dll')) {
        $compile += ('/r:' + ((Join-Path $desktopDir ('lib\' + $reference))))
    }
    foreach ($source in @('Program.cs', 'AppSettings.cs', 'NativeStrings.cs', 'Streamlink.cs', 'SelfTest.cs', 'AssemblyInfo.cs')) {
        $compile += ((Join-Path $desktopDir $source))
    }
    $compile += ($generatedVersionFile)

    Invoke-Compiler 'app' $compile

    Get-ChildItem -LiteralPath (Join-Path $desktopDir 'lib') -File |
        Where-Object { $_.Extension -in @('.dll', '.txt') } |
        ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $appDir $_.Name) -Force }

    Copy-WebAssets $appDir

    $streamlink = Get-StreamlinkBundle
    if ($null -ne $streamlink) {
        $target = Join-Path $appDir 'streamlink'
        New-Item -ItemType Directory -Force -Path $target | Out-Null
        Copy-Item -Path (Join-Path $streamlinkDir '*') -Destination $target -Recurse -Force
        Write-Detail ('embedded Streamlink copied to ' + $target)
    }

    foreach ($name in @('LICENSE', 'README.md')) {
        $source = Join-Path $scriptRoot $name
        if (Test-Path -LiteralPath $source) {
            Copy-Item -LiteralPath $source -Destination (Join-Path $appDir $name) -Force
        }
    }

    $exe = Join-Path $appDir 'DePLay.exe'
    Write-Detail ('DePLay.exe: ' + (Get-Item -LiteralPath $exe).Length + ' bytes')
}

function Build-Payload {
    if (-not (Test-Path -LiteralPath (Join-Path $appDir 'DePLay.exe'))) {
        throw 'Portable application is not built. Run build.ps1 -Target app first.'
    }
    Write-Step 'Packing installer payload (build\payload\DePLay.Payload.zip)'
    New-CleanDirectory $payloadDir
    Compress-Archive -Path (Join-Path $appDir '*') -DestinationPath $payloadZip -CompressionLevel Optimal

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [System.IO.Compression.ZipFile]::OpenRead($payloadZip)
    try {
        $names = @($archive.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
    }
    finally {
        $archive.Dispose()
    }

    $entryCandidates = @('web/app.js', 'web/app/main.js')
    $entryFound = $null
    foreach ($candidate in $entryCandidates) {
        if ($names -contains $candidate) { $entryFound = $candidate; break }
    }
    if ($null -eq $entryFound) {
        throw ("Payload layout is unexpected: application script is missing. Entries: {0}" -f ($names -join ', '))
    }
    foreach ($requiredEntry in @('DePLay.exe', 'web/index.html', 'web/vendor/mp4box.all.min.js', 'web/vendor/hls.light.min.js', 'web/app/media.js')) {
        if ($names -notcontains $requiredEntry) {
            throw ("Payload layout is unexpected: '{0}' is missing. Entries: {1}" -f $requiredEntry, ($names -join ', '))
        }
    }
    if (Test-Path -LiteralPath (Join-Path $appDir 'streamlink\bin\streamlink.exe')) {
        if ($names -notcontains 'streamlink/bin/streamlink.exe') {
            throw 'Embedded Streamlink is present but was not packed into the payload.'
        }
        Write-Detail 'payload: embedded Streamlink included'
    }
    Write-Detail ('payload entries: ' + $names.Count)
    Write-Detail ('payload: ' + (Get-Item -LiteralPath $payloadZip).Length + ' bytes')
}

function Build-Setup {
    if (-not (Test-Path -LiteralPath $payloadZip)) {
        throw 'Installer payload is missing. Run build.ps1 -Target payload first.'
    }
    Write-Step 'Building installer (build\setup\DePLay-Setup.exe)'
    New-CleanDirectory $setupDir

    $frameworkDir = Split-Path -Parent (Get-CscPath)
    $compile = @(
        '/nologo',
        '/target:winexe',
        '/platform:anycpu',
        '/langversion:5',
        '/optimize+',
        ('/out:' + ((Join-Path $setupDir 'DePLay-Setup.exe'))),
        ('/win32icon:' + ((Join-Path $desktopDir 'app.ico'))),
        ('/win32manifest:' + ((Join-Path $desktopDir 'setup.manifest'))),
        ('/resource:' + ($payloadZip) + ',DePLay.Payload.zip')
    )
    foreach ($reference in @('System.dll', 'System.Core.dll', 'System.Drawing.dll', 'System.Windows.Forms.dll', 'System.IO.Compression.dll', 'System.IO.Compression.FileSystem.dll')) {
        $compile += ('/r:' + ((Join-Path $frameworkDir $reference)))
    }
    foreach ($source in @('Setup.cs', 'SetupAssemblyInfo.cs')) {
        $compile += ((Join-Path $desktopDir $source))
    }
    $compile += ($generatedVersionFile)

    Invoke-Compiler 'setup' $compile
    Write-Detail ('installer: ' + (Get-Item -LiteralPath (Join-Path $setupDir 'DePLay-Setup.exe')).Length + ' bytes')
}

function Build-Installer {
    Write-Step 'Publishing artifacts (dist)'
    New-CleanDirectory $distDir
    Copy-Item -LiteralPath (Join-Path $setupDir 'DePLay-Setup.exe') -Destination (Join-Path $distDir 'DePLay-Setup.exe') -Force
    Compress-Archive -Path (Join-Path $appDir '*') -DestinationPath (Join-Path $distDir 'DePLay-portable.zip') -CompressionLevel Optimal

    $hash = (Get-FileHash -LiteralPath (Join-Path $distDir 'DePLay-Setup.exe') -Algorithm SHA256).Hash
    $version = Get-ProjectVersion
    $lines = @(
        ('DePLay ' + $version),
        ('SHA256  ' + $hash + '  DePLay-Setup.exe'),
        ('date    ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
    )
    Set-Content -LiteralPath (Join-Path $distDir 'DePLay-Setup.exe.sha256') -Value $lines -Encoding ASCII
    Write-Host ''
    Write-Host ('Artifacts in ' + $distDir) -ForegroundColor Green
    Write-Host ('  DePLay-Setup.exe     ' + (Get-Item -LiteralPath (Join-Path $distDir 'DePLay-Setup.exe')).Length + ' bytes')
    Write-Host ('  DePLay-portable.zip  ' + (Get-Item -LiteralPath (Join-Path $distDir 'DePLay-portable.zip')).Length + ' bytes')
    Write-Host ('  SHA256               ' + $hash)
}

function Invoke-Clean {
    Write-Step 'Cleaning build and dist'
    foreach ($path in @($buildRoot, $distDir)) {
        if (Test-Path -LiteralPath $path) {
            Remove-Item -LiteralPath $path -Recurse -Force
            Write-Detail ('removed ' + $path)
        }
    }
}

switch ($Target) {
    'clean' {
        Invoke-Clean
    }
    'app' {
        Build-App
    }
    'payload' {
        Build-App
        Build-Payload
    }
    'setup' {
        Build-App
        Build-Payload
        Build-Setup
    }
    'installer' {
        Build-App
        Build-Payload
        Build-Setup
        Build-Installer
    }
    'all' {
        Build-App
        Build-Payload
        Build-Setup
        Build-Installer
    }
}

Write-Host ''
Write-Host 'Done.' -ForegroundColor Green
