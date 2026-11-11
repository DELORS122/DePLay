(() => {
  'use strict';

  const LANGS = ['ru', 'en', 'de'];

  const MESSAGES = {
    ru: {
      'app.title': 'DePLay — видео, фото и звук',
      'status.idle': 'ожидание',
      'status.onDevice': 'на устройстве',
      'mode.video': 'видео',
      'mode.image': 'фото',
      'media.video': 'видео',
      'media.image': 'изображение',
      'media.stream': 'поток',
      'media.audioOnly': 'только звук',
      'media.analysis': 'анализ…',
      'media.standard': 'стандартный',
      'facts.duration': 'Длительность',
      'facts.orientation': 'Ориентация',
      'orientation.landscape': 'Альбомная',
      'orientation.portrait': 'Портретная',
      'loading.default': 'Загрузка…',
      'loading.openingVideo': 'Открываем видео…',
      'loading.openingFile': 'Открытие файла…',
      'loading.buffering': 'Буферизация…',
      'loading.image': 'загрузка…',
      'aria.play': 'Играть',
      'aria.pause': 'Пауза',
      'aria.muteOn': 'Включить звук',
      'aria.muteOff': 'Выключить звук',
      'play.title.play': 'Играть / пауза (Space)',
      'play.title.pause': 'Пауза (Space)',
      'toast.playFailed': 'Не удалось начать воспроизведение',
      'toast.frame': 'Кадр {frame} · {time} · {fps} fps',
      'toast.speed': 'Скорость {rate}',
      'toast.loopOn': 'Повтор включён',
      'toast.loopOff': 'Повтор выключен',
      'fps.title': 'Частота кадров: {fps} · шаг кадра ≈ {ms} мс',
      'fps.auto': 'Авто · {fps}',
      'fps.autoPlain': 'Авто',
      'aria.time': '{current} из {total}',
      'track.nativeName': 'Звук видео',
      'track.nativeMeta': 'родная дорожка контейнера',
      'track.externalMeta': 'внешняя дорожка · {duration}',
      'track.externalShort': 'внешняя дорожка',
      'track.externalBadge': 'внешняя',
      'track.remove': 'Удалить дорожку',
      'track.enable': 'Включить дорожку',
      'track.enableNamed': 'Включить дорожку {name}',
      'track.removeNamed': 'Удалить дорожку {name}',
      'track.volume': 'Громкость дорожки',
      'track.extractingSuffix': ' · извлечение',
      'track.codecSupported': 'Кодек поддерживается',
      'track.codecUnsupported': 'Кодек не поддерживается',
      'track.tooLarge': 'Файл слишком большой для извлечения звука',
      'track.extracting': 'Извлекаем звук из контейнера…',
      'track.extractError': 'Не удалось извлечь дорожку',
      'channel.mono': 'моно',
      'channel.stereo': 'стерео',
      'channel.multi': '{count} кан.',
      'channel.audio': 'звук',
      'rate.khz': '{value} кГц',
      'lang.noLanguage': 'Без языка',
      'track.title.language': '{language} дорожка',
      'track.title.default': 'Дорожка {n}',
      'audio.openVideoFirst': 'Сначала откройте видео — затем добавьте звуковые дорожки',
      'audio.openFailed': 'Не удалось открыть дорожку «{name}»',
      'audio.removed': 'Дорожка удалена',
      'toast.trackPlayFailed': 'Не удалось воспроизвести дорожку «{title}»',
      'toast.trackExtractFailed': 'Не удалось извлечь дорожку «{title}»',
      'toast.firstVideo': 'Открыт первый видеофайл',
      'toast.unsupportedFile': 'Формат не поддерживается. Откройте видео, изображение или аудиофайл.',
      'toast.imageOpenFailed': 'Не удалось открыть изображение. Возможно, формат не поддерживается.',
      'toast.videoOpenFailed': 'Не удалось открыть «{name}». Возможно, кодек не поддерживается браузером.',
      'toast.audioOnlyFallback': 'Видео не поддерживается — воспроизводится только звук из «{name}».',
      'toast.imageTips': 'Колесо мыши — зум · двойной клик — приблизить · 0 — сбросить',
      'toast.fullscreenUnavailable': 'Полноэкранный режим недоступен',
      'toast.fullscreenUnsupported': 'Браузер не поддерживает полноэкранный режим',
      'toast.openVideoFirst': 'Сначала откройте видео',
      'toast.pipUnavailable': 'Картинка в картинке недоступна для этого файла',
      'toast.speedStep': 'Шаг кадра: 1/{fps} с · {fps} fps',
      'toast.desktopOpenFailed': 'Не удалось открыть файл: {message}',
      'streamlink.autoReady': 'найден автоматически: {path}',
      'streamlink.customReady': 'путь найден: {path}',
      'streamlink.customMissing': 'по указанному пути не найден',
      'streamlink.missing': 'не найден — установите Streamlink или укажите путь',
      'streamlink.resolving': 'Streamlink ищет поток…',
      'toast.streamlinkFailed': 'Не удалось открыть ссылку: {message}',
      'toast.streamPlayFailed': 'Не удалось воспроизвести поток. Ссылка могла устареть.',
      'toast.streamlinkDropped': 'Ссылка передана Streamlink…',
      'loading.stream': 'Открываем поток…',
      'loading.audioOnly': 'Извлекаем звук…',
      'error.read': 'ошибка чтения',
      'gallery.open': 'Открыть {name}',
      'error.mp4boxMissing': 'MP4Box не загружен',
      'error.mp4Parse': 'Ошибка разбора MP4',
      'error.mp4Cancelled': 'Разбор отменён',
      'error.mp4Metadata': 'Метаданные MP4 не найдены',
      'error.aacFrame': 'AAC-кадр слишком большой для ADTS',
      'error.fileClosed': 'Файл уже закрыт',
      'error.trackNotFound': 'Дорожка не найдена в контейнере',
      'error.extractFailed': 'Не удалось извлечь звук из контейнера',
      'error.noSamples': 'В дорожке нет звуковых сэмплов',
      'error.unsupportedFormat': 'Формат дорожки не поддерживается',
      'error.playbackExtracted': 'Браузер не смог воспроизвести извлечённый звук',
      'track.codecReason.ac3': 'Chromium не декодирует AC-3 без внешнего декодера',
      'track.codecReason.eac3': 'Chromium не декодирует E-AC-3 без внешнего декодера',
      'track.codecReason.opus': 'Opus в MP4 пока не извлекается этим плеером',
      'track.codecReason.flac': 'FLAC в MP4 пока не извлекается этим плеером',
      'track.codecReason.unsupported': 'Кодек не поддерживается браузером',
      'toggleAll.enable': 'Включить все',
      'toggleAll.disable': 'Выключить все',
      'toggleAll.ariaEnable': 'Включить все звуковые дорожки',
      'toggleAll.ariaDisable': 'Выключить все звуковые дорожки',
      'status.video': 'видео',
      'status.image': 'фото',
    },
    en: {
      'app.title': 'DePLay — video, photos and sound',
      'status.idle': 'idle',
      'status.onDevice': 'on device',
      'mode.video': 'video',
      'mode.image': 'photo',
      'media.video': 'video',
      'media.image': 'image',
      'media.stream': 'stream',
      'media.audioOnly': 'audio only',
      'media.analysis': 'analyzing…',
      'media.standard': 'standard',
      'facts.duration': 'Duration',
      'facts.orientation': 'Orientation',
      'orientation.landscape': 'Landscape',
      'orientation.portrait': 'Portrait',
      'loading.default': 'Loading…',
      'loading.openingVideo': 'Opening video…',
      'loading.openingFile': 'Opening file…',
      'loading.buffering': 'Buffering…',
      'loading.image': 'loading…',
      'aria.play': 'Play',
      'aria.pause': 'Pause',
      'aria.muteOn': 'Unmute',
      'aria.muteOff': 'Mute',
      'play.title.play': 'Play / pause (Space)',
      'play.title.pause': 'Pause (Space)',
      'toast.playFailed': 'Could not start playback',
      'toast.frame': 'Frame {frame} · {time} · {fps} fps',
      'toast.speed': 'Speed {rate}',
      'toast.loopOn': 'Loop enabled',
      'toast.loopOff': 'Loop disabled',
      'fps.title': 'Frame rate: {fps} · frame step ≈ {ms} ms',
      'fps.auto': 'Auto · {fps}',
      'fps.autoPlain': 'Auto',
      'aria.time': '{current} of {total}',
      'track.nativeName': 'Video sound',
      'track.nativeMeta': 'native container track',
      'track.externalMeta': 'external track · {duration}',
      'track.externalShort': 'external track',
      'track.externalBadge': 'external',
      'track.remove': 'Remove track',
      'track.enable': 'Enable track',
      'track.enableNamed': 'Enable track {name}',
      'track.removeNamed': 'Remove track {name}',
      'track.volume': 'Track volume',
      'track.extractingSuffix': ' · extracting',
      'track.codecSupported': 'Codec supported',
      'track.codecUnsupported': 'Codec not supported',
      'track.tooLarge': 'The file is too large for audio extraction',
      'track.extracting': 'Extracting audio from the container…',
      'track.extractError': 'Could not extract the track',
      'channel.mono': 'mono',
      'channel.stereo': 'stereo',
      'channel.multi': '{count} ch',
      'channel.audio': 'audio',
      'rate.khz': '{value} kHz',
      'lang.noLanguage': 'No language',
      'track.title.language': '{language} track',
      'track.title.default': 'Track {n}',
      'audio.openVideoFirst': 'Open a video first — then add audio tracks',
      'audio.openFailed': 'Could not open track “{name}”',
      'audio.removed': 'Track removed',
      'toast.trackPlayFailed': 'Could not play track “{title}”',
      'toast.trackExtractFailed': 'Could not extract track “{title}”',
      'toast.firstVideo': 'Opened the first video file',
      'toast.unsupportedFile': 'Unsupported format. Open a video, image or audio file.',
      'toast.imageOpenFailed': 'Could not open the image. The format may not be supported.',
      'toast.videoOpenFailed': 'Could not open “{name}”. The codec may not be supported by the browser.',
      'toast.audioOnlyFallback': 'The video codec is unsupported — playing only the audio from “{name}”.',
      'toast.imageTips': 'Mouse wheel — zoom · double-click — enlarge · 0 — reset',
      'toast.fullscreenUnavailable': 'Fullscreen is unavailable',
      'toast.fullscreenUnsupported': 'This browser does not support fullscreen',
      'toast.openVideoFirst': 'Open a video first',
      'toast.pipUnavailable': 'Picture in picture is unavailable for this file',
      'toast.speedStep': 'Frame step: 1/{fps} s · {fps} fps',
      'toast.desktopOpenFailed': 'Could not open the file: {message}',
      'streamlink.autoReady': 'detected automatically: {path}',
      'streamlink.customReady': 'path found: {path}',
      'streamlink.customMissing': 'not found at the configured path',
      'streamlink.missing': 'not found — install Streamlink or set the path',
      'streamlink.resolving': 'Streamlink is resolving the stream…',
      'toast.streamlinkFailed': 'Could not open the link: {message}',
      'toast.streamPlayFailed': 'Could not play the stream. The link may have expired.',
      'toast.streamlinkDropped': 'The link was passed to Streamlink…',
      'loading.stream': 'Opening the stream…',
      'loading.audioOnly': 'Extracting the audio…',
      'error.read': 'read error',
      'gallery.open': 'Open {name}',
      'error.mp4boxMissing': 'MP4Box is not loaded',
      'error.mp4Parse': 'MP4 parsing error',
      'error.mp4Cancelled': 'Parsing cancelled',
      'error.mp4Metadata': 'MP4 metadata not found',
      'error.aacFrame': 'AAC frame is too large for ADTS',
      'error.fileClosed': 'The file is already closed',
      'error.trackNotFound': 'Track not found in the container',
      'error.extractFailed': 'Could not extract audio from the container',
      'error.noSamples': 'The track contains no audio samples',
      'error.unsupportedFormat': 'This track format is not supported',
      'error.playbackExtracted': 'The browser could not play the extracted audio',
      'track.codecReason.ac3': 'Chromium cannot decode AC-3 without an external decoder',
      'track.codecReason.eac3': 'Chromium cannot decode E-AC-3 without an external decoder',
      'track.codecReason.opus': 'Opus in MP4 is not extracted by this player yet',
      'track.codecReason.flac': 'FLAC in MP4 is not extracted by this player yet',
      'track.codecReason.unsupported': 'The codec is not supported by the browser',
      'toggleAll.enable': 'Enable all',
      'toggleAll.disable': 'Disable all',
      'toggleAll.ariaEnable': 'Enable all audio tracks',
      'toggleAll.ariaDisable': 'Disable all audio tracks',
      'status.video': 'video',
      'status.image': 'photo',
    },
    de: {
      'app.title': 'DePLay — Video, Fotos und Ton',
      'status.idle': 'Bereit',
      'status.onDevice': 'auf dem Gerät',
      'mode.video': 'Video',
      'mode.image': 'Foto',
      'media.video': 'Video',
      'media.image': 'Bild',
      'media.stream': 'Stream',
      'media.audioOnly': 'nur Ton',
      'media.analysis': 'Analyse…',
      'media.standard': 'Standard',
      'facts.duration': 'Dauer',
      'facts.orientation': 'Ausrichtung',
      'orientation.landscape': 'Querformat',
      'orientation.portrait': 'Hochformat',
      'loading.default': 'Wird geladen…',
      'loading.openingVideo': 'Video wird geöffnet…',
      'loading.openingFile': 'Datei wird geöffnet…',
      'loading.buffering': 'Puffern…',
      'loading.image': 'wird geladen…',
      'aria.play': 'Abspielen',
      'aria.pause': 'Pause',
      'aria.muteOn': 'Ton einschalten',
      'aria.muteOff': 'Ton ausschalten',
      'play.title.play': 'Wiedergabe / Pause (Space)',
      'play.title.pause': 'Pause (Space)',
      'toast.playFailed': 'Wiedergabe konnte nicht gestartet werden',
      'toast.frame': 'Bild {frame} · {time} · {fps} fps',
      'toast.speed': 'Geschwindigkeit {rate}',
      'toast.loopOn': 'Wiederholung aktiviert',
      'toast.loopOff': 'Wiederholung deaktiviert',
      'fps.title': 'Bildrate: {fps} · Bildschritt ≈ {ms} ms',
      'fps.auto': 'Auto · {fps}',
      'fps.autoPlain': 'Auto',
      'aria.time': '{current} von {total}',
      'track.nativeName': 'Videoton',
      'track.nativeMeta': 'native Tonspur des Containers',
      'track.externalMeta': 'externe Spur · {duration}',
      'track.externalShort': 'externe Spur',
      'track.externalBadge': 'extern',
      'track.remove': 'Tonspur entfernen',
      'track.enable': 'Tonspur aktivieren',
      'track.enableNamed': 'Tonspur {name} aktivieren',
      'track.removeNamed': 'Tonspur {name} entfernen',
      'track.volume': 'Tonspur-Lautstärke',
      'track.extractingSuffix': ' · wird extrahiert',
      'track.codecSupported': 'Codec unterstützt',
      'track.codecUnsupported': 'Codec nicht unterstützt',
      'track.tooLarge': 'Die Datei ist zu groß für die Tonextraktion',
      'track.extracting': 'Ton wird aus dem Container extrahiert…',
      'track.extractError': 'Tonspur konnte nicht extrahiert werden',
      'channel.mono': 'Mono',
      'channel.stereo': 'Stereo',
      'channel.multi': '{count} Kan.',
      'channel.audio': 'Ton',
      'rate.khz': '{value} kHz',
      'lang.noLanguage': 'Keine Sprache',
      'track.title.language': '{language}-Tonspur',
      'track.title.default': 'Tonspur {n}',
      'audio.openVideoFirst': 'Öffnen Sie zuerst ein Video — fügen Sie dann Tonspuren hinzu',
      'audio.openFailed': 'Tonspur „{name}“ konnte nicht geöffnet werden',
      'audio.removed': 'Tonspur entfernt',
      'toast.trackPlayFailed': 'Tonspur „{title}“ konnte nicht wiedergegeben werden',
      'toast.trackExtractFailed': 'Tonspur „{title}“ konnte nicht extrahiert werden',
      'toast.firstVideo': 'Erste Videodatei geöffnet',
      'toast.unsupportedFile': 'Format nicht unterstützt. Öffnen Sie ein Video, Bild oder eine Audiodatei.',
      'toast.imageOpenFailed': 'Das Bild konnte nicht geöffnet werden. Das Format wird möglicherweise nicht unterstützt.',
      'toast.videoOpenFailed': '„{name}“ konnte nicht geöffnet werden. Der Codec wird vom Browser möglicherweise nicht unterstützt.',
      'toast.audioOnlyFallback': 'Der Videocodec wird nicht unterstützt – es wird nur der Ton aus „{name}“ abgespielt.',
      'toast.imageTips': 'Mausrad — Zoom · Doppelklick — vergrößern · 0 — zurücksetzen',
      'toast.fullscreenUnavailable': 'Vollbild ist nicht verfügbar',
      'toast.fullscreenUnsupported': 'Dieser Browser unterstützt kein Vollbild',
      'toast.openVideoFirst': 'Öffnen Sie zuerst ein Video',
      'toast.pipUnavailable': 'Bild-in-Bild ist für diese Datei nicht verfügbar',
      'toast.speedStep': 'Bildschritt: 1/{fps} s · {fps} fps',
      'toast.desktopOpenFailed': 'Datei konnte nicht geöffnet werden: {message}',
      'streamlink.autoReady': 'automatisch gefunden: {path}',
      'streamlink.customReady': 'Pfad gefunden: {path}',
      'streamlink.customMissing': 'am angegebenen Pfad nicht gefunden',
      'streamlink.missing': 'nicht gefunden – Streamlink installieren oder Pfad angeben',
      'streamlink.resolving': 'Streamlink sucht den Stream…',
      'toast.streamlinkFailed': 'Link konnte nicht geöffnet werden: {message}',
      'toast.streamPlayFailed': 'Der Stream konnte nicht wiedergegeben werden. Der Link ist möglicherweise abgelaufen.',
      'toast.streamlinkDropped': 'Der Link wurde an Streamlink übergeben…',
      'loading.stream': 'Stream wird geöffnet…',
      'loading.audioOnly': 'Ton wird extrahiert…',
      'error.read': 'Lesefehler',
      'gallery.open': '{name} öffnen',
      'error.mp4boxMissing': 'MP4Box ist nicht geladen',
      'error.mp4Parse': 'Fehler beim Parsen der MP4-Datei',
      'error.mp4Cancelled': 'Parsen abgebrochen',
      'error.mp4Metadata': 'MP4-Metadaten nicht gefunden',
      'error.aacFrame': 'AAC-Frame ist zu groß für ADTS',
      'error.fileClosed': 'Die Datei ist bereits geschlossen',
      'error.trackNotFound': 'Tonspur im Container nicht gefunden',
      'error.extractFailed': 'Ton konnte nicht aus dem Container extrahiert werden',
      'error.noSamples': 'Die Tonspur enthält keine Audio-Samples',
      'error.unsupportedFormat': 'Dieses Tonspurformat wird nicht unterstützt',
      'error.playbackExtracted': 'Der Browser konnte den extrahierten Ton nicht wiedergeben',
      'track.codecReason.ac3': 'Chromium kann AC-3 nicht ohne externen Decoder dekodieren',
      'track.codecReason.eac3': 'Chromium kann E-AC-3 nicht ohne externen Decoder dekodieren',
      'track.codecReason.opus': 'Opus in MP4 wird von diesem Player noch nicht extrahiert',
      'track.codecReason.flac': 'FLAC in MP4 wird von diesem Player noch nicht extrahiert',
      'track.codecReason.unsupported': 'Der Codec wird vom Browser nicht unterstützt',
      'toggleAll.enable': 'Alle aktivieren',
      'toggleAll.disable': 'Alle deaktivieren',
      'toggleAll.ariaEnable': 'Alle Tonspuren aktivieren',
      'toggleAll.ariaDisable': 'Alle Tonspuren deaktivieren',
      'status.video': 'Video',
      'status.image': 'Foto',
    },
  };

  const UNITS = {
    track: {
      ru: ['дорожка', 'дорожки', 'дорожек'],
      en: ['track', 'tracks'],
      de: ['Spur', 'Spuren'],
    },
    file: {
      ru: ['файл', 'файла', 'файлов'],
      en: ['file', 'files'],
      de: ['Datei', 'Dateien'],
    },
  };

  const PLURALS = {
    trackAdded: {
      ru: (n) => `${n} ${pickRu(n, ['дорожка добавлена', 'дорожки добавлены', 'дорожек добавлено'])} · звучат одновременно`,
      en: (n) => `${n} audio ${n === 1 ? 'track' : 'tracks'} added · playing together`,
      de: (n) => `${n} ${n === 1 ? 'Tonspur hinzugefügt' : 'Tonspuren hinzugefügt'} · gleichzeitig wiedergegeben`,
    },
    tracksFound: {
      ru: (n) => `Найдено ${n} ${pickRu(n, ['звуковая дорожка', 'звуковые дорожки', 'звуковых дорожек'])} · переключение в настройках`,
      en: (n) => `Found ${n} audio ${n === 1 ? 'track' : 'tracks'} · switch them in settings`,
      de: (n) => `${n} ${n === 1 ? 'Tonspur' : 'Tonspuren'} gefunden · Umschalten in den Einstellungen`,
    },
  };

  const STATIC = [
    ['DePLay — видео, фото и звук', 'DePLay — video, photos and sound', 'DePLay — Video, Fotos und Ton'],
    ['локальный медиаплеер', 'local media player', 'lokaler Mediaplayer'],
    ['Перетащите видео или фото', 'Drag video or photo here', 'Video oder Foto hierher ziehen'],
    ['Полноэкранный просмотр с плавным зумом, покадровой перемоткой, встроенными звуковыми дорожками и живым миксом.', 'Full-screen viewing with smooth zoom, frame stepping, embedded audio tracks and live mixing.', 'Vollbildansicht mit sanftem Zoom, Einzelbildschaltung, eingebetteten Tonspuren und Live-Mixing.'],
    ['Выбрать файл', 'Choose file', 'Datei wählen'],
    ['Настройки', 'Settings', 'Einstellungen'],
    ['Поддерживаемые форматы', 'Supported formats', 'Unterstützte Formate'],
    ['или перетащите файлы в окно ', 'or drag files into the window ', 'oder Dateien in das Fenster ziehen '],
    ['Загрузка…', 'Loading…', 'Wird geladen…'],
    ['Перемотка видео', 'Video seek', 'Videospur'],
    ['Скорость воспроизведения ( [ / ] )', 'Playback speed ( [ / ] )', 'Wiedergabegeschwindigkeit ( [ / ] )'],
    ['Скорость', 'Speed', 'Geschwindigkeit'],
    ['Скорость воспроизведения', 'Playback speed', 'Wiedergabegeschwindigkeit'],
    ['До 0.1× — плавное замедление с сохранением высоты тона.', 'Down to 0.1× — smooth slow motion with preserved pitch.', 'Bis 0,1× — sanfte Zeitlupe mit erhaltener Tonhöhe.'],
    ['Назад на 2 секунды (←)', 'Back 2 seconds (←)', '2 Sekunden zurück (←)'],
    ['−2с', '−2s', '−2s'],
    ['Предыдущий кадр (,)', 'Previous frame (,)', 'Vorheriges Bild (,)'],
    ['Предыдущий кадр', 'Previous frame', 'Vorheriges Bild'],
    ['Играть / пауза (Space)', 'Play / pause (Space)', 'Wiedergabe / Pause (Space)'],
    ['Играть', 'Play', 'Abspielen'],
    ['Следующий кадр (.)', 'Next frame (.)', 'Nächstes Bild (.)'],
    ['Следующий кадр', 'Next frame', 'Nächstes Bild'],
    ['Вперёд на 2 секунды (→)', 'Forward 2 seconds (→)', '2 Sekunden vor (→)'],
    ['+2с', '+2s', '+2s'],
    ['Без звука (M)', 'Mute (M)', 'Stumm (M)'],
    ['Без звука', 'Mute', 'Stumm'],
    ['Общая громкость', 'Master volume', 'Gesamtlautstärke'],
    ['Частота кадров: шаг покадровой перемотки', 'Frame rate: frame step', 'Bildrate: Einzelbildschritt'],
    ['Повтор (L)', 'Loop (L)', 'Wiederholen (L)'],
    ['Повтор', 'Loop', 'Wiederholen'],
    ['Картинка в картинке (P)', 'Picture in picture (P)', 'Bild-in-Bild (P)'],
    ['Картинка в картинке', 'Picture in picture', 'Bild-in-Bild'],
    ['Полный экран (F)', 'Fullscreen (F)', 'Vollbild (F)'],
    ['Полный экран', 'Fullscreen', 'Vollbild'],
    ['Открыть файл (O)', 'Open file (O)', 'Datei öffnen (O)'],
    ['Открыть', 'Open', 'Öffnen'],
    ['Звуковые дорожки (T)', 'Audio tracks (T)', 'Tonspuren (T)'],
    ['Звуковые дорожки', 'Audio tracks', 'Tonspuren'],
    ['Дорожки', 'Tracks', 'Spuren'],
    ['Настройки (S)', 'Settings (S)', 'Einstellungen (S)'],
    ['Изображения', 'Images', 'Bilder'],
    ['Уменьшить (−)', 'Zoom out (−)', 'Verkleinern (−)'],
    ['Уменьшить', 'Zoom out', 'Verkleinern'],
    ['Масштаб изображения', 'Image zoom', 'Bildzoom'],
    ['Увеличить (+)', 'Zoom in (+)', 'Vergrößern (+)'],
    ['Увеличить', 'Zoom in', 'Vergrößern'],
    ['Вписать в экран (0)', 'Fit to screen (0)', 'An Bildschirm anpassen (0)'],
    ['По размеру', 'Fit', 'Anpassen'],
    ['Реальный масштаб 1:1', 'Actual size 1:1', 'Originalgröße 1:1'],
    ['Предыдущее изображение (←)', 'Previous image (←)', 'Vorheriges Bild (←)'],
    ['Предыдущее изображение', 'Previous image', 'Vorheriges Bild'],
    ['Следующее изображение (→)', 'Next image (→)', 'Nächstes Bild (→)'],
    ['Следующее изображение', 'Next image', 'Nächstes Bild'],
    ['DePLay / панель', 'DePLay / panel', 'DePLay / Panel'],
    ['ожидание', 'idle', 'Bereit'],
    ['Открыть файл', 'Open file', 'Datei öffnen'],
    ['Закрыть настройки', 'Close settings', 'Einstellungen schließen'],
    ['Медиа', 'Media', 'Medien'],
    ['Текущий файл', 'Current file', 'Aktuelle Datei'],
    ['Пока пусто', 'Nothing yet', 'Noch leer'],
    ['Откройте видео или изображение, чтобы увидеть параметры файла и звуковые дорожки.', 'Open a video or image to see file details and audio tracks.', 'Öffnen Sie ein Video oder Bild, um Dateidetails und Tonspuren zu sehen.'],
    ['Разрешение', 'Resolution', 'Auflösung'],
    ['Длительность', 'Duration', 'Dauer'],
    ['Размер', 'Size', 'Größe'],
    ['Формат', 'Format', 'Format'],
    ['Звук', 'Audio', 'Ton'],
    ['Галерея', 'Gallery', 'Galerie'],
    ['0 файлов', '0 files', '0 Dateien'],
    ['Воспроизведение', 'Playback', 'Wiedergabe'],
    ['Параметры', 'Options', 'Optionen'],
    ['Язык интерфейса', 'Interface language', 'Oberflächensprache'],
    ['применяется сразу', 'applied immediately', 'sofort angewendet'],
    ['Режим изображения', 'Image mode', 'Bildmodus'],
    ['Колесо мыши — масштаб, двойной клик — быстрое приближение, перетаскивание — панорама, ', 'Mouse wheel — zoom, double-click — quick enlarge, drag — pan, ', 'Mausrad — Zoom, Doppelklick — schnell vergrößern, Ziehen — verschieben, '],
    [' — сброс.', ' — reset.', ' — zurücksetzen.'],
    ['Частота кадров', 'Frame rate', 'Bildrate'],
    ['шаг покадровой перемотки', 'frame step', 'Einzelbildschritt'],
    ['Авто', 'Auto', 'Auto'],
    ['Зациклить видео', 'Loop video', 'Video wiederholen'],
    ['повторять бесконечно', 'repeat endlessly', 'endlos wiederholen'],
    ['ссылки на трансляции', 'stream links', 'Stream-Links'],
    ['Качество потока', 'Stream quality', 'Stream-Qualität'],
    ['Лучшее', 'Best', 'Beste'],
    ['Худшее', 'Worst', 'Schlechteste'],
    ['Путь к Streamlink', 'Streamlink path', 'Streamlink-Pfad'],
    ['streamlink.exe — автоматически', 'streamlink.exe — automatic', 'streamlink.exe — automatisch'],
    ['Файлы остаются на устройстве. Ничего не загружается в сеть.', 'Files stay on your device. Nothing is uploaded.', 'Dateien bleiben auf dem Gerät. Nichts wird hochgeladen.'],
    ['Управление', 'Controls', 'Steuerung'],
    ['Горячие клавиши', 'Keyboard shortcuts', 'Tastenkürzel'],
    ['Все комбинации', 'All shortcuts', 'Alle Kombinationen'],
    ['Играть / пауза', 'Play / pause', 'Wiedergabe / Pause'],
    ['± 2 секунды', '± 2 seconds', '± 2 Sekunden'],
    ['Покадрово', 'Frame by frame', 'Einzelbild'],
    ['Громкость', 'Volume', 'Lautstärke'],
    ['Добавить звук', 'Add audio', 'Ton hinzufügen'],
    ['Зум / сброс', 'Zoom / reset', 'Zoom / zurücksetzen'],
    ['Закрыть панель', 'Close panel', 'Panel schließen'],
    ['DePLay / звук', 'DePLay / audio', 'DePLay / Audio'],
    ['Закрыть дорожки', 'Close tracks', 'Tonspuren schließen'],
    ['Аудио', 'Audio', 'Audio'],
    ['Добавить звуковые файлы (A)', 'Add audio files (A)', 'Audiodateien hinzufügen (A)'],
    ['Добавить звуковые файлы', 'Add audio files', 'Audiodateien hinzufügen'],
    ['Встроенные дорожки извлекаются из контейнера на этом устройстве. Можно включить несколько — они смешаются и будут синхронизированы с видео.', 'Embedded tracks are extracted from the container on this device. You can enable several — they will be mixed and synced with the video.', 'Eingebettete Spuren werden auf diesem Gerät aus dem Container extrahiert. Mehrere können aktiviert werden — sie werden gemischt und mit dem Video synchronisiert.'],
    ['Отпустите файлы', 'Drop files', 'Dateien ablegen'],
    ['видео, изображения или звуковые дорожки', 'video, images or audio tracks', 'Video, Bilder oder Tonspuren'],
    ['Включить все', 'Enable all', 'Alle aktivieren'],
    ['Выключить все', 'Disable all', 'Alle deaktivieren'],
    ['Включить все звуковые дорожки', 'Enable all audio tracks', 'Alle Tonspuren aktivieren'],
    ['Выключить все звуковые дорожки', 'Disable all audio tracks', 'Alle Tonspuren deaktivieren'],
  ];

  const reverse = new Map();
  STATIC.forEach((entry) => {
    entry.forEach((value) => {
      if (!value) return;
      if (!reverse.has(value)) reverse.set(value, entry);
      const trimmed = value.trim();
      if (trimmed && !reverse.has(trimmed)) reverse.set(trimmed, entry);
    });
  });

  function normalize(lang) {
    const value = String(lang || '').toLowerCase().slice(0, 2);
    return LANGS.includes(value) ? value : 'ru';
  }

  function interpolate(text, vars) {
    if (!vars) return text;
    return String(text).replace(/\{(\w+)\}/g, (match, name) => (
      Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match
    ));
  }

  function t(lang, key, vars) {
    const code = normalize(lang);
    const value = (MESSAGES[code] && MESSAGES[code][key]) || MESSAGES.ru[key] || key;
    return interpolate(value, vars);
  }

  function pickRu(n, forms) {
    const abs = Math.abs(n) % 100;
    const last = abs % 10;
    if (abs > 10 && abs < 20) return forms[2];
    if (last > 1 && last < 5) return forms[1];
    if (last === 1) return forms[0];
    return forms[2];
  }

  function pluralIndex(lang, n) {
    if (lang === 'ru') return pickRu(n, [0, 1, 2]);
    return n === 1 ? 0 : 1;
  }

  function unit(lang, name, n) {
    const code = normalize(lang);
    const forms = (UNITS[name] && (UNITS[name][code] || UNITS[name].ru)) || ['', ''];
    return forms[Math.min(pluralIndex(code, n), forms.length - 1)];
  }

  function plural(lang, key, n, vars) {
    const code = normalize(lang);
    const build = (PLURALS[key] && (PLURALS[key][code] || PLURALS[key].ru));
    if (!build) return String(n);
    return interpolate(build(n), vars);
  }

  function translateValue(value) {
    if (!value) return value;
    const trimmed = value.trim();
    const entry = reverse.get(trimmed);
    if (!entry) return value;
    const replacement = entry[LANGS.indexOf(currentLang)] || trimmed;
    const start = value.indexOf(trimmed);
    return value.slice(0, start) + replacement + value.slice(start + trimmed.length);
  }

  function translateDocument(root, lang) {
    currentLang = normalize(lang);
    if (!root) return;
    const owner = root.ownerDocument || root;
    const walker = owner.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentNode;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.nodeName;
        if (tag === 'SCRIPT' || tag === 'STYLE') return NodeFilter.FILTER_REJECT;
        return node.nodeValue && node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => { node.nodeValue = translateValue(node.nodeValue); });

    const elements = root.querySelectorAll ? root.querySelectorAll('*') : [];
    elements.forEach((element) => {
      ['title', 'aria-label', 'placeholder', 'aria-valuetext'].forEach((attribute) => {
        const value = element.getAttribute(attribute);
        if (!value || !value.trim()) return;
        const next = translateValue(value);
        if (next !== value) element.setAttribute(attribute, next);
      });
    });
  }

  let currentLang = 'ru';

  window.DePLayI18n = {
    languages: LANGS.slice(),
    normalize,
    t,
    unit,
    plural,
    translateDocument,
  };
})();
