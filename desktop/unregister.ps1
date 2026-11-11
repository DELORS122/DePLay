[CmdletBinding()]
param(
    [switch]$Quiet
)

$ErrorActionPreference = 'Stop'

$progId = 'DePLay.Video'
$extensions = @('.mp4', '.m4v', '.mov', '.webm', '.ogv')
$classes = 'HKCU:\Software\Classes'

foreach ($extension in $extensions) {
    $openWith = Join-Path $classes ($extension + '\OpenWithProgids')
    if (Test-Path -LiteralPath $openWith) {
        Remove-ItemProperty -Path $openWith -Name $progId -ErrorAction SilentlyContinue
    }
}

$keys = @(
    (Join-Path $classes $progId),
    (Join-Path $classes 'Applications\DePLay.exe'),
    'HKCU:\Software\DePLay',
    'HKCU:\Software\Microsoft\Windows\CurrentVersion\App Paths\DePLay.exe'
)
foreach ($key in $keys) {
    if (Test-Path -LiteralPath $key) {
        Remove-Item -LiteralPath $key -Recurse -Force
    }
}

$registeredApplications = 'HKCU:\Software\RegisteredApplications'
if (Test-Path -LiteralPath $registeredApplications) {
    Remove-ItemProperty -Path $registeredApplications -Name 'DePLay' -ErrorAction SilentlyContinue
}

$startMenuFolder = [Environment]::GetFolderPath('Programs')
if ($startMenuFolder) {
    $shortcutPath = Join-Path $startMenuFolder 'DePLay.lnk'
    if (Test-Path -LiteralPath $shortcutPath) {
        Remove-Item -LiteralPath $shortcutPath -Force
    }
}

if (-not $Quiet) {
    Write-Host ''
    Write-Host 'Регистрация DePLay удалена.' -ForegroundColor Green
    Write-Host 'Файлы приложения не тронуты. Если DePLay был выбран по умолчанию,'
    Write-Host 'назначьте другой плеер в Параметры → Приложения → Приложения по умолчанию.'
}
