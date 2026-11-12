using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;

namespace DePLay
{
    /// <summary>
    /// Thin wrapper around the Streamlink command line tool. Streamlink turns a
    /// page URL (Twitch, YouTube live, ...) into a playable stream URL without
    /// adding any buttons to the player itself.
    /// </summary>
    internal static class Streamlink
    {
        public static readonly string[] Qualities =
        {
            "best", "1080p", "720p", "480p", "360p", "worst"
        };

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
            if (quality.Length == 0) quality = "best";

            Process process = null;
            try
            {
                ProcessStartInfo info = new ProcessStartInfo();
                info.FileName = executable;
                info.Arguments = "--stream-url " + Quote(pageUrl) + " " + Quote(quality);
                info.WorkingDirectory = Path.GetDirectoryName(executable);
                info.UseShellExecute = false;
                info.CreateNoWindow = true;
                info.RedirectStandardOutput = true;
                info.RedirectStandardError = true;

                StringBuilder output = new StringBuilder();
                StringBuilder errors = new StringBuilder();
                object sync = new object();

                process = new Process();
                process.StartInfo = info;
                process.OutputDataReceived += delegate(object sender, DataReceivedEventArgs e)
                {
                    if (e.Data == null) return;
                    lock (sync) { if (output.Length < 65536) output.AppendLine(e.Data); }
                };
                process.ErrorDataReceived += delegate(object sender, DataReceivedEventArgs e)
                {
                    if (e.Data == null) return;
                    lock (sync) { if (errors.Length < 65536) errors.AppendLine(e.Data); }
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
                    error = NativeStrings.Get("streamlink.timeout");
                    return false;
                }
                process.WaitForExit();

                string text;
                string errorText;
                lock (sync) { text = output.ToString(); errorText = errors.ToString(); }
                string found = FirstUrl(text);
                // Some Streamlink builds print the resolved URL on stderr
                // (for example when a plugin emits warnings first), so check it
                // as a fallback instead of failing with "no URL".
                if (found == null) found = FirstUrl(errorText);
                if (found == null)
                {
                    string details = LastLines(errorText, 3);
                    if (details.Length == 0) details = NativeStrings.Get("streamlink.noUrl");
                    error = NativeStrings.Format("streamlink.failed", "details", details);
                    return false;
                }
                streamUrl = found;
                return true;
            }
            catch (Exception exception)
            {
                Log.Error("streamlink", exception);
                error = NativeStrings.Format("streamlink.failed", "details", exception.Message);
                return false;
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

        private static string Quote(string value)
        {
            if (value == null) return "\"\"";
            return "\"" + value.Replace("\"", "\\\"") + "\"";
        }

        private static string FirstUrl(string text)
        {
            if (string.IsNullOrEmpty(text)) return null;
            string[] lines = text.Split(new string[] { "\r\n", "\n" }, StringSplitOptions.RemoveEmptyEntries);
            for (int i = 0; i < lines.Length; i++)
            {
                string line = lines[i].Trim();
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
                string line = lines[i].Trim();
                if (line.Length == 0) continue;
                if (line.StartsWith("[cli][info]", StringComparison.OrdinalIgnoreCase)) continue;
                kept.Insert(0, line);
            }
            return string.Join(" | ", kept.ToArray());
        }
    }
}
