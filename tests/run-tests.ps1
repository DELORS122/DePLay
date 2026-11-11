[CmdletBinding()]
param(
    [switch]$SkipBuild,
    # Download and bundle Streamlink while building (slow, needs network).
    [switch]$WithStreamlink,
    [switch]$Keep
)

$ErrorActionPreference = 'Stop'
$scriptRoot = Split-Path -Parent $PSScriptRoot
$failures = New-Object System.Collections.Generic.List[string]

function Write-Section([string]$Text) {
    Write-Host ''
    Write-Host ('==> ' + $Text) -ForegroundColor Cyan
}

function Invoke-Step([string]$Name, [scriptblock]$Action) {
    Write-Section $Name
    try {
        & $Action
        Write-Host ('PASS: ' + $Name) -ForegroundColor Green
    }
    catch {
        Write-Host ('FAIL: ' + $Name) -ForegroundColor Red
        Write-Host ('      ' + $_.Exception.Message) -ForegroundColor Red
        $failures.Add($Name)
    }
}

function Invoke-Node([string]$Script, [string[]]$Arguments) {
    & node $Script @Arguments
    if ($LASTEXITCODE -ne 0) { throw ("node $Script exited with $LASTEXITCODE") }
}

function Find-FFmpeg {
    foreach ($candidate in @(
        (Join-Path $scriptRoot 'build\cache\streamlink\ffmpeg\ffmpeg.exe'),
        (Join-Path $scriptRoot 'build\app\streamlink\ffmpeg\ffmpeg.exe')
    )) {
        if (Test-Path -LiteralPath $candidate) { return $candidate }
    }
    $command = Get-Command ffmpeg -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
    return $null
}

function Invoke-Selftest([string]$Exe) {
    $tmp = Join-Path $env:TEMP ('deplay-selftest-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $tmp | Out-Null
    try {
        $out = Join-Path $tmp 'out.txt'
        $err = Join-Path $tmp 'err.txt'
        $process = Start-Process -FilePath $Exe -ArgumentList '--selftest' -Wait -PassThru `
            -RedirectStandardOutput $out -RedirectStandardError $err
        Get-Content -LiteralPath $out -ErrorAction SilentlyContinue | ForEach-Object { Write-Host $_ }
        $errorText = Get-Content -LiteralPath $err -Raw -ErrorAction SilentlyContinue
        if ($errorText) { Write-Host $errorText -ForegroundColor DarkYellow }
        if ($process.ExitCode -ne 0) { throw "self-test exited with $($process.ExitCode)" }
    }
    finally {
        Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
    }
}

$buildArgs = @{ Target = 'app' }
if (-not $WithStreamlink) { $buildArgs['SkipStreamlink'] = $true }

if (-not $SkipBuild) {
    Invoke-Step 'Build portable application' {
        & (Join-Path $scriptRoot 'build.ps1') @buildArgs
    }
}

Invoke-Step 'Container and audio extraction tests (node)' {
    Invoke-Node (Join-Path $PSScriptRoot 'media.test.js') @()
}

Invoke-Step 'Media fixtures for multi-track tests (FFmpeg)' {
    $ffmpeg = Find-FFmpeg
    $python = Get-Command python -ErrorAction SilentlyContinue
    if (-not $ffmpeg -or -not $python) {
        Write-Host 'skipped: FFmpeg or Python was not found' -ForegroundColor Yellow
        Write-Host '         (build with Streamlink or install FFmpeg, then re-run the tests)' -ForegroundColor DarkGray
        return
    }
    $previousPath = $env:PATH
    try {
        $env:PATH = (Split-Path -Parent $ffmpeg) + ';' + $env:PATH
        & $python.Source (Join-Path $PSScriptRoot 'fixtures\generate-media.py')
        if ($LASTEXITCODE -ne 0) { throw "fixture generation exited with $LASTEXITCODE" }
    }
    finally {
        $env:PATH = $previousPath
    }
}

Invoke-Step 'WAV / PCM packing tests (node)' {
    Invoke-Node (Join-Path $PSScriptRoot 'wav.test.js') @()
}

Invoke-Step 'MP4/MOV multi-track audio tests (node)' {
    Invoke-Node (Join-Path $PSScriptRoot 'mp4-audio.test.js') @()
}

Invoke-Step 'Application self-test (URL parsing, embedded Streamlink, HTTP server)' {
    Invoke-Selftest (Join-Path $scriptRoot 'build\app\DePLay.exe')
}

Invoke-Step 'Streamlink integration tests (fake embedded executable)' {
    & (Join-Path $PSScriptRoot 'streamlink.test.ps1') -AppDir (Join-Path $scriptRoot 'build\app') -Keep:$Keep
}

Invoke-Step 'Installer and uninstaller test (temporary isolated install)' {
    & (Join-Path $PSScriptRoot 'uninstall.test.ps1') -Build -Keep:$Keep
}

# The uninstaller test rebuilds build\app without Streamlink; restore the
# portable build so the folder is usable again after a test run.
if (-not $SkipBuild) {
    Invoke-Step 'Restore portable application build' {
        & (Join-Path $scriptRoot 'build.ps1') @buildArgs
    }
}

Write-Host ''
if ($failures.Count -eq 0) {
    Write-Host 'ALL TESTS PASSED' -ForegroundColor Green
    exit 0
}

Write-Host ('TESTS FAILED: ' + ($failures -join ', ')) -ForegroundColor Red
exit 1
