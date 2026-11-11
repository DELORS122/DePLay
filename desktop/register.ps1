[CmdletBinding()]
param(
    [switch]$Quiet,
    [switch]$OpenSettings
)

$ErrorActionPreference = 'Stop'

$app = Join-Path $PSScriptRoot 'DePLay.exe'
if (-not (Test-Path -LiteralPath $app)) {
    throw "Рядом со скриптом не найден DePLay.exe: $app"
}
$app = (Resolve-Path -LiteralPath $app).Path
$appFolder = Split-Path -Parent $app
$progId = 'DePLay.Video'
$extensions = @('.mp4', '.m4v', '.mov', '.webm', '.ogv')

$classes = 'HKCU:\Software\Classes'
$progKey = Join-Path $classes $progId
$applicationsKey = Join-Path $classes 'Applications\DePLay.exe'

function Ensure-Key {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -Path $Path -Force | Out-Null
    }
}

Ensure-Key (Join-Path $progKey 'DefaultIcon')
Ensure-Key (Join-Path $progKey 'shell\open\command')
Set-ItemProperty -Path $progKey -Name '(default)' -Value 'Видео DePLay'
Set-ItemProperty -Path $progKey -Name 'FriendlyTypeName' -Value 'Видео DePLay'
Set-ItemProperty -Path (Join-Path $progKey 'DefaultIcon') -Name '(default)' -Value ('"' + $app + '",0')
Set-ItemProperty -Path (Join-Path $progKey 'shell\open\command') -Name '(default)' -Value ('"' + $app + '" "%1"')

Ensure-Key (Join-Path $applicationsKey 'DefaultIcon')
Ensure-Key (Join-Path $applicationsKey 'shell\open\command')
Ensure-Key (Join-Path $applicationsKey 'SupportedTypes')
Set-ItemProperty -Path $applicationsKey -Name 'FriendlyAppName' -Value 'DePLay'
Set-ItemProperty -Path $applicationsKey -Name 'ApplicationName' -Value 'DePLay'
Set-ItemProperty -Path (Join-Path $applicationsKey 'DefaultIcon') -Name '(default)' -Value ('"' + $app + '",0')
Set-ItemProperty -Path (Join-Path $applicationsKey 'shell\open\command') -Name '(default)' -Value ('"' + $app + '" "%1"')

$capabilities = 'HKCU:\Software\DePLay\Capabilities'
$fileAssociations = Join-Path $capabilities 'FileAssociations'
Ensure-Key $fileAssociations
Set-ItemProperty -Path $capabilities -Name 'ApplicationName' -Value 'DePLay'
Set-ItemProperty -Path $capabilities -Name 'ApplicationDescription' -Value 'Локальный медиаплеер DePLay'
Set-ItemProperty -Path $capabilities -Name 'ApplicationIcon' -Value ('"' + $app + '",0')

foreach ($extension in $extensions) {
    Set-ItemProperty -Path $fileAssociations -Name $extension -Value $progId

    $openWith = Join-Path $classes ($extension + '\OpenWithProgids')
    Ensure-Key $openWith
    New-ItemProperty -Path $openWith -Name $progId -PropertyType String -Value '' -Force | Out-Null

    New-ItemProperty -Path (Join-Path $applicationsKey 'SupportedTypes') -Name $extension -PropertyType String -Value '' -Force | Out-Null
}

$registeredApplications = 'HKCU:\Software\RegisteredApplications'
Ensure-Key $registeredApplications
New-ItemProperty -Path $registeredApplications -Name 'DePLay' -PropertyType String -Value 'Software\DePLay\Capabilities' -Force | Out-Null

$appPaths = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\App Paths\DePLay.exe'
Ensure-Key $appPaths
Set-ItemProperty -Path $appPaths -Name '(default)' -Value $app
Set-ItemProperty -Path $appPaths -Name 'Path' -Value $appFolder

$startMenuFolder = [Environment]::GetFolderPath('Programs')
if ($startMenuFolder) {
    $shortcutPath = Join-Path $startMenuFolder 'DePLay.lnk'
    try {
        $shell = New-Object -ComObject WScript.Shell
        $shortcut = $shell.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = $app
        $shortcut.WorkingDirectory = $appFolder
        $shortcut.IconLocation = $app + ',0'
        $shortcut.Description = 'DePLay — локальный медиаплеер'
        $shortcut.Save()
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($shell) | Out-Null
    }
    catch {
        if (-not $Quiet) { Write-Warning "Не удалось создать ярлык в меню «Пуск»: $($_.Exception.Message)" }
    }
}

if (-not $Quiet) {
    Write-Host ''
    Write-Host 'DePLay зарегистрирован.' -ForegroundColor Green
    Write-Host 'Доступные расширения: ' + ($extensions -join ', ')
    Write-Host ''
    Write-Host 'Windows 11 не разрешает программе назначить себя обработчиком по умолчанию без подтверждения.' -ForegroundColor Yellow
    Write-Host 'Откройте: Параметры → Приложения → Приложения по умолчанию → DePLay'
    Write-Host 'и выберите нужные расширения. Либо нажмите правой кнопкой на видеофайле:'
    Write-Host '«Открыть с помощью» → «Выбрать другое приложение» → DePLay → «Всегда».'
    Write-Host ''
    Write-Host 'Если папку DePLayApp переместить, запустите register.cmd заново.'
}

if ($OpenSettings) {
    try {
        Start-Process 'ms-settings:defaultapps?registeredAppUser=DePLay'
    }
    catch {
        try { Start-Process 'ms-settings:defaultapps' }
        catch { /* ignore */ }
    }
}
