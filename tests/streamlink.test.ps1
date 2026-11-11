[CmdletBinding()]
param(
    # Portable app folder produced by build.ps1 -Target app.
    [string]$AppDir,
    [switch]$Keep
)

$ErrorActionPreference = 'Stop'
$scriptRoot = Split-Path -Parent $PSScriptRoot

if (-not $AppDir) { $AppDir = Join-Path $scriptRoot 'build\app' }
if (-not (Test-Path -LiteralPath (Join-Path $AppDir 'DePLay.exe'))) {
    throw "Application not found in $AppDir. Run '.\build.ps1 -Target app' first."
}

function Get-CscPath {
    foreach ($candidate in @(
        (Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'),
        (Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe')
    )) {
        if (Test-Path -LiteralPath $candidate) { return $candidate }
    }
    throw 'csc.exe was not found'
}

function Invoke-App([string]$Exe, [string[]]$Arguments, [hashtable]$Environment) {
    $stdout = [IO.Path]::GetTempFileName()
    $stderr = [IO.Path]::GetTempFileName()
    foreach ($key in $Environment.Keys) { Set-Item -Path ("env:" + $key) -Value $Environment[$key] }
    try {
        $process = Start-Process -FilePath $Exe -ArgumentList $Arguments -Wait -PassThru `
            -RedirectStandardOutput $stdout -RedirectStandardError $stderr
        $result = [pscustomobject]@{
            ExitCode = $process.ExitCode
            StdOut   = (Get-Content -LiteralPath $stdout -Raw)
            StdErr   = (Get-Content -LiteralPath $stderr -Raw)
        }
    }
    finally {
        foreach ($key in $Environment.Keys) { Remove-Item -Path ("env:" + $key) -ErrorAction SilentlyContinue }
        Remove-Item -LiteralPath $stdout, $stderr -Force -ErrorAction SilentlyContinue
    }
    return $result
}

# Work on a copy that contains only the executable, so the embedded
# streamlink\streamlink.exe can be replaced by the fake without touching the build.
$work = Join-Path $scriptRoot ('tests\.tmp\streamlink-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path (Join-Path $work 'streamlink') | Out-Null

try {
    Copy-Item -LiteralPath (Join-Path $AppDir 'DePLay.exe') -Destination (Join-Path $work 'DePLay.exe') -Force
    $exe = Join-Path $work 'DePLay.exe'

    Write-Host '==> Compiling fake streamlink.exe' -ForegroundColor Cyan
    $csc = Get-CscPath
    $fakeSource = Join-Path $PSScriptRoot 'fixtures\fake-streamlink.cs'
    $fakeExe = Join-Path $work 'streamlink\streamlink.exe'
    $compile = Start-Process -FilePath $csc -Wait -PassThru -NoNewWindow `
        -ArgumentList ('/nologo /target:exe /out:"' + $fakeExe + '" "' + $fakeSource + '"')
    if ($compile.ExitCode -ne 0) { throw "Failed to compile fake streamlink (exit $($compile.ExitCode))" }

    # 1. Embedded Streamlink resolves an https page URL.
    Write-Host '==> Resolving an https page URL with the embedded Streamlink' -ForegroundColor Cyan
    $result = Invoke-App $exe @('--resolve-stream', 'https://www.twitch.tv/example') @{ FAKE_STREAMLINK_URL = 'http://127.0.0.1:9/fake/direct.mp4' }
    Write-Host $result.StdOut
    if ($result.ExitCode -ne 0) { throw "resolve (https) failed with exit code $($result.ExitCode)" }
    if ($result.StdOut -notmatch 'http://127\.0\.0\.1:9/fake/direct\.mp4') { throw 'resolve (https) did not return the fake URL' }
    if ($result.StdOut -notmatch 'streamlink: .*streamlink\.exe') { throw 'resolve (https) did not use the portable streamlink.exe' }

    # 2. A scheme-less address is normalised and still resolved.
    Write-Host '==> Resolving a scheme-less URL (www.twitch.tv/example)' -ForegroundColor Cyan
    $result = Invoke-App $exe @('--resolve-stream', 'www.twitch.tv/example') @{ FAKE_STREAMLINK_URL = 'http://127.0.0.1:9/fake/direct.mp4' }
    Write-Host $result.StdOut
    if ($result.ExitCode -ne 0) { throw 'resolve (scheme-less) failed' }
    if ($result.StdOut -notmatch 'http://127\.0\.0\.1:9/fake/direct\.mp4') { throw 'resolve (scheme-less) did not return the fake URL' }

    # 3. A failing Streamlink is reported as an error, not a crash.
    Write-Host '==> A failing Streamlink is reported cleanly' -ForegroundColor Cyan
    $result = Invoke-App $exe @('--resolve-stream', 'https://www.twitch.tv/example') @{ FAKE_STREAMLINK_FAIL = '1' }
    Write-Host $result.StdOut
    if ($result.ExitCode -eq 0) { throw 'a failing streamlink should not report success' }
    if ($result.StdOut -notmatch 'RESULT: FAIL') { throw 'a failing streamlink did not produce RESULT: FAIL' }

    # 4. Without any Streamlink the app reports "not found" instead of hanging.
    Write-Host '==> Missing Streamlink is detected' -ForegroundColor Cyan
    Remove-Item -LiteralPath (Join-Path $work 'streamlink') -Recurse -Force
    $result = Invoke-App $exe @('--resolve-stream', 'https://www.twitch.tv/example') @{ DEPLAY_STREAMLINK_IGNORE_SYSTEM = '1' }
    Write-Host $result.StdOut
    if ($result.ExitCode -eq 0) { throw 'a missing streamlink should not report success' }
    if ($result.StdOut -notmatch 'not found') { throw 'a missing streamlink was not detected' }

    Write-Host ''
    Write-Host 'STREAMLINK TEST: PASS' -ForegroundColor Green
}
finally {
    if ($Keep) {
        Write-Host ("Kept: " + $work) -ForegroundColor Yellow
    }
    else {
        Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue
    }
}
