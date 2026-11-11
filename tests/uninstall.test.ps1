[CmdletBinding()]
param(
    [string]$SetupPath,
    [switch]$Build,
    [switch]$Keep
)

$ErrorActionPreference = 'Stop'
$scriptRoot = Split-Path -Parent $PSScriptRoot

if (-not $SetupPath) { $SetupPath = Join-Path $scriptRoot 'dist\DePLay-Setup.exe' }
if ($Build -or -not (Test-Path -LiteralPath $SetupPath)) {
    Write-Host 'Building installer (embedded Streamlink download skipped)...' -ForegroundColor Cyan
    & (Join-Path $scriptRoot 'build.ps1') -Target setup -SkipStreamlink
    $SetupPath = Join-Path $scriptRoot 'build\setup\DePLay-Setup.exe'
}
if (-not (Test-Path -LiteralPath $SetupPath)) { throw "Installer not found: $SetupPath" }

$root = Join-Path $scriptRoot ('tests\.tmp\uninstall-' + [guid]::NewGuid().ToString('N'))
$install = Join-Path $root 'install'
$data = Join-Path $root 'data'
New-Item -ItemType Directory -Force -Path $root | Out-Null

$previous = @{
    DEPLAY_TEST_MODE           = $env:DEPLAY_TEST_MODE
    DEPLAY_DATA_DIR            = $env:DEPLAY_DATA_DIR
    DEPLAY_UNINSTALL_KEEP_DATA = $env:DEPLAY_UNINSTALL_KEEP_DATA
}

function Wait-Gone([string]$Path, [int]$TimeoutSeconds) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (-not (Test-Path -LiteralPath $Path)) { return $true }
        Start-Sleep -Milliseconds 250
    }
    return (-not (Test-Path -LiteralPath $Path))
}

try {
    $env:DEPLAY_TEST_MODE = '1'
    $env:DEPLAY_DATA_DIR = $data
    $env:DEPLAY_UNINSTALL_KEEP_DATA = '0'

    Write-Host '==> Installing into a temporary folder' -ForegroundColor Cyan
    $arguments = '/S /DIR="' + $install + '" /NOREG /NOSHORTCUTS /NOLAUNCH'
    $setup = Start-Process -FilePath $SetupPath -ArgumentList $arguments -Wait -PassThru
    if ($setup.ExitCode -ne 0) { throw "installer failed with exit code $($setup.ExitCode)" }

    foreach ($relative in @('DePLay.exe', 'Uninstall.exe', 'web\index.html', 'web\app\media.js')) {
        $path = Join-Path $install $relative
        if (-not (Test-Path -LiteralPath $path)) { throw "installer did not create $relative" }
    }
    Write-Host 'Installed files OK' -ForegroundColor Green

    # Regression: launching Uninstall.exe without /uninstall used to run the
    # installer again (and re-download the payload) instead of uninstalling.
    Write-Host '==> Running Uninstall.exe /S without /uninstall' -ForegroundColor Cyan
    $uninstaller = Join-Path $install 'Uninstall.exe'
    $uninstall = Start-Process -FilePath $uninstaller -ArgumentList '/S' -Wait -PassThru
    if ($uninstall.ExitCode -ne 0) { throw "uninstaller failed with exit code $($uninstall.ExitCode)" }

    if (-not (Wait-Gone $install 20)) {
        throw "the installation folder was not removed: $install"
    }
    Write-Host 'Installation folder removed' -ForegroundColor Green

    if (-not (Wait-Gone $data 10)) {
        throw "the data folder was not removed: $data"
    }
    Write-Host 'Settings and cache removed' -ForegroundColor Green

    if (Test-Path -LiteralPath $install) {
        throw 'Uninstall.exe recreated the installation (the reinstall regression is back)'
    }

    Write-Host ''
    Write-Host 'UNINSTALL TEST: PASS' -ForegroundColor Green
}
finally {
    foreach ($key in $previous.Keys) {
        if ($null -eq $previous[$key]) { Remove-Item -Path ("env:" + $key) -ErrorAction SilentlyContinue }
        else { Set-Item -Path ("env:" + $key) -Value $previous[$key] }
    }
    if ($Keep) { Write-Host ("Kept: " + $root) -ForegroundColor Yellow }
    else { Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue }
}
