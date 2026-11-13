using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;

namespace DePLay
{
    /// <summary>
    /// Thin wrapper around the Streamlink command line tool. Streamlink turns a
    /// page URL (Twitch, YouTube live, ...) into a playable stream URL without
    /// adding any buttons to the player itself.
    /// </summary>
    internal static class Streamlink
    {
        /// <summary>
        /// Shown before the real list arrives (and used when --json fails).
        /// The player replaces it with the streams reported for the current URL.
        /// </summary>
        public static readonly string[] DefaultQualities =
        {
            "best", "1080p", "720p", "480p", "360p", "worst"
        };

        private static readonly Regex Ansi = new Regex(
            "\u001B\\[[0-9;?]*[ -/]*[@-~]", RegexOptions.Compiled);

        private static readonly string[] MediaExtensions =
        {
            ".mp4", ".m4v", ".mov", ".webm", ".ogv", ".mkv", ".avi",
            ".mp3", ".m4a", ".aac", ".flac", ".ogg", ".oga", ".opus", ".wav",
            ".m3u8", ".m3u"
        };

        public static bool IsHttpUrl(string value)
        {
            if (string.IsNullOrEmpty(value)) return false;
            return value.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
                   value.StartsWith("https://", StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>
        /// Streamlink stream names are not limited to a fixed list: a Twitch VOD
        /// can offer "720p60", "audio_only" or "chunked", while another stream
        /// only has "source". Accept any short token and let Streamlink decide.
        /// </summary>
        public static bool IsQualityName(string value)
        {
            if (string.IsNullOrEmpty(value)) return false;
            string quality = value.Trim();
            if (quality.Length == 0 || quality.Length > 32) return false;
            for (int i = 0; i < quality.Length; i++)
            {
                char c = quality[i];
                bool allowed = (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
                               (c >= '0' && c <= '9') || c == '_' || c == '-' || c == '+' || c == '.';
                if (!allowed) return false;
            }
            return true;
        }

        public static bool ContainsQuality(string[] qualities, string quality)
        {
            if (qualities == null || string.IsNullOrEmpty(quality)) return false;
            for (int i = 0; i < qualities.Length; i++)
            {
                if (string.Equals(qualities[i], quality, StringComparison.OrdinalIgnoreCase)) return true;
            }
            return false;
        }

        /// <summary>
        /// Turns user input such as "www.twitch.tv/channel" or
        /// "twitch.tv/channel" into a fully qualified HTTPS URL. Already valid
        /// URLs and local file paths are returned unchanged. This is what makes
        /// a dragged or pasted stream address usable even when the scheme is
        /// missing, which is a very common source of "URL not recognised".
        /// </summary>
        public static string NormalizeUrl(string value)
        {
            if (string.IsNullOrEmpty(value)) return value;
            string trimmed = value.Trim().Trim('"');
            if (trimmed.Length == 0) return value;
            if (IsHttpUrl(trimmed) || IsFileUrl(trimmed)) return trimmed;
            if (LooksLikeWebAddress(trimmed)) return "https://" + trimmed;
            return value;
        }

        private static bool LooksLikeWebAddress(string value)
        {
            // Exclude Windows paths (C:\..., \\server\share) and anything with
            // whitespace, then require a dot before the first slash.
            if (value.IndexOf(' ') >= 0 || value.IndexOf('\t') >= 0) return false;
            if (value.IndexOf('\\') >= 0) return false;
            if (value.Length >= 2 && value[1] == ':') return false;
            int slash = value.IndexOf('/');
            string host = slash < 0 ? value : value.Substring(0, slash);
            if (host.Length == 0) return false;
            int dot = host.IndexOf('.');
            if (dot <= 0 || dot == host.Length - 1) return false;
            // A colon before the dot would mean a scheme or port without a dot
            // in the host (e.g. "localhost:8080"); only accept real domains.
            int colon = host.IndexOf(':');
            if (colon >= 0 && colon < dot) return false;
            return true;
        }

        public static bool IsFileUrl(string value)
        {
            return !string.IsNullOrEmpty(value) &&
                   value.StartsWith("file://", StringComparison.OrdinalIgnoreCase);
        }

        public static bool IsDirectMediaUrl(string value)
        {
            string path = UrlPath(value);
            for (int i = 0; i < MediaExtensions.Length; i++)
            {
                if (path.EndsWith(MediaExtensions[i], StringComparison.OrdinalIgnoreCase)) return true;
            }
            return false;
        }

        public static bool IsPlaylistUrl(string value)
        {
            string path = UrlPath(value);
            return path.EndsWith(".m3u8", StringComparison.OrdinalIgnoreCase) ||
                   path.EndsWith(".m3u", StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>
        /// Heuristic for page URLs: known VOD/clip/category pages are not live,
        /// while a channel page (or an unknown site) is treated as a live stream.
        /// The web player can still promote a direct HLS URL to live mode when
        /// hls.js reports a live playlist, so this only decides the initial UI.
        /// </summary>
        public static bool IsLivePageUrl(string value)
        {
            if (!IsHttpUrl(value)) return false;
            Uri uri;
            if (!Uri.TryCreate(value, UriKind.Absolute, out uri)) return true;
            string host = uri.Host.ToLowerInvariant();
            string path = (uri.AbsolutePath ?? string.Empty).ToLowerInvariant();
            string[] parts = path.Trim('/').Split(new char[] { '/' }, StringSplitOptions.RemoveEmptyEntries);

            if (host == "youtu.be" || host.EndsWith(".youtube.com") || host == "youtube.com")
            {
                if (path.StartsWith("/live/") || path.EndsWith("/live")) return true;
                return false;
            }
            if (host.EndsWith("twitch.tv"))
            {
                if (path.StartsWith("/videos/") || path.StartsWith("/clip/") ||
                    path.StartsWith("/directory") || path.StartsWith("/search") ||
                    path.StartsWith("/settings") || path.StartsWith("/subscriptions"))
                    return false;
                return parts.Length == 1;
            }
            if (host.EndsWith("kick.com"))
            {
                if (path.StartsWith("/video/") || path.StartsWith("/clips/") ||
                    path.StartsWith("/category/") || path.StartsWith("/browse"))
                    return false;
                return parts.Length == 1;
            }
            if (host.EndsWith("vimeo.com") || host.EndsWith("dailymotion.com"))
            {
                return false;
            }
            return true;
        }

        public static string NameFromUrl(string value)
        {
            try
            {
                Uri uri = new Uri(value, UriKind.Absolute);
                string path = uri.AbsolutePath;
                int slash = path.LastIndexOf('/');
                string name = slash >= 0 ? path.Substring(slash + 1) : path;
                name = Uri.UnescapeDataString(name).Trim();
                if (name.Length > 0) return name;
                return uri.Host;
            }
            catch
            {
                return "stream";
            }
        }

        private static string UrlPath(string value)
        {
            if (string.IsNullOrEmpty(value)) return string.Empty;
            try
            {
                Uri uri = new Uri(value, UriKind.Absolute);
                return uri.AbsolutePath ?? string.Empty;
            }
            catch
            {
                int cut = value.IndexOfAny(new char[] { '?', '#' });
                return cut < 0 ? value : value.Substring(0, cut);
            }
        }

        public static string Detect(string configured)
        {
            string explicitPath = ResolveExplicit(configured);
            if (explicitPath != null) return explicitPath;

            // Portable/embedded build: Streamlink ships next to DePLay.exe.
            // This is checked first so a moved installation keeps working and
            // never depends on a system-wide install or a stale absolute path.
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string[] embedded =
            {
                Path.Combine(baseDir, "streamlink", "bin", "streamlink.exe"),
                Path.Combine(baseDir, "streamlink", "streamlink.exe"),
                Path.Combine(baseDir, "streamlink.exe"),
                Path.Combine(baseDir, "bin", "streamlink.exe"),
                Path.Combine(baseDir, "vendor", "streamlink", "bin", "streamlink.exe"),
                Path.Combine(baseDir, "vendor", "streamlink", "streamlink.exe"),
                Path.Combine(baseDir, "third_party", "streamlink", "bin", "streamlink.exe"),
                Path.Combine(baseDir, "third_party", "streamlink", "streamlink.exe")
            };
            for (int i = 0; i < embedded.Length; i++)
            {
                if (IsFile(embedded[i])) return Path.GetFullPath(embedded[i]);
            }

            // Tests (and strict portable setups) can hide system-wide installs
            // so the embedded copy is the only candidate.
            string ignore = Environment.GetEnvironmentVariable("DEPLAY_STREAMLINK_IGNORE_SYSTEM");
            if (ignore == "1" || string.Equals(ignore, "true", StringComparison.OrdinalIgnoreCase))
                return null;

            string[] candidates =
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Streamlink", "bin", "streamlink.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Streamlink", "bin", "streamlink.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Streamlink", "bin", "streamlink.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Streamlink", "bin", "streamlink.exe")
            };
            for (int i = 0; i < candidates.Length; i++)
            {
                if (IsFile(candidates[i])) return candidates[i];
            }
            return FindOnPath("streamlink.exe");
        }

        private static string ResolveExplicit(string configured)
        {
            if (string.IsNullOrEmpty(configured)) return null;
            string value = configured.Trim().Trim('"');
            if (value.Length == 0) return null;
            try { value = Environment.ExpandEnvironmentVariables(value); }
            catch { /* keep the raw value */ }

            if (IsFile(value)) return Path.GetFullPath(value);
            if (Directory.Exists(value))
            {
                string inside = Path.Combine(value, "streamlink.exe");
                if (IsFile(inside)) return Path.GetFullPath(inside);
                inside = Path.Combine(value, "bin", "streamlink.exe");
                if (IsFile(inside)) return Path.GetFullPath(inside);
            }
            if (value.IndexOf(Path.DirectorySeparatorChar) < 0 && value.IndexOf(Path.AltDirectorySeparatorChar) < 0)
                return FindOnPath(value);
            return null;
        }

        private static bool IsFile(string path)
        {
            try { return !string.IsNullOrEmpty(path) && File.Exists(path); }
            catch { return false; }
        }

        private static string FindOnPath(string name)
        {
            string pathVariable = Environment.GetEnvironmentVariable("PATH");
            if (string.IsNullOrEmpty(pathVariable)) return null;
            string[] parts = pathVariable.Split(Path.PathSeparator);
            for (int i = 0; i < parts.Length; i++)
            {
                string folder = parts[i].Trim().Trim('"');
                if (folder.Length == 0) continue;
                try
                {
                    string candidate = Path.Combine(folder, name);
                    if (File.Exists(candidate)) return Path.GetFullPath(candidate);
                }
                catch { /* skip malformed PATH entries */ }
            }
            return null;
        }

        public static bool Resolve(
            string executable,
            string pageUrl,
            string quality,
            int timeoutMs,
            out string streamUrl,
            out string error)
        {
            streamUrl = null;
            error = null;
            pageUrl = NormalizeUrl(pageUrl);
            if (string.IsNullOrEmpty(executable) || !File.Exists(executable))
            {
                error = NativeStrings.Get("streamlink.notFound");
                return false;
            }
            if (!IsHttpUrl(pageUrl))
            {
                error = NativeStrings.Get("streamlink.failed").Replace("{details}", pageUrl ?? string.Empty);
                return false;
            }
            if (string.IsNullOrEmpty(quality)) quality = "best";
            else quality = quality.Trim().Trim('"');
            if (quality.Length == 0 || !IsQualityName(quality)) quality = "best";

            RunResult result = Run(executable, "--stream-url " + Quote(pageUrl) + " " + Quote(quality), timeoutMs);
            if (result.TimedOut)
            {
                error = NativeStrings.Get("streamlink.timeout");
                return false;
            }
            string found = FirstUrl(result.Output);
            // Some Streamlink builds print the resolved URL on stderr
            // (for example when a plugin emits warnings first), so check it
            // as a fallback instead of failing with "no URL".
            if (found == null) found = FirstUrl(result.Error);
            if (found == null)
            {
                error = FailureDetails(result);
                return false;
            }
            streamUrl = found;
            return true;
        }

        /// <summary>
        /// Asks Streamlink for the real stream list of a page/VOD. The returned
        /// names are used to fill the quality selector, so plugins that expose
        /// "720p60", "audio_only" or "chunked" work instead of failing on a
        /// hard-coded "720p" request.
        /// </summary>
        public static bool ListStreams(
            string executable,
            string pageUrl,
            int timeoutMs,
            out string[] qualities,
            out string error)
        {
            qualities = new string[0];
            error = null;
            pageUrl = NormalizeUrl(pageUrl);
            if (string.IsNullOrEmpty(executable) || !File.Exists(executable))
            {
                error = NativeStrings.Get("streamlink.notFound");
                return false;
            }
            if (!IsHttpUrl(pageUrl))
            {
                error = NativeStrings.Format("streamlink.failed", "details", pageUrl ?? string.Empty);
                return false;
            }

            RunResult result = Run(executable, "--json " + Quote(pageUrl), timeoutMs);
            if (result.TimedOut)
            {
                error = NativeStrings.Get("streamlink.timeout");
                return false;
            }
            List<string> keys = ParseStreamKeys(result.Output);
            if (keys.Count == 0) keys = ParseStreamKeys(result.Error);
            if (keys.Count == 0)
            {
                error = FailureDetails(result);
                return false;
            }
            qualities = SortQualities(keys).ToArray();
            return true;
        }

        private sealed class RunResult
        {
            public bool TimedOut;
            public int ExitCode;
            public string Output = string.Empty;
            public string Error = string.Empty;
        }

        private static RunResult Run(string executable, string arguments, int timeoutMs)
        {
            RunResult result = new RunResult();
            Process process = null;
            try
            {
                ProcessStartInfo info = new ProcessStartInfo();
                info.FileName = executable;
                info.Arguments = arguments;
                info.WorkingDirectory = Path.GetDirectoryName(executable);
                info.UseShellExecute = false;
                info.CreateNoWindow = true;
                info.RedirectStandardOutput = true;
                info.RedirectStandardError = true;
                // Streamlink writes UTF-8; without this a Russian Windows code
                // page turns plugin errors into unreadable text.
                try
                {
                    UTF8Encoding utf8 = new UTF8Encoding(false);
                    info.StandardOutputEncoding = utf8;
                    info.StandardErrorEncoding = utf8;
                }
                catch { /* .NET 4.0: keep the platform default */ }

                Log.Write("streamlink: " + executable + " " + arguments);

                StringBuilder output = new StringBuilder();
                StringBuilder errors = new StringBuilder();
                object sync = new object();

                process = new Process();
                process.StartInfo = info;
                process.OutputDataReceived += delegate(object sender, DataReceivedEventArgs e)
                {
                    if (e.Data == null) return;
                    lock (sync) { if (output.Length < 262144) output.AppendLine(e.Data); }
                };
                process.ErrorDataReceived += delegate(object sender, DataReceivedEventArgs e)
                {
                    if (e.Data == null) return;
                    lock (sync) { if (errors.Length < 262144) errors.AppendLine(e.Data); }
                };

                process.Start();
                process.BeginOutputReadLine();
                process.BeginErrorReadLine();

                bool exited = process.WaitForExit(timeoutMs);
                if (!exited)
                {
                    try { process.Kill(); }
                    catch { /* already gone */ }
                    try { process.WaitForExit(2000); }
                    catch { /* ignore */ }
                    result.TimedOut = true;
                    Log.Write("streamlink: timeout");
                    return result;
                }
                process.WaitForExit();

                lock (sync)
                {
                    result.Output = output.ToString();
                    result.Error = errors.ToString();
                }
                result.ExitCode = process.ExitCode;
                Log.Write("streamlink exit code: " + result.ExitCode);
                return result;
            }
            catch (Exception exception)
            {
                Log.Error("streamlink", exception);
                result.ExitCode = -1;
                result.Error = exception.Message;
                return result;
            }
            finally
            {
                if (process != null)
                {
                    try { process.Dispose(); }
                    catch { /* ignore */ }
                }
            }
        }

        private static string FailureDetails(RunResult result)
        {
            string details = LastLines(result.Error, 3);
            if (details.Length == 0) details = LastLines(result.Output, 3);
            if (details.Length == 0) details = NativeStrings.Get("streamlink.noUrl");
            string code = NativeStrings.Format("streamlink.exitCode", "code", result.ExitCode.ToString(CultureInfo.InvariantCulture));
            return details + " · " + code;
        }

        private static List<string> SortQualities(List<string> keys)
        {
            List<string> unique = new List<string>();
            for (int i = 0; i < keys.Count; i++)
            {
                string key = (keys[i] ?? string.Empty).Trim();
                if (!IsQualityName(key)) continue;
                if (!ContainsQuality(unique.ToArray(), key)) unique.Add(key);
            }
            unique.Sort(delegate(string a, string b)
            {
                int rankA = QualityRank(a);
                int rankB = QualityRank(b);
                if (rankA != rankB) return rankA.CompareTo(rankB);
                return string.Compare(a, b, StringComparison.OrdinalIgnoreCase);
            });
            if (!ContainsQuality(unique.ToArray(), "best")) unique.Insert(0, "best");
            return unique;
        }

        private static int QualityRank(string quality)
        {
            if (string.Equals(quality, "best", StringComparison.OrdinalIgnoreCase)) return -100000;
            if (string.Equals(quality, "worst", StringComparison.OrdinalIgnoreCase)) return 100000;
            int digits = 0;
            while (digits < quality.Length && quality[digits] >= '0' && quality[digits] <= '9') digits++;
            if (digits > 0)
            {
                int height;
                if (int.TryParse(quality.Substring(0, digits), NumberStyles.Integer, CultureInfo.InvariantCulture, out height))
                    return -height;
            }
            if (quality.IndexOf("audio", StringComparison.OrdinalIgnoreCase) >= 0) return 90000;
            return 50000;
        }

        private static string Quote(string value)
        {
            if (value == null) return "\"\"";
            return "\"" + value.Replace("\"", "\\\"") + "\"";
        }

        // ── Minimal JSON reader for `streamlink --json` ──────────
        // Only the top-level "streams" object keys are needed, but parsing the
        // whole document avoids being confused by nested objects, escaped
        // quotes and unicode escapes in plugin metadata.
        private static List<string> ParseStreamKeys(string json)
        {
            List<string> keys = new List<string>();
            if (string.IsNullOrEmpty(json)) return keys;
            int index = json.IndexOf('{');
            if (index < 0) return keys;
            try
            {
                Dictionary<string, object> root = ParseJsonValue(json, ref index) as Dictionary<string, object>;
                if (root == null) return keys;
                object streamsValue;
                if (!root.TryGetValue("streams", out streamsValue)) return keys;
                Dictionary<string, object> streams = streamsValue as Dictionary<string, object>;
                if (streams == null) return keys;
                foreach (KeyValuePair<string, object> pair in streams) keys.Add(pair.Key);
            }
            catch { /* malformed output: the caller reports a normal error */ }
            return keys;
        }

        private static object ParseJsonValue(string text, ref int index)
        {
            SkipWhitespace(text, ref index);
            if (index >= text.Length) return null;
            char c = text[index];
            if (c == '{') return ParseJsonObject(text, ref index);
            if (c == '[') return ParseJsonArray(text, ref index);
            if (c == '"') return ParseJsonString(text, ref index);
            if (c == 't' && index + 3 < text.Length && text.Substring(index, 4) == "true")
            {
                index += 4;
                return true;
            }
            if (c == 'f' && index + 4 < text.Length && text.Substring(index, 5) == "false")
            {
                index += 5;
                return false;
            }
            if (c == 'n' && index + 3 < text.Length && text.Substring(index, 4) == "null")
            {
                index += 4;
                return null;
            }
            int start = index;
            while (index < text.Length && "+-0123456789.eE".IndexOf(text[index]) >= 0) index++;
            if (index == start) index++;
            string number = text.Substring(start, index - start);
            double parsed;
            if (double.TryParse(number, NumberStyles.Float, CultureInfo.InvariantCulture, out parsed)) return parsed;
            return null;
        }

        private static Dictionary<string, object> ParseJsonObject(string text, ref int index)
        {
            Dictionary<string, object> map = new Dictionary<string, object>();
            index += 1;
            while (index < text.Length)
            {
                SkipWhitespace(text, ref index);
                if (index >= text.Length) break;
                char c = text[index];
                if (c == '}') { index += 1; break; }
                if (c == ',') { index += 1; continue; }
                if (c != '"') { index += 1; continue; }
                string key = ParseJsonString(text, ref index);
                SkipWhitespace(text, ref index);
                if (index >= text.Length || text[index] != ':') continue;
                index += 1;
                object value = ParseJsonValue(text, ref index);
                if (key != null) map[key] = value;
            }
            return map;
        }

        private static List<object> ParseJsonArray(string text, ref int index)
        {
            List<object> list = new List<object>();
            index += 1;
            while (index < text.Length)
            {
                SkipWhitespace(text, ref index);
                if (index >= text.Length) break;
                char c = text[index];
                if (c == ']') { index += 1; break; }
                if (c == ',') { index += 1; continue; }
                list.Add(ParseJsonValue(text, ref index));
            }
            return list;
        }

        private static string ParseJsonString(string text, ref int index)
        {
            if (index >= text.Length || text[index] != '"') return null;
            index += 1;
            StringBuilder value = new StringBuilder();
            while (index < text.Length)
            {
                char c = text[index];
                index += 1;
                if (c == '"') return value.ToString();
                if (c != '\\')
                {
                    value.Append(c);
                    continue;
                }
                if (index >= text.Length) break;
                char escape = text[index];
                index += 1;
                switch (escape)
                {
                    case 'n': value.Append('\n'); break;
                    case 'r': value.Append('\r'); break;
                    case 't': value.Append('\t'); break;
                    case 'b': value.Append('\b'); break;
                    case 'f': value.Append('\f'); break;
                    case 'u':
                        if (index + 4 <= text.Length)
                        {
                            int code;
                            if (int.TryParse(text.Substring(index, 4), NumberStyles.HexNumber, CultureInfo.InvariantCulture, out code))
                                value.Append((char)code);
                            index += 4;
                        }
                        break;
                    default: value.Append(escape); break;
                }
            }
            return value.ToString();
        }

        private static void SkipWhitespace(string text, ref int index)
        {
            while (index < text.Length && char.IsWhiteSpace(text[index])) index += 1;
        }

        private static string CleanLine(string value)
        {
            string line = Ansi.Replace(value ?? string.Empty, string.Empty);
            line = line.Trim().Trim('\uFEFF');
            if (line.Length >= 2 && line[0] == '"' && line[line.Length - 1] == '"')
                line = line.Substring(1, line.Length - 2).Trim();
            return line;
        }

        private static string FirstUrl(string text)
        {
            if (string.IsNullOrEmpty(text)) return null;
            string[] lines = text.Split(new string[] { "\r\n", "\n" }, StringSplitOptions.RemoveEmptyEntries);
            for (int i = 0; i < lines.Length; i++)
            {
                string line = CleanLine(lines[i]);
                if (IsHttpUrl(line)) return line;
            }
            return null;
        }

        private static string LastLines(string text, int count)
        {
            if (string.IsNullOrEmpty(text)) return string.Empty;
            string[] lines = text.Split(new string[] { "\r\n", "\n" }, StringSplitOptions.RemoveEmptyEntries);
            List<string> kept = new List<string>();
            for (int i = lines.Length - 1; i >= 0 && kept.Count < count; i--)
            {
                string line = CleanLine(lines[i]);
                if (line.Length == 0) continue;
                if (line.StartsWith("[cli][info]", StringComparison.OrdinalIgnoreCase)) continue;
                kept.Insert(0, line);
            }
            return string.Join(" | ", kept.ToArray());
        }
    }
}

