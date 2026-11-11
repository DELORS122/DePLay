[CmdletBinding()]
param(
    [string]$SetupPath,
    [switch]$Build,
    [switch]$Keep
)

$ErrorActionPreference = 'Stop'
$scriptRoot = Split-Path -Parent $PSScriptRoot

if (-not $SetupPath) {
    $SetupPath = Join-Path $scriptRoot 'dist\DePLay-Setup.exe'
}

if ($Build -or -not (Test-Path -LiteralPath $SetupPath)) {
    Write-Host 'Building installer...' -ForegroundColor Cyan
    & (Join-Path $scriptRoot 'build.ps1') -Target installer
    if (-not $?) { throw 'build.ps1 failed' }
}

if (-not (Test-Path -LiteralPath $SetupPath)) {
    throw "Installer not found: $SetupPath"
}

$tempDir = Join-Path $env:TEMP ('DePLay-smoke-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
Write-Host ('Extracting payload to ' + $tempDir) -ForegroundColor Cyan

try {
    $arguments = '/S /extract-payload="' + $tempDir + '"'
    $setup = Start-Process -FilePath $SetupPath -ArgumentList $arguments -Wait -PassThru
    if ($setup.ExitCode -ne 0) {
        throw "Payload extraction failed with exit code $($setup.ExitCode)"
    }

    $required = @(
        'DePLay.exe',
        'Microsoft.Web.WebView2.Core.dll',
        'Microsoft.Web.WebView2.WinForms.dll',
        'WebView2Loader.dll',
        'web\index.html',
        'web\styles.css',
        'web\i18n.js',
        'web\app\media.js',
        'web\vendor\mp4box.all.min.js',
        'web\vendor\hls.light.min.js'
    )
    foreach ($relative in $required) {
        $path = Join-Path $tempDir $relative
        if (-not (Test-Path -LiteralPath $path)) {
            throw "Payload is missing $relative"
        }
    }
    Write-Host ('Payload files OK (' + $required.Count + ' checked)') -ForegroundColor Green

    # The portable Streamlink bundle is embedded by build.ps1 when the build
    # has network access. When present, make sure the launcher actually runs.
    $streamlink = Join-Path $tempDir 'streamlink\bin\streamlink.exe'
    if (Test-Path -LiteralPath $streamlink) {
        $versionOut = Join-Path $tempDir 'streamlink-version.log'
        $versionErr = Join-Path $tempDir 'streamlink-version.err'
        $process = Start-Process -FilePath $streamlink -ArgumentList '--version' -Wait -PassThru `
            -RedirectStandardOutput $versionOut -RedirectStandardError $versionErr
        $text = ''
        if (Test-Path -LiteralPath $versionOut) { $text = (Get-Content -LiteralPath $versionOut -Raw) }
        if (Test-Path -LiteralPath $versionErr) { $text += (Get-Content -LiteralPath $versionErr -Raw) }
        if ($process.ExitCode -ne 0 -or $text -notmatch 'streamlink\s+\d') {
            throw ('Embedded Streamlink did not start: ' + $text)
        }
        Write-Host ('Embedded Streamlink OK: ' + $text.Trim()) -ForegroundColor Green
    }
    else {
        Write-Host 'Embedded Streamlink not present (built with -SkipStreamlink?)' -ForegroundColor Yellow
    }

    $stdout = Join-Path $tempDir 'selftest.log'
    $stderr = Join-Path $tempDir 'selftest.err'
    $app = Join-Path $tempDir 'DePLay.exe'
    $selftest = Start-Process -FilePath $app -ArgumentList '--selftest' -Wait -PassThru `
        -RedirectStandardOutput $stdout -RedirectStandardError $stderr
    if (Test-Path -LiteralPath $stdout) { Get-Content -LiteralPath $stdout }
    if (Test-Path -LiteralPath $stderr) {
        $errorText = Get-Content -LiteralPath $stderr -Raw
        if ($errorText) { Write-Host $errorText -ForegroundColor DarkYellow }
    }
    if ($selftest.ExitCode -ne 0) {
        throw "Application self-test failed with exit code $($selftest.ExitCode)"
    }

    Write-Host ''
    Write-Host 'SMOKE TEST: PASS' -ForegroundColor Green
}
finally {
    if ($Keep) {
        Write-Host ('Kept for inspection: ' + $tempDir) -ForegroundColor Yellow
    }
    else {
        Start-Sleep -Milliseconds 200
        Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue
        if (Test-Path -LiteralPath $tempDir) {
            Write-Host ('Could not remove ' + $tempDir) -ForegroundColor Yellow
        }
    }
}
