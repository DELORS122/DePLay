using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using Microsoft.Win32;

namespace DePLay
{
    /// <summary>
    /// Headless health checks used by build.ps1 / tests/smoke-payload.ps1.
    /// Runs without creating the main window, so it is safe on build agents.
    /// </summary>
    internal static class SelfTest
    {
        private const int AttachParentProcess = -1;

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool AttachConsole(int processId);

        public static bool WantsSelftest(string[] args)
        {
            return HasFlag(args, "--selftest") || HasFlag(args, "/selftest");
        }

        public static bool WantsVersion(string[] args)
        {
            return HasFlag(args, "--version") || HasFlag(args, "/version");
        }

        public static bool WantsStreamResolve(string[] args)
        {
            return HasFlag(args, "--resolve-stream") || HasFlag(args, "/resolve-stream");
        }

        /// <summary>
        /// CLI hook used by tests/streamlink.test.ps1: resolves a page URL with
        /// the embedded/system Streamlink and prints the direct stream URL.
        /// </summary>
        public static int RunStreamResolve(string[] args)
        {
            OpenConsole();
            string pageUrl = null;
            string quality = "best";
            for (int i = 0; i < args.Length; i++)
            {
                string value = args[i];
                if (value == null) continue;
                string lower = value.Trim().ToLowerInvariant();
                if (lower == "--resolve-stream" || lower == "/resolve-stream")
                {
                    if (i + 1 < args.Length) pageUrl = args[i + 1];
                    continue;
                }
                if (lower == "--quality" || lower == "/quality")
                {
                    if (i + 1 < args.Length) quality = args[i + 1];
                }
            }
            if (string.IsNullOrEmpty(pageUrl))
            {
                WriteLine("error: --resolve-stream requires a URL");
                return 2;
            }

            string executable = Streamlink.Detect(null);
            WriteLine("streamlink: " + (executable ?? "(not found)"));
            if (executable == null)
            {
                WriteLine("RESULT: FAIL");
                return 1;
            }

            string streamUrl;
            string error;
            if (!Streamlink.Resolve(executable, pageUrl, quality, 45000, out streamUrl, out error))
            {
                WriteLine("error: " + error);
                WriteLine("RESULT: FAIL");
                return 1;
            }
            WriteLine("url: " + streamUrl);
            WriteLine("RESULT: PASS");
            return 0;
        }

        private static bool HasFlag(string[] args, string flag)
        {
            if (args == null) return false;
            for (int i = 0; i < args.Length; i++)
            {
                if (args[i] != null && string.Equals(args[i].Trim(), flag, StringComparison.OrdinalIgnoreCase))
                    return true;
            }
            return false;
        }

        public static void PrintVersion()
        {
            OpenConsole();
            Version version = Assembly.GetExecutingAssembly().GetName().Version;
            WriteLine("DePLay " + (version == null ? "unknown" : version.ToString(3)));
        }

        public static int Run()
        {
            OpenConsole();
            List<string> errors = new List<string>();

            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string webRoot = Path.Combine(baseDir, "web");
            Version version = Assembly.GetExecutingAssembly().GetName().Version;
            WriteLine("DePLay self-test " + (version == null ? "unknown" : version.ToString(3)));
            WriteLine("directory: " + baseDir);

            CheckFile(Path.Combine(baseDir, "DePLay.exe"), errors);
            CheckFile(Path.Combine(baseDir, "Microsoft.Web.WebView2.Core.dll"), errors);
            CheckFile(Path.Combine(baseDir, "Microsoft.Web.WebView2.WinForms.dll"), errors);
            CheckFile(Path.Combine(baseDir, "WebView2Loader.dll"), errors);
            CheckDirectory(webRoot, errors);
            CheckFile(Path.Combine(webRoot, "index.html"), errors);
            CheckFile(Path.Combine(webRoot, "styles.css"), errors);
            CheckFile(Path.Combine(webRoot, "i18n.js"), errors);
            CheckFile(Path.Combine(webRoot, "app", "media.js"), errors);
            CheckFile(Path.Combine(webRoot, "vendor", "mp4box.all.min.js"), errors);
            CheckFile(Path.Combine(webRoot, "vendor", "hls.light.min.js"), errors);

            string entryScript = null;
            string[] entryCandidates = { "app.js", Path.Combine("app", "main.js") };
            for (int i = 0; i < entryCandidates.Length; i++)
            {
                string candidate = Path.Combine(webRoot, entryCandidates[i]);
                if (File.Exists(candidate))
                {
                    entryScript = entryCandidates[i];
                    break;
                }
            }
            if (entryScript == null)
                errors.Add("missing application script: web/app.js or web/app/main.js");
            else
                WriteLine("entry script: " + entryScript.Replace('\\', '/'));

            CheckSettings(errors);
            CheckStreamlink(errors);

            string webViewVersion = WebView2Version();
            if (string.IsNullOrEmpty(webViewVersion))
                WriteLine("warning: Microsoft Edge WebView2 Runtime not detected; the player will not start on this machine");
            else
                WriteLine("WebView2 Runtime: " + webViewVersion);

            if (errors.Count == 0)
            {
                try
                {
                    using (LocalHttpServer server = new LocalHttpServer(webRoot))
                    {
                        HttpResult index = Get(server.BaseUrl + "index.html", null);
                        if (index.Status != 200)
                            errors.Add("GET /index.html returned " + index.Status);
                        else if (index.Text == null || index.Text.IndexOf("DePLay", StringComparison.Ordinal) < 0)
                            errors.Add("GET /index.html does not look like the DePLay page");
                        else
                            WriteLine("static server: index.html OK");

                        if (entryScript != null)
                        {
                            string url = server.BaseUrl + entryScript.Replace('\\', '/');
                            HttpResult ranged = Get(url, "bytes=0-15");
                            if (ranged.Status != 206)
                                errors.Add("Range request for " + entryScript + " returned " + ranged.Status);
                            else if (ranged.Body == null || ranged.Body.Length != 16)
                                errors.Add("Range request for " + entryScript + " returned " + (ranged.Body == null ? 0 : ranged.Body.Length) + " bytes");
                            else
                                WriteLine("static server: Range support OK");
                        }

                        HttpResult denied = Get(server.BaseUrl + "local?token=invalid&path=" + Uri.EscapeDataString(Path.Combine(baseDir, "web", "index.html")), null);
                        if (denied.Status != 403)
                            errors.Add("media endpoint accepted an invalid token (status " + denied.Status + ")");
                        else
                            WriteLine("media token check: OK");

                        HttpResult missing = Get(server.BaseUrl + "does-not-exist-" + Guid.NewGuid().ToString("N") + ".txt", null);
                        if (missing.Status != 404)
                            errors.Add("missing static file returned " + missing.Status + " instead of 404");
                        else
                            WriteLine("static server: 404 handling OK");

                        CheckRemoteProxy(server, errors);
                    }
                }
                catch (Exception error)
                {
                    errors.Add("local server: " + error.GetType().Name + ": " + error.Message);
                }
            }

            if (errors.Count == 0)
            {
                WriteLine("RESULT: PASS");
                return 0;
            }

            WriteLine("RESULT: FAIL");
            for (int i = 0; i < errors.Count; i++)
            {
                WriteLine("  - " + errors[i]);
                Log.Write("selftest: " + errors[i]);
            }
            return 1;
        }

        private static void CheckSettings(List<string> errors)
        {
            const string sample =
                "{\"version\":1,\"language\":\"de\",\"volume\":0.5,\"muted\":true," +
                "\"rate\":1.25,\"loop\":true,\"fps\":\"25\"," +
                "\"streamQuality\":\"720p\",\"streamlink\":\"C:\\\\Tools\\\\streamlink.exe\"}";
            AppSettings settings;
            if (!AppSettings.TryParse(sample, out settings) || settings == null)
            {
                errors.Add("settings JSON could not be parsed");
                return;
            }

            string query = settings.ToQueryString();
            string[] required = { "lang=de", "volume=0.5", "muted=1", "rate=1.25", "loop=1", "fps=25", "slq=720p" };
            for (int i = 0; i < required.Length; i++)
            {
                if (query.IndexOf(required[i], StringComparison.Ordinal) < 0)
                    errors.Add("settings query is missing '" + required[i] + "': " + query);
            }

            AppSettings clamped;
            if (AppSettings.TryParse("{\"volume\":5,\"rate\":40,\"fps\":\"999\",\"language\":\"xx\",\"streamQuality\":\"720p60\"}", out clamped))
            {
                if (clamped.Volume > 1 || clamped.Rate > 3 || clamped.Fps != "auto")
                    errors.Add("settings normalization did not clamp invalid values");
                if (clamped.StreamQuality != "720p60")
                    errors.Add("settings normalization did not keep a dynamic stream quality");
            }
            else
            {
                errors.Add("settings JSON with invalid values could not be parsed");
            }

            AppSettings badQuality;
            if (AppSettings.TryParse("{\"streamQuality\":\"bad quality!\"}", out badQuality) && badQuality.StreamQuality != "best")
                errors.Add("settings normalization did not reset a malformed stream quality");

            WriteLine("settings store: OK");
        }

        private static void CheckStreamlink(List<string> errors)
        {
            if (!Streamlink.IsHttpUrl("https://www.twitch.tv/example"))
                errors.Add("streamlink: HTTPS URL was not recognised");
            if (Streamlink.IsHttpUrl("www.twitch.tv/example"))
                errors.Add("streamlink: scheme-less URL was treated as a full URL too early");
            if (Streamlink.NormalizeUrl("www.twitch.tv/example") != "https://www.twitch.tv/example")
                errors.Add("streamlink: 'www.' address was not normalised");
            if (Streamlink.NormalizeUrl("twitch.tv/example") != "https://twitch.tv/example")
                errors.Add("streamlink: bare domain was not normalised");
            if (Streamlink.NormalizeUrl(@"C:\Videos\movie.mp4") != @"C:\Videos\movie.mp4")
                errors.Add("streamlink: a Windows path was normalised into a URL");
            if (!Streamlink.IsDirectMediaUrl("https://cdn.example.com/live/stream.m3u8?token=1"))
                errors.Add("streamlink: a playlist URL was not detected as media");
            if (!Streamlink.IsPlaylistUrl("https://cdn.example.com/live/stream.m3u8?token=1"))
                errors.Add("streamlink: a .m3u8 playlist was not recognised");
            if (Streamlink.IsDirectMediaUrl("https://www.twitch.tv/example"))
                errors.Add("streamlink: a channel page was mistaken for a direct media file");
            if (Streamlink.NameFromUrl("https://www.twitch.tv/example") != "example")
                errors.Add("streamlink: stream name was not extracted from the URL");
            if (!Streamlink.IsLivePageUrl("https://www.twitch.tv/example"))
                errors.Add("streamlink: a Twitch channel page was not detected as live");
            if (Streamlink.IsLivePageUrl("https://www.twitch.tv/videos/123456"))
                errors.Add("streamlink: a Twitch VOD page was detected as live");
            if (Streamlink.IsLivePageUrl("https://www.youtube.com/watch?v=abc"))
                errors.Add("streamlink: a YouTube watch page was detected as live");
            if (!Streamlink.IsLivePageUrl("https://www.youtube.com/live/abc"))
                errors.Add("streamlink: a YouTube live page was not detected as live");

            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string folder = Path.Combine(baseDir, "streamlink");
            string fake = Path.Combine(folder, "streamlink.exe");
            bool createdFolder = false;
            bool createdFile = false;
            try
            {
                if (!Directory.Exists(folder))
                {
                    Directory.CreateDirectory(folder);
                    createdFolder = true;
                }
                if (!File.Exists(fake))
                {
                    File.WriteAllBytes(fake, new byte[] { 0x4D, 0x5A });
                    createdFile = true;
                }
                string detected = Streamlink.Detect(null);
                bool portable = detected != null &&
                    detected.StartsWith(baseDir, StringComparison.OrdinalIgnoreCase) &&
                    detected.IndexOf("streamlink", StringComparison.OrdinalIgnoreCase) >= 0;
                if (!portable)
                    errors.Add("streamlink: the portable copy next to DePLay.exe was not preferred (" + (detected ?? "null") + ")");
                else
                    WriteLine("streamlink embedded detection: OK");
            }
            catch (Exception ex)
            {
                WriteLine("streamlink embedded detection: skipped (" + ex.Message + ")");
            }
            finally
            {
                try { if (createdFile && File.Exists(fake)) File.Delete(fake); }
                catch { /* best effort */ }
                try { if (createdFolder && Directory.Exists(folder) && Directory.GetFileSystemEntries(folder).Length == 0) Directory.Delete(folder); }
                catch { /* best effort */ }
            }

            WriteLine("streamlink URL parsing: OK");
        }

        private static void CheckFile(string path, List<string> errors)
        {
            if (File.Exists(path))
            {
                WriteLine("file OK: " + Path.GetFileName(path));
                return;
            }
            errors.Add("missing file: " + path);
        }

        private static void CheckDirectory(string path, List<string> errors)
        {
            if (Directory.Exists(path)) return;
            errors.Add("missing directory: " + path);
        }

        private static string WebView2Version()
        {
            const string clientId = "{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}";
            RegistryKey[] roots = { Registry.LocalMachine, Registry.CurrentUser };
            string[] subKeys =
            {
                @"SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\" + clientId,
                @"SOFTWARE\Microsoft\EdgeUpdate\Clients\" + clientId
            };
            for (int r = 0; r < roots.Length; r++)
            {
                for (int k = 0; k < subKeys.Length; k++)
                {
                    try
                    {
                        using (RegistryKey key = roots[r].OpenSubKey(subKeys[k]))
                        {
                            if (key == null) continue;
                            object value = key.GetValue("pv");
                            string version = value == null ? null : value.ToString();
                            if (!string.IsNullOrEmpty(version)) return version;
                        }
                    }
                    catch { /* registry access is best-effort */ }
                }
            }

            try
            {
                string programFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
                string root = Path.Combine(programFiles, "Microsoft", "EdgeWebView", "Application");
                if (Directory.Exists(root))
                {
                    string[] versions = Directory.GetDirectories(root);
                    if (versions.Length > 0)
                        return Path.GetFileName(versions[versions.Length - 1]);
                }
            }
            catch { /* ignore */ }

            return null;
        }

        private static void CheckRemoteProxy(LocalHttpServer server, List<string> errors)
        {
            using (RemoteFixture fixture = new RemoteFixture())
            {
                HttpResult playlist = Get(server.CreateRemoteUrl(fixture.BaseUrl + "playlist.m3u8"), null);
                if (playlist.Status != 200)
                {
                    errors.Add("remote proxy: playlist returned " + playlist.Status);
                }
                else
                {
                    int rewritten = CountOccurrences(playlist.Text, "remote?token=");
                    if (rewritten != 2)
                        errors.Add("remote proxy rewrote " + rewritten + " playlist entries instead of 2");
                    else if (playlist.Text.IndexOf("#EXT-X-KEY:METHOD=AES-128,URI=\"", StringComparison.Ordinal) < 0)
                        errors.Add("remote proxy dropped the playlist key tag");
                    else
                        WriteLine("remote proxy: playlist rewriting OK");
                }

                HttpResult ranged = Get(server.CreateRemoteUrl(fixture.BaseUrl + "clip.bin"), "bytes=2-5");
                if (ranged.Status != 206)
                {
                    errors.Add("remote proxy: Range request returned " + ranged.Status);
                }
                else if (ranged.Body == null || Encoding.ASCII.GetString(ranged.Body) != "2345")
                {
                    errors.Add("remote proxy: Range request returned an unexpected body");
                }
                else
                {
                    WriteLine("remote proxy: Range passthrough OK");
                }

                HttpResult denied = Get(server.BaseUrl + "remote?token=invalid&url=" + Uri.EscapeDataString(fixture.BaseUrl + "clip.bin"), null);
                if (denied.Status != 403)
                    errors.Add("remote proxy accepted an invalid token (status " + denied.Status + ")");
            }
        }

        private static int CountOccurrences(string text, string needle)
        {
            if (string.IsNullOrEmpty(text) || string.IsNullOrEmpty(needle)) return 0;
            int count = 0;
            int index = 0;
            while ((index = text.IndexOf(needle, index, StringComparison.Ordinal)) >= 0)
            {
                count += 1;
                index += needle.Length;
            }
            return count;
        }

        /// <summary>
        /// Minimal loopback HTTP server used to exercise the /remote proxy.
        /// Serves an HLS playlist, a key file and a byte-range capable clip.
        /// </summary>
        private sealed class RemoteFixture : IDisposable
        {
            private const string Playlist =
                "#EXTM3U\n" +
                "#EXT-X-VERSION:3\n" +
                "#EXT-X-TARGETDURATION:4\n" +
                "#EXT-X-KEY:METHOD=AES-128,URI=\"key.bin\"\n" +
                "#EXTINF:4.0,\n" +
                "seg1.ts\n" +
                "#EXT-X-ENDLIST\n";

            private readonly TcpListener listener;
            private readonly Thread thread;
            private volatile bool running;

            public string BaseUrl { get; private set; }

            public RemoteFixture()
            {
                listener = new TcpListener(IPAddress.Loopback, 0);
                listener.Start();
                int port = ((IPEndPoint)listener.LocalEndpoint).Port;
                BaseUrl = "http://127.0.0.1:" + port.ToString(CultureInfo.InvariantCulture) + "/";
                running = true;
                thread = new Thread(Loop);
                thread.IsBackground = true;
                thread.Start();
            }

            private void Loop()
            {
                while (running)
                {
                    TcpClient client;
                    try { client = listener.AcceptTcpClient(); }
                    catch { break; }
                    try { ThreadPool.QueueUserWorkItem(Handle, client); }
                    catch { try { client.Close(); } catch { /* ignore */ } }
                }
            }

            private void Handle(object state)
            {
                TcpClient client = (TcpClient)state;
                try
                {
                    using (client)
                    using (NetworkStream stream = client.GetStream())
                    {
                        string headers = ReadRequestHeaders(stream);
                        string target = "";
                        string range = "";
                        string[] lines = headers.Split(new string[] { "\r\n" }, StringSplitOptions.None);
                        if (lines.Length > 0)
                        {
                            string[] parts = lines[0].Split(' ');
                            if (parts.Length >= 2) target = parts[1];
                        }
                        for (int i = 1; i < lines.Length; i++)
                        {
                            int colon = lines[i].IndexOf(':');
                            if (colon <= 0) continue;
                            string name = lines[i].Substring(0, colon).Trim();
                            if (string.Equals(name, "Range", StringComparison.OrdinalIgnoreCase))
                                range = lines[i].Substring(colon + 1).Trim();
                        }

                        int query = target.IndexOf('?');
                        if (query >= 0) target = target.Substring(0, query);

                        if (target == "/playlist.m3u8")
                        {
                            WriteResponse(stream, 200, "OK", "application/vnd.apple.mpegurl", Encoding.UTF8.GetBytes(Playlist), null);
                        }
                        else if (target == "/key.bin")
                        {
                            byte[] key = new byte[16];
                            for (int i = 0; i < key.Length; i++) key[i] = (byte)i;
                            WriteResponse(stream, 200, "OK", "application/octet-stream", key, null);
                        }
                        else if (target == "/seg1.ts")
                        {
                            byte[] segment = new byte[] { 0x47, 0x40, 0x11, 0x10 };
                            WriteResponse(stream, 200, "OK", "video/mp2t", segment, null);
                        }
                        else if (target == "/clip.bin")
                        {
                            byte[] clip = Encoding.ASCII.GetBytes("0123456789");
                            long from;
                            long to;
                            if (TryParseRange(range, clip.Length, out from, out to))
                            {
                                byte[] slice = new byte[to - from + 1];
                                Array.Copy(clip, from, slice, 0, slice.Length);
                                WriteResponse(stream, 206, "Partial Content", "application/octet-stream", slice,
                                    "Content-Range: bytes " + from.ToString(CultureInfo.InvariantCulture) +
                                    "-" + to.ToString(CultureInfo.InvariantCulture) +
                                    "/" + clip.Length.ToString(CultureInfo.InvariantCulture) + "\r\n");
                            }
                            else
                            {
                                WriteResponse(stream, 200, "OK", "application/octet-stream", clip, "Accept-Ranges: bytes\r\n");
                            }
                        }
                        else
                        {
                            WriteResponse(stream, 404, "Not Found", "text/plain", Encoding.ASCII.GetBytes("missing"), null);
                        }
                    }
                }
                catch { /* fixture traffic is best effort */ }
            }

            private static string ReadRequestHeaders(NetworkStream stream)
            {
                StringBuilder text = new StringBuilder(256);
                int matched = 0;
                while (text.Length < 32768)
                {
                    int value = stream.ReadByte();
                    if (value < 0) break;
                    char current = (char)value;
                    text.Append(current);
                    if ((matched == 0 || matched == 2) && current == '\r') matched += 1;
                    else if ((matched == 1 || matched == 3) && current == '\n') matched += 1;
                    else matched = 0;
                    if (matched == 4) break;
                }
                return text.ToString();
            }

            private static bool TryParseRange(string header, int length, out long from, out long to)
            {
                from = 0;
                to = 0;
                if (string.IsNullOrEmpty(header)) return false;
                if (!header.StartsWith("bytes=", StringComparison.OrdinalIgnoreCase)) return false;
                string spec = header.Substring(6).Trim();
                int dash = spec.IndexOf('-');
                if (dash < 0) return false;
                if (!long.TryParse(spec.Substring(0, dash).Trim(), out from)) return false;
                string right = spec.Substring(dash + 1).Trim();
                if (right.Length == 0) to = length - 1;
                else if (!long.TryParse(right, out to)) return false;
                if (to >= length) to = length - 1;
                return from >= 0 && to >= from && from < length;
            }

            private static void WriteResponse(NetworkStream stream, int status, string reason, string contentType, byte[] body, string extra)
            {
                StringBuilder head = new StringBuilder(192);
                head.Append("HTTP/1.1 ").Append(status).Append(' ').Append(reason).Append("\r\n");
                head.Append("Content-Type: ").Append(contentType).Append("\r\n");
                head.Append("Content-Length: ").Append(body.Length.ToString(CultureInfo.InvariantCulture)).Append("\r\n");
                if (!string.IsNullOrEmpty(extra)) head.Append(extra);
                head.Append("Connection: close\r\n\r\n");
                byte[] headBytes = Encoding.ASCII.GetBytes(head.ToString());
                stream.Write(headBytes, 0, headBytes.Length);
                stream.Write(body, 0, body.Length);
                stream.Flush();
            }

            public void Dispose()
            {
                running = false;
                try { listener.Stop(); } catch { /* ignore */ }
                try { thread.Join(1000); } catch { /* ignore */ }
            }
        }

        private sealed class HttpResult
        {
            public int Status;
            public byte[] Body;
            public string Text;
        }

        private static HttpResult Get(string url, string rangeHeader)
        {
            HttpResult result = new HttpResult();
            HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
            request.Method = "GET";
            request.Timeout = 5000;
            request.ReadWriteTimeout = 5000;
            request.AllowAutoRedirect = false;
            if (!string.IsNullOrEmpty(rangeHeader))
            {
                int dash = rangeHeader.IndexOf('-');
                if (rangeHeader.StartsWith("bytes=", StringComparison.OrdinalIgnoreCase) && dash > 6)
                {
                    long from;
                    long to;
                    if (long.TryParse(rangeHeader.Substring(6, dash - 6), out from) &&
                        long.TryParse(rangeHeader.Substring(dash + 1), out to))
                    {
                        request.AddRange(from, to);
                    }
                }
            }

            try
            {
                using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                using (Stream stream = response.GetResponseStream())
                {
                    result.Status = (int)response.StatusCode;
                    result.Body = ReadAll(stream);
                }
            }
            catch (WebException error)
            {
                HttpWebResponse response = error.Response as HttpWebResponse;
                if (response == null) throw;
                using (response)
                using (Stream stream = response.GetResponseStream())
                {
                    result.Status = (int)response.StatusCode;
                    result.Body = ReadAll(stream);
                }
            }

            if (result.Body != null)
            {
                try { result.Text = Encoding.UTF8.GetString(result.Body); }
                catch { result.Text = null; }
            }
            return result;
        }

        private static byte[] ReadAll(Stream stream)
        {
            if (stream == null) return new byte[0];
            using (MemoryStream buffer = new MemoryStream())
            {
                byte[] chunk = new byte[8192];
                int read;
                while ((read = stream.Read(chunk, 0, chunk.Length)) > 0)
                    buffer.Write(chunk, 0, read);
                return buffer.ToArray();
            }
        }

        private static bool consoleOpen;

        private static void OpenConsole()
        {
            if (consoleOpen) return;
            try { AttachConsole(AttachParentProcess); }
            catch { /* no parent console */ }
            try
            {
                StreamWriter stdout = new StreamWriter(Console.OpenStandardOutput(), new UTF8Encoding(false));
                stdout.AutoFlush = true;
                Console.SetOut(stdout);
                StreamWriter stderr = new StreamWriter(Console.OpenStandardError(), new UTF8Encoding(false));
                stderr.AutoFlush = true;
                Console.SetError(stderr);
            }
            catch { /* console/redirect is optional */ }
            consoleOpen = true;
        }

        private static void WriteLine(string text)
        {
            Log.Write("selftest: " + text);
            try { Console.WriteLine(text); }
            catch { /* no console attached */ }
        }
    }
}
