using System;
using System.Collections.Generic;

namespace DePLay
{
    /// <summary>
    /// Localized strings for the native (WinForms) shell. The web UI has its own
    /// catalog in i18n.js; this class covers dialogs shown before or outside it.
    /// </summary>
    internal static class NativeStrings
    {
        private static string language = "ru";

        public static string Language
        {
            get { return language; }
            set
            {
                string code = LanguageStore.Normalize(value);
                language = code == null ? "ru" : code;
            }
        }

        private static readonly Dictionary<string, string[]> Messages = Build();

        private static Dictionary<string, string[]> Build()
        {
            Dictionary<string, string[]> map = new Dictionary<string, string[]>(StringComparer.Ordinal);
            Add(map, "app.title",
                "DePLay",
                "DePLay",
                "DePLay");
            Add(map, "fatal.unknown",
                "Неизвестная ошибка.",
                "Unknown error.",
                "Unbekannter Fehler.");
            Add(map, "fatal.message",
                "Не удалось запустить DePLay.\n\n{details}\n\nПодробности записаны в журнал:\n{log}",
                "DePLay could not start.\n\n{details}\n\nDetails were written to the log:\n{log}",
                "DePLay konnte nicht gestartet werden.\n\n{details}\n\nEinzelheiten wurden ins Protokoll geschrieben:\n{log}");
            Add(map, "single.busy",
                "DePLay уже запущен, но передать ему файл не удалось.\nЗакройте работающее окно DePLay и попробуйте снова.",
                "DePLay is already running, but the file could not be passed to it.\nClose the running DePLay window and try again.",
                "DePLay läuft bereits, aber die Datei konnte nicht übergeben werden.\nSchließen Sie das laufende DePLay-Fenster und versuchen Sie es erneut.");
            Add(map, "webview.failed",
                "Не удалось запустить компонент WebView2.\n\nDePLay использует Microsoft Edge WebView2 Runtime. Установите его и запустите приложение снова.\n\nТехническая информация: {details}",
                "The WebView2 component could not start.\n\nDePLay uses Microsoft Edge WebView2 Runtime. Install it and start the application again.\n\nTechnical information: {details}",
                "Die WebView2-Komponente konnte nicht gestartet werden.\n\nDePLay verwendet Microsoft Edge WebView2 Runtime. Installieren Sie sie und starten Sie die Anwendung erneut.\n\nTechnische Information: {details}");
            Add(map, "webview.prompt",
                "Открыть страницу загрузки WebView2 Runtime?",
                "Open the WebView2 Runtime download page?",
                "Die Downloadseite für WebView2 Runtime öffnen?");
            Add(map, "file.notFound",
                "Не удалось открыть файл:\n{path}\n\nФайл не найден или недоступен.",
                "The file could not be opened:\n{path}\n\nIt was not found or is not accessible.",
                "Die Datei konnte nicht geöffnet werden:\n{path}\n\nSie wurde nicht gefunden oder ist nicht zugänglich.");
            Add(map, "settings.saveFailed",
                "Не удалось сохранить настройки. Подробности в журнале:\n{log}",
                "Settings could not be saved. Details are in the log:\n{log}",
                "Die Einstellungen konnten nicht gespeichert werden. Einzelheiten im Protokoll:\n{log}");
            Add(map, "streamlink.notFound",
                "Streamlink не найден. Положите streamlink.exe рядом с DePLay.exe.",
                "Streamlink was not found. Place streamlink.exe next to DePLay.exe.",
                "Streamlink wurde nicht gefunden. Legen Sie streamlink.exe neben DePLay.exe ab.");
            Add(map, "streamlink.resolving",
                "Streamlink ищет поток…",
                "Streamlink is resolving the stream…",
                "Streamlink sucht den Stream…");
            Add(map, "streamlink.failed",
                "Не удалось получить поток: {details}",
                "Could not resolve the stream: {details}",
                "Der Stream konnte nicht aufgelöst werden: {details}");
            Add(map, "streamlink.timeout",
                "Streamlink не ответил вовремя.",
                "Streamlink did not respond in time.",
                "Streamlink hat nicht rechtzeitig geantwortet.");
            Add(map, "streamlink.noUrl",
                "Streamlink не вернул ссылку на поток.",
                "Streamlink did not return a stream URL.",
                "Streamlink hat keine Stream-URL zurückgegeben.");
            Add(map, "streamlink.exitCode",
                "код возврата {code}",
                "exit code {code}",
                "Exit-Code {code}");
            Add(map, "streamlink.switching",
                "Переключаем качество…",
                "Switching quality…",
                "Qualität wird umgeschaltet…");
            Add(map, "streamlink.qualityDirect",
                "Для прямой ссылки качество задаётся источником.",
                "A direct link gets its quality from the source.",
                "Bei einem direkten Link gibt die Quelle die Qualität vor.");
            Add(map, "streamlink.qualityLocal",
                "Качество сохранено для следующих запусков.",
                "The quality is saved for the next launches.",
                "Die Qualität wird für die nächsten Starts gespeichert.");
            return map;
        }

        private static void Add(Dictionary<string, string[]> map, string key, string ru, string en, string de)
        {
            map[key] = new string[] { ru, en, de };
        }

        public static string Get(string key)
        {
            string[] values;
            if (!Messages.TryGetValue(key, out values)) return key;
            int index = 0;
            if (language == "en") index = 1;
            else if (language == "de") index = 2;
            return values[index];
        }

        public static string Format(string key, params string[] pairs)
        {
            string text = Get(key);
            for (int i = 0; i + 1 < pairs.Length; i += 2)
            {
                text = text.Replace("{" + pairs[i] + "}", pairs[i + 1] ?? string.Empty);
            }
            return text;
        }
    }
}
