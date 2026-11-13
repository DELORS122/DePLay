# Сборка DePLay из исходников

Проект собирается **без Visual Studio и без .NET SDK**. Используется компилятор
`csc.exe` из .NET Framework 4.x, который поставляется вместе с Windows.

## Требования

- Windows 10/11 (x64 или x86).
- PowerShell 5.1 (входит в Windows).
- .NET Framework 4.8 (входит в современные версии Windows).
- Microsoft Edge WebView2 Runtime — нужен для запуска плеера, но не для сборки.
- Интернет при первой сборке — для загрузки портативного Streamlink
  (около 81 МБ, кэшируется в `build\cache\streamlink`). Офлайн-сборка:
  `-SkipStreamlink`.

## Быстрый старт

```powershell
.\build.ps1
```

или из `cmd.exe`:

```bat
build.cmd
```

Результат:

```
dist\
  DePLay-Setup.exe          — установщик
  DePLay-Setup.exe.sha256   — контрольная сумма и версия
  DePLay-portable.zip       — портативная сборка
```

Проверка распаковки payload и запуска приложения:

```powershell
.\tests\run-tests.ps1
```

Полный прогон собирает приложение, генерирует фикстуры (если есть FFmpeg),
запускает Node-тесты, self-test, интеграцию Streamlink и проверку
установки/удаления. Отдельная smoke-проверка payload:

```powershell
.\tests\smoke-payload.ps1
```

## Режимы сборки

| Команда | Что делает |
|---|---|
| `.\build.ps1 -Target app` | Собирает `build\app` (портативное приложение с `web\` и `streamlink\`) |
| `.\build.ps1 -Target payload` | Приложение + `build\payload\DePLay.Payload.zip` |
| `.\build.ps1 -Target setup` | Payload + `build\setup\DePLay-Setup.exe` |
| `.\build.ps1 -Target installer` | Публикует `dist\` |
| `.\build.ps1` / `-Target all` | Полная сборка |
| `.\build.ps1 -Target clean` | Удаляет `build\` и `dist\` |
| `.\build.ps1 -SkipStreamlink` | Сборка без загрузки/встраивания Streamlink |

## Как это устроено

1. `version.txt` — единственный источник версии (`2.5.0` → `2.5.0.0`).
   Скрипт генерирует `build\generated\VersionInfo.cs` с атрибутами сборки.
2. `csc.exe` компилирует:
   - все нативные исходники из `desktop\` (`Program.cs`, `AppSettings.cs`,
     `Streamlink.cs`, `NativeStrings.cs`, `SelfTest.cs`, `AssemblyInfo.cs`) →
     `DePLay.exe` (WinForms + WebView2, `/target:winexe`);
   - `desktop\Setup.cs`, `desktop\SetupAssemblyInfo.cs` →
     `DePLay-Setup.exe` с внедрённым ресурсом `DePLay.Payload.zip`.
3. В `build\app\web\` копируются `index.html`, `app.js` (или папка `app\`),
   `app\media.js`, `i18n.js`, `styles.css` и `vendor\` (MP4Box.js и hls.js).
4. WebView2 DLL и лицензии копируются из `desktop\lib\`.
5. Скачивается и встраивается портативный Streamlink:
   - `build.ps1` запрашивает `https://api.github.com/repos/streamlink/windows-builds/releases/latest`;
   - берётся ZIP-ассет `streamlink-*-x86_64.zip` (**не** `.exe` — это установщик);
   - архив распаковывается в `build\cache\streamlink`; если `bin\streamlink.exe`
     уже там, загрузка пропускается;
   - вся папка (`bin`, `Python`, `pkgs`, `ffmpeg`) копируется в
     `build\app\streamlink\`.
6. Payload упаковывается `Compress-Archive`; установщик при установке
   распаковывает его в выбранную папку. Если встроенный Streamlink есть,
   проверяется наличие `streamlink/bin/streamlink.exe` в архиве.

Кэш Streamlink (`build\cache\streamlink`) и `build\`/`dist\` не коммитятся —
см. `.gitignore`.

## Версия

Измените `version.txt` (например, `2.7.0`) и пересоберите. Версия попадёт в
`AssemblyVersion`, `FileVersion` и в справку установщика (`/help`).

## Ограничение компилятора

`csc.exe` из .NET Framework поддерживает **C# 5**. В нативном коде нельзя
использовать:

- интерполяцию строк `$"..."`;
- `nameof`, `?.`, `??=`, expression-bodied members;
- `using var`, `record`, локальные функции, `ValueTuple`-синтаксис;
- аргументы `ProcessStartInfo.ArgumentList` (есть только в .NET Core+).

Если в будущем понадобится современный C#, потребуется отдельно доставить
Roslyn-компилятор или установить .NET SDK и добавить `.csproj` — это отдельное
архитектурное решение.

## Добавление новых файлов

- Новый нативный `.cs` → добавьте его в список `foreach ($source in @(...))`
  в `Build-App` или `Build-Setup` в `build.ps1`.
- Новый статический файл фронтенда → добавьте в `Copy-WebAssets`/`$required`.
- Новый NuGet-пакет/DLL → положите DLL в `desktop\lib` и добавьте `/r:` в
  соответствующий список ссылок.
- Новый тест → положите `.js`/`.ps1` в `tests\` и добавьте шаг в
  `tests\run-tests.ps1`.
- Новая фикстура → опишите её в `tests\fixtures\generate-media.py` и
  `generate-media.sh`, добавьте в `tests\fixtures\README.md`.

## Автотесты

Полный прогон:

```powershell
pwsh .\tests\run-tests.ps1
```

| Шаг | Что проверяет |
|---|---|
| Build | Компиляция и раскладка `build\app` |
| media.test.js | MKV/WebM/AVI: дорожки, кодеки, извлечение |
| Fixtures | Генерация MP4/MOV с 1 и 4 дорожками (если есть FFmpeg/Python) |
| wav.test.js | Заголовок WAV, каналы, 16/24 бита |
| mp4-audio.test.js | MP4/MOV, в т.ч. PCM-дорожки, которые MP4Box считает `metadata` |
| Self-test | Файлы, WebView2, HTTP-сервер, `Range`, токен, прокси, URL, Streamlink |
| streamlink.test.ps1 | Встроенный Streamlink, URL без схемы, ошибки, отсутствие |
| uninstall.test.ps1 | Тихая установка и удаление с очисткой данных |

Ключи: `-SkipBuild`, `-WithStreamlink`, `-Keep`.

Переменные окружения для изоляции: `DEPLAY_DATA_DIR`,
`DEPLAY_TEST_MODE=1`, `DEPLAY_UNINSTALL_KEEP_DATA=1`,
`DEPLAY_STREAMLINK_IGNORE_SYSTEM=1`.

FFmpeg для фикстур берётся из `build\cache\streamlink\ffmpeg` или
`build\app\streamlink\ffmpeg`, иначе из `PATH`.

## Диагностика

- **`csc.exe was not found`** — включите компонент «.NET Framework 4.x» в
  Windows Features.
- **`Payload layout is unexpected`** — проверьте, что в `build\app\web\`
  есть `index.html` и `vendor\mp4box.all.min.js`.
- **Приложение не запускается после установки** — установите
  [WebView2 Runtime](https://go.microsoft.com/fwlink/p/?LinkId=2124703).
- **Путь с пробелами** — поддерживается; скрипт экранирует аргументы.
- **Антивирус** — свежесобранный неподписанный exe может вызвать предупреждение;
  для релиза нужна подпись кода (вне рамок этого скрипта).

## Самодиагностика приложения

```powershell
.\build\app\DePLay.exe --selftest
.\build\app\DePLay.exe --version
```

`--selftest` не показывает окно: проверяет наличие `web\`, DLL, WebView2
Runtime, запускает локальный HTTP-сервер, проверяет `Range`, токен медиа-эндпоинта,
обработку 404 и прокси `/remote` (перезапись HLS-плейлиста и передачу `Range`).
Код возврата `0` — успех, `1` — ошибка (подробности в
`%LOCALAPPDATA%\DePLay\DePLay.log`).

Для отладки веб-части можно открыть DevTools WebView2:

```powershell
.\build\app\DePLay.exe --remote-debugging-port=9222
# затем http://127.0.0.1:9222/json
```

## Потоки и Streamlink

- Прямые ссылки на медиафайлы и HLS (`.m3u8`) воспроизводятся без Streamlink.
- HLS идёт через локальный прокси `/remote`: плейлисты переписываются, чтобы
  сегменты и ключи тоже запрашивались через DePLay (нет CORS-проблем).
- Streamlink **встроен в сборку**: `build\app\streamlink\bin\streamlink.exe`
  (портативный архив `streamlink/windows-builds`). Пользователю не нужно
  устанавливать его отдельно.
- `Streamlink.Detect` сначала ищет встроенную копию рядом с `DePLay.exe`, затем
  путь из настроек, стандартные папки и `PATH`. Относительный путь позволяет
  переносить папку приложения.
- `-SkipStreamlink` собирает приложение без загрузки. Кэш
  `build\cache\streamlink` переиспользуется, поэтому повторные сборки не
  скачивают архив.
- Диагностика без окна:

  ```powershell
  .\build\app\DePLay.exe --resolve-stream "https://www.youtube.com/watch?v=ID"
  ```

  Печатает найденный `streamlink.exe`, прямой URL и `RESULT: PASS/FAIL`.
- Ссылку можно перетащить в окно или передать аргументом командной строки;
  отдельной кнопки в интерфейсе нет. Адрес без схемы нормализуется в `https://`.
- Прокси использует TLS 1.2: на старых версиях Windows без его поддержки
  HTTPS-потоки могут не открыться.

## Удаление и тестовый режим

- `Uninstall.exe` без аргументов работает как деинсталлятор (двойной клик в
  Проводнике больше не запускает установку заново).
- Удаляются файлы, ярлыки, записи `HKCU`, процессы, настройки, журналы, кэш
  WebView2 и `%TEMP%\DePLay*`.
- `DEPLAY_TEST_MODE=1` отключает реестр, ярлыки и завершение процессов —
  используется в `tests\uninstall.test.ps1`.
- `DEPLAY_DATA_DIR` переносит настройки/логи/WebView2 в отдельную папку.
- `DEPLAY_UNINSTALL_KEEP_DATA=1` сохраняет пользовательские данные при удалении.
