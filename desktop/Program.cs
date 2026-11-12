using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.IO.Pipes;
using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace DePLay
{
    internal static class Program
    {
        internal const string DisplayName = "DePLay";
        private static Mutex instanceMutex;
        internal static int debugPort;

        [STAThread]
        private static void Main(string[] args)
        {
            if (SelfTest.WantsSelftest(args)) { Environment.ExitCode = SelfTest.Run(); return; }
            if (SelfTest.WantsVersion(args)) { SelfTest.PrintVersion(); return; }
            if (SelfTest.WantsStreamResolve(args)) { Environment.ExitCode = SelfTest.RunStreamResolve(args); return; }

            // .NET 4.0 defaults to SSL3/TLS 1.0; modern stream hosts require TLS 1.2.
            try
            {
                ServicePointManager.SecurityProtocol =
                    (SecurityProtocolType)3072 | (SecurityProtocolType)768;
            }
            catch { /* old runtime/OS: keep the platform default */ }

            string startupLanguage = LanguageStore.Read();
            if (string.IsNullOrEmpty(startupLanguage)) startupLanguage = LanguageStore.Detect();
            NativeStrings.Language = startupLanguage;

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.ThreadException += delegate(object sender, ThreadExceptionEventArgs e)
            {
                ReportFatal(e.Exception);
            };
            AppDomain.CurrentDomain.UnhandledException += delegate(object sender, UnhandledExceptionEventArgs e)
            {
                ReportFatal(e.ExceptionObject as Exception);
            };

            string requestedFile = null;
            string requestedUrl = null;
            if (args != null)
            {
                for (int i = 0; i < args.Length; i++)
                {
                    string arg = args[i];
                    if (string.IsNullOrEmpty(arg)) continue;
                    if (arg.StartsWith("--remote-debugging-port=", StringComparison.OrdinalIgnoreCase))
                    {
                        int port;
                        if (int.TryParse(arg.Substring("--remote-debugging-port=".Length), out port) &&
                            port > 0 && port < 65536)
                        {
                            debugPort = port;
                        }
                        continue;
                    }
                    if (arg.StartsWith("--", StringComparison.Ordinal)) continue;
                    string normalizedArg = IOHelper.NormalizeExistingPath(arg);
                    if (normalizedArg != null)
                    {
                        requestedFile = normalizedArg;
                        break;
                    }
                    string normalizedUrl = Streamlink.NormalizeUrl(arg);
                    if (Streamlink.IsHttpUrl(normalizedUrl) || Streamlink.IsFileUrl(normalizedUrl))
                    {
                        requestedUrl = normalizedUrl;
                        break;
                    }
                }
            }

            bool createdNew;
            instanceMutex = new Mutex(true, InstanceNames.Mutex, out createdNew);
            if (!createdNew)
            {
                bool delivered = PipeClient.Send(requestedFile ?? requestedUrl ?? string.Empty);
                if (!delivered && (requestedFile != null || requestedUrl != null))
                {
                    MessageBox.Show(
                        NativeStrings.Get("single.busy"),
                        DisplayName,
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning);
                }
                return;
            }

            try
            {
                Application.Run(new MainForm(requestedFile, requestedUrl));
            }
            catch (Exception error)
            {
                ReportFatal(error);
            }
            finally
            {
                try { instanceMutex.ReleaseMutex(); }
                catch { /* ignore */ }
                try { instanceMutex.Dispose(); }
                catch { /* ignore */ }
            }
        }

        private static void ReportFatal(Exception error)
        {
            Log.Error("fatal", error);
            string details = error == null ? NativeStrings.Get("fatal.unknown") : error.Message;
            MessageBox.Show(
                NativeStrings.Format("fatal.message", "details", details, "log", Log.FilePath),
                DisplayName,
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
        }
    }

    internal static class DataPaths
    {
        /// <summary>
        /// Folder for settings, logs and WebView2 data. Overridable with the
        /// DEPLAY_DATA_DIR environment variable so tests and portable profiles
        /// never touch the real per-user data.
        /// </summary>
        internal static string Folder
        {
            get
            {
                string custom = Environment.GetEnvironmentVariable("DEPLAY_DATA_DIR");
                if (!string.IsNullOrEmpty(custom))
                {
                    try { return Path.GetFullPath(custom.Trim().Trim('"')); }
                    catch { /* fall back to the default */ }
                }
                return Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "DePLay");
            }
        }

        internal static string File(string name)
        {
            return Path.Combine(Folder, name);
        }
    }

    internal static class Log
    {
        private static readonly object Sync = new object();
        private static string filePath;

        public static string FilePath
        {
            get
            {
                if (filePath == null)
                {
                    filePath = DataPaths.File("DePLay.log");
                }
                return filePath;
            }
        }

        public static void Write(string message)
        {
            try
            {
                string folder = Path.GetDirectoryName(FilePath);
                if (!Directory.Exists(folder)) Directory.CreateDirectory(folder);
                lock (Sync)
                {
                    File.AppendAllText(
                        FilePath,
                        DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + "  " + message + Environment.NewLine,
                        new UTF8Encoding(false));
                }
            }
            catch { /* logging must never break the player */ }
        }

        public static void Error(string context, Exception error)
        {
            if (error == null)
            {
                Write(context + ": unknown error");
                return;
            }
            Write(context + ": " + error.GetType().FullName + ": " + error.Message + Environment.NewLine + error.StackTrace);
        }
    }

    internal static class LanguageStore
    {
        private static readonly string[] Supported = { "ru", "en", "de" };
        private static string filePath;

        public static string FilePath
        {
            get
            {
                if (filePath == null)
                {
                    filePath = DataPaths.File("language.txt");
                }
                return filePath;
            }
        }

        public static string Normalize(string value)
        {
            if (string.IsNullOrEmpty(value)) return null;
            string code = value.Trim().ToLowerInvariant();
            if (code.Length > 2) code = code.Substring(0, 2);
            for (int i = 0; i < Supported.Length; i++)
            {
                if (Supported[i] == code) return code;
            }
            return null;
        }

        public static string Detect()
        {
            try
            {
                string code = Normalize(CultureInfo.CurrentUICulture.TwoLetterISOLanguageName);
                if (code != null) return code;
                code = Normalize(CultureInfo.CurrentUICulture.Name);
                if (code != null) return code;
            }
            catch { /* fall through to the default */ }
            return "ru";
        }

        public static string Read()
        {
            try
            {
                if (!File.Exists(FilePath)) return null;
                return Normalize(File.ReadAllText(FilePath, Encoding.UTF8));
            }
            catch (Exception error)
            {
                Log.Error("language read", error);
                return null;
            }
        }

        public static void Save(string code)
        {
            try
            {
                string folder = Path.GetDirectoryName(FilePath);
                if (!Directory.Exists(folder)) Directory.CreateDirectory(folder);
                File.WriteAllText(FilePath, code, new UTF8Encoding(false));
            }
            catch (Exception error)
            {
                Log.Error("language save", error);
            }
        }
    }

    internal static class IOHelper
    {
        public static string NormalizeExistingPath(string value)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;
            try
            {
                string path = value.Trim().Trim('"');
                if (path.Length == 0) return null;
                path = Path.GetFullPath(path);
                return File.Exists(path) ? path : null;
            }
            catch
            {
                return null;
            }
        }
    }

    internal static class InstanceNames
    {
        private static string suffix;

        public static string Suffix
        {
            get
            {
                if (suffix == null)
                {
                    string identity = Environment.UserName;
                    try
                    {
                        System.Security.Principal.WindowsIdentity current =
                            System.Security.Principal.WindowsIdentity.GetCurrent();
                        if (current != null && current.User != null) identity = current.User.Value;
                    }
                    catch { /* ignore */ }

                    StringBuilder safe = new StringBuilder(identity.Length);
                    for (int i = 0; i < identity.Length; i++)
                    {
                        char c = identity[i];
                        if (char.IsLetterOrDigit(c)) safe.Append(c);
                    }
                    if (safe.Length == 0) safe.Append("user");
                    suffix = Process.GetCurrentProcess().SessionId + "." + safe.ToString();
                }
                return suffix;
            }
        }

        public static string Mutex
        {
            get { return @"Local\DePLay.App." + Suffix; }
        }

        public static string Pipe
        {
            get { return "DePLay.App." + Suffix; }
        }
    }

    internal static class PipeClient
    {
        public static bool Send(string message)
        {
            try
            {
                using (NamedPipeClientStream pipe = new NamedPipeClientStream(
                    ".",
                    InstanceNames.Pipe,
                    PipeDirection.Out,
                    PipeOptions.None))
                {
                    pipe.Connect(10000);
                    byte[] data = Encoding.UTF8.GetBytes(message ?? string.Empty);
                    pipe.Write(data, 0, data.Length);
                    pipe.Flush();
                    return true;
                }
            }
            catch (Exception error)
            {
                Log.Error("pipe client", error);
                return false;
            }
        }
    }

    internal sealed class SingleInstanceServer : IDisposable
    {
        private readonly Action<string> onMessage;
        private Thread thread;
        private volatile bool running;

        public SingleInstanceServer(Action<string> messageHandler)
        {
            onMessage = messageHandler;
        }

        public void Start()
        {
            if (running) return;
            running = true;
            thread = new Thread(Loop);
            thread.IsBackground = true;
            thread.Name = "DePLay single instance";
            thread.Start();
        }

        private void Loop()
        {
            while (running)
            {
                try
                {
                    using (NamedPipeServerStream server = new NamedPipeServerStream(
                        InstanceNames.Pipe,
                        PipeDirection.In,
                        1,
                        PipeTransmissionMode.Byte,
                        PipeOptions.None))
                    {
                        server.WaitForConnection();
                        string message;
                        using (StreamReader reader = new StreamReader(server, Encoding.UTF8))
                        {
                            message = reader.ReadToEnd();
                        }
                        if (onMessage != null) onMessage((message ?? string.Empty).Trim());
                    }
                }
                catch (ObjectDisposedException)
                {
                    break;
                }
                catch (Exception error)
                {
                    if (running)
                    {
                        Log.Error("pipe server", error);
                        Thread.Sleep(250);
                    }
                }
            }
        }

        public void Dispose()
        {
            running = false;
            try
            {
                if (thread != null) thread.Join(200);
            }
            catch { /* ignore */ }
        }
    }

    internal sealed class LocalHttpServer : IDisposable
    {
        private readonly TcpListener listener;
        private readonly Thread acceptThread;
        private readonly string webRoot;
        private readonly string token;
        private readonly HashSet<string> allowedMedia;
        private readonly object mediaLock = new object();
        private readonly string baseUrl;
        private volatile bool running;

        public LocalHttpServer(string webRootPath)
        {
            webRoot = Path.GetFullPath(webRootPath);
            allowedMedia = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            token = CreateToken();

            listener = new TcpListener(IPAddress.Loopback, 0);
            listener.Start(64);
            int port = ((IPEndPoint)listener.LocalEndpoint).Port;
            baseUrl = "http://127.0.0.1:" + port + "/";

            running = true;
            acceptThread = new Thread(AcceptLoop);
            acceptThread.IsBackground = true;
            acceptThread.Name = "DePLay local server";
            acceptThread.Start();
        }

        public string BaseUrl
        {
            get { return baseUrl; }
        }

        public void AllowMedia(string path)
        {
            if (string.IsNullOrEmpty(path)) return;
            try
            {
                string full = Path.GetFullPath(path);
                lock (mediaLock) allowedMedia.Add(full);
            }
            catch { /* ignore invalid paths */ }
        }

        public string CreateAppUrl(string filePath, string language, string preferences)
        {
            List<string> parts = new List<string>();
            if (!string.IsNullOrEmpty(language))
            {
                parts.Add("lang=" + Uri.EscapeDataString(language));
            }
            if (!string.IsNullOrEmpty(preferences))
            {
                parts.Add(preferences);
            }
            if (!string.IsNullOrEmpty(filePath))
            {
                string mediaUrl = baseUrl +
                    "local?token=" + Uri.EscapeDataString(token) +
                    "&path=" + Uri.EscapeDataString(filePath);
                string name = Path.GetFileName(filePath);
                if (string.IsNullOrEmpty(name)) name = "video";
                parts.Add("open=" + Uri.EscapeDataString(mediaUrl));
                parts.Add("name=" + Uri.EscapeDataString(name));
                try
                {
                    long length = new FileInfo(filePath).Length;
                    parts.Add("size=" + length.ToString(CultureInfo.InvariantCulture));
                }
                catch { /* size is optional; the page can ask with HEAD */ }
            }
            if (parts.Count == 0) return baseUrl;
            return baseUrl + "?" + string.Join("&", parts.ToArray());
        }

        public string CreateRemoteUrl(string remoteUrl)
        {
            if (string.IsNullOrEmpty(remoteUrl)) return baseUrl;
            return baseUrl +
                "remote?token=" + Uri.EscapeDataString(token) +
                "&url=" + Uri.EscapeDataString(remoteUrl);
        }

        public string CreateStreamUrl(
            string streamUrl,
            string name,
            string error,
            bool hls,
            bool live,
            string page,
            string language,
            string preferences)
        {
            List<string> parts = new List<string>();
            if (!string.IsNullOrEmpty(language))
            {
                parts.Add("lang=" + Uri.EscapeDataString(language));
            }
            if (!string.IsNullOrEmpty(preferences))
            {
                parts.Add(preferences);
            }
            if (!string.IsNullOrEmpty(streamUrl))
            {
                parts.Add("stream=" + Uri.EscapeDataString(streamUrl));
                if (!string.IsNullOrEmpty(name)) parts.Add("name=" + Uri.EscapeDataString(name));
                if (hls) parts.Add("hls=1");
                if (live) parts.Add("live=1");
                if (!string.IsNullOrEmpty(page)) parts.Add("page=" + Uri.EscapeDataString(page));
            }
            if (!string.IsNullOrEmpty(error))
            {
                parts.Add("streamerror=" + Uri.EscapeDataString(error));
            }
            if (parts.Count == 0) return baseUrl;
            return baseUrl + "?" + string.Join("&", parts.ToArray());
        }

        private static string CreateToken()
        {
            byte[] bytes = new byte[16];
            using (RNGCryptoServiceProvider random = new RNGCryptoServiceProvider())
            {
                random.GetBytes(bytes);
            }
            StringBuilder text = new StringBuilder(bytes.Length * 2);
            for (int i = 0; i < bytes.Length; i++) text.Append(bytes[i].ToString("x2"));
            return text.ToString();
        }

        private void AcceptLoop()
        {
            while (running)
            {
                TcpClient client = null;
                try
                {
                    client = listener.AcceptTcpClient();
                }
                catch (SocketException)
                {
                    if (!running) break;
                    continue;
                }
                catch (ObjectDisposedException)
                {
                    break;
                }
                catch (Exception error)
                {
                    Log.Error("http accept", error);
                    if (!running) break;
                    continue;
                }

                try
                {
                    ThreadPool.QueueUserWorkItem(HandleClient, client);
                }
                catch (Exception error)
                {
                    Log.Error("http queue", error);
                    try { client.Close(); }
                    catch { /* ignore */ }
                }
            }
        }

        private void HandleClient(object state)
        {
            TcpClient client = (TcpClient)state;
            try
            {
                client.NoDelay = true;
                client.ReceiveTimeout = 20000;
                client.SendTimeout = 20000;
                using (client)
                using (NetworkStream stream = client.GetStream())
                {
                    string headerText = ReadHeaders(stream);
                    if (headerText == null)
                    {
                        WriteError(stream, 431, "Request Header Fields Too Large", false);
                        return;
                    }
                    if (headerText.Length == 0)
                    {
                        WriteError(stream, 400, "Bad Request", false);
                        return;
                    }

                    string[] lines = headerText.Split(new string[] { "\r\n" }, StringSplitOptions.None);
                    if (lines.Length == 0) return;

                    string[] request = lines[0].Split(' ');
                    if (request.Length < 3)
                    {
                        WriteError(stream, 400, "Bad Request", false);
                        return;
                    }

                    string method = request[0].ToUpperInvariant();
                    string target = request[1];
                    bool headOnly = method == "HEAD";
                    if (method != "GET" && !headOnly)
                    {
                        WriteError(stream, 405, "Method Not Allowed", headOnly);
                        return;
                    }

                    Dictionary<string, string> headers = ParseHeaders(lines);
                    Uri uri;
                    if (!TryBuildUri(target, out uri))
                    {
                        WriteError(stream, 400, "Bad Request", headOnly);
                        return;
                    }

                    if (string.Equals(uri.AbsolutePath, "/local", StringComparison.OrdinalIgnoreCase))
                    {
                        HandleMedia(stream, uri, headers, headOnly);
                        return;
                    }

                    if (string.Equals(uri.AbsolutePath, "/remote", StringComparison.OrdinalIgnoreCase))
                    {
                        HandleRemote(stream, uri, headers, headOnly);
                        return;
                    }

                    HandleStatic(stream, uri, headers, headOnly);
                }
            }
            catch (IOException) { /* client disconnected */ }
            catch (SocketException) { /* client disconnected */ }
            catch (Exception error)
            {
                Log.Error("http request", error);
            }
        }

        private static string ReadHeaders(NetworkStream stream)
        {
            byte[] buffer = new byte[32768];
            int total = 0;
            while (total < buffer.Length)
            {
                int read = stream.Read(buffer, total, buffer.Length - total);
                if (read <= 0) break;
                total += read;
                int end = FindHeaderEnd(buffer, total);
                if (end >= 0) return Encoding.ASCII.GetString(buffer, 0, end);
            }
            return null;
        }

        private static int FindHeaderEnd(byte[] buffer, int length)
        {
            for (int i = 0; i + 3 < length; i++)
            {
                if (buffer[i] == 13 && buffer[i + 1] == 10 && buffer[i + 2] == 13 && buffer[i + 3] == 10)
                    return i;
            }
            return -1;
        }

        private static Dictionary<string, string> ParseHeaders(string[] lines)
        {
            Dictionary<string, string> headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            for (int i = 1; i < lines.Length; i++)
            {
                string line = lines[i];
                if (string.IsNullOrEmpty(line)) continue;
                int colon = line.IndexOf(':');
                if (colon <= 0) continue;
                string name = line.Substring(0, colon).Trim();
                string value = line.Substring(colon + 1).Trim();
                if (name.Length > 0) headers[name] = value;
            }
            return headers;
        }

        private static bool TryBuildUri(string target, out Uri uri)
        {
            uri = null;
            if (string.IsNullOrEmpty(target)) return false;
            string value = target;
            if (value.StartsWith("/", StringComparison.Ordinal))
                value = "http://127.0.0.1" + value;
            else if (!value.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
                     !value.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                return false;
            return Uri.TryCreate(value, UriKind.Absolute, out uri);
        }

        private void HandleStatic(NetworkStream stream, Uri uri, Dictionary<string, string> headers, bool headOnly)
        {
            string relative;
            try
            {
                relative = Uri.UnescapeDataString(uri.AbsolutePath);
            }
            catch
            {
                WriteError(stream, 400, "Bad Request", headOnly);
                return;
            }

            if (relative.Length == 0 || relative == "/") relative = "/index.html";
            relative = relative.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);

            string full;
            try
            {
                full = Path.GetFullPath(Path.Combine(webRoot, relative));
            }
            catch
            {
                WriteError(stream, 400, "Bad Request", headOnly);
                return;
            }

            string rootWithSeparator = webRoot.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
            if (!full.StartsWith(rootWithSeparator, StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(full, webRoot, StringComparison.OrdinalIgnoreCase))
            {
                WriteError(stream, 403, "Forbidden", headOnly);
                return;
            }

            if (Directory.Exists(full)) full = Path.Combine(full, "index.html");
            if (!File.Exists(full))
            {
                WriteError(stream, 404, "Not Found", headOnly);
                return;
            }

            ServeFile(stream, full, MimeType(full), headers, headOnly);
        }

        private void HandleMedia(NetworkStream stream, Uri uri, Dictionary<string, string> headers, bool headOnly)
        {
            Dictionary<string, string> query = ParseQuery(uri.Query);
            string suppliedToken;
            if (!query.TryGetValue("token", out suppliedToken) || !TokenEquals(suppliedToken, token))
            {
                WriteError(stream, 403, "Forbidden", headOnly);
                return;
            }

            string rawPath;
            if (!query.TryGetValue("path", out rawPath) || string.IsNullOrEmpty(rawPath))
            {
                WriteError(stream, 400, "Bad Request", headOnly);
                return;
            }

            string full;
            try
            {
                full = Path.GetFullPath(rawPath);
            }
            catch
            {
                WriteError(stream, 400, "Bad Request", headOnly);
                return;
            }

            bool allowed;
            lock (mediaLock) allowed = allowedMedia.Contains(full);
            if (!allowed)
            {
                WriteError(stream, 403, "Forbidden", headOnly);
                return;
            }

            if (!File.Exists(full))
            {
                WriteError(stream, 404, "Not Found", headOnly);
                return;
            }

            Log.Write("media request: " + full);
            ServeFile(stream, full, MimeType(full), headers, headOnly);
        }

        private static void ApplyRemoteRange(HttpWebRequest request, string value)
        {
            if (!value.StartsWith("bytes=", StringComparison.OrdinalIgnoreCase)) return;
            string spec = value.Substring(6).Trim();
            int comma = spec.IndexOf(',');
            if (comma >= 0) spec = spec.Substring(0, comma).Trim();
            int dash = spec.IndexOf('-');
            if (dash < 0) return;
            string left = spec.Substring(0, dash).Trim();
            string right = spec.Substring(dash + 1).Trim();
            long from;
            long to;
            if (left.Length > 0 && long.TryParse(left, out from))
            {
                if (right.Length > 0 && long.TryParse(right, out to) && to >= from)
                    request.AddRange(from, to);
                else
                    request.AddRange(from);
            }
        }

        private void HandleRemote(NetworkStream stream, Uri uri, Dictionary<string, string> headers, bool headOnly)
        {
            Dictionary<string, string> query = ParseQuery(uri.Query);
            string suppliedToken;
            if (!query.TryGetValue("token", out suppliedToken) || !TokenEquals(suppliedToken, token))
            {
                WriteError(stream, 403, "Forbidden", headOnly);
                return;
            }

            string rawUrl;
            if (!query.TryGetValue("url", out rawUrl) || string.IsNullOrEmpty(rawUrl))
            {
                WriteError(stream, 400, "Bad Request", headOnly);
                return;
            }

            Uri remote;
            if (!Uri.TryCreate(rawUrl, UriKind.Absolute, out remote) ||
                (remote.Scheme != Uri.UriSchemeHttp && remote.Scheme != Uri.UriSchemeHttps))
            {
                WriteError(stream, 400, "Bad Request", headOnly);
                return;
            }

            HttpWebRequest request = null;
            try
            {
                request = (HttpWebRequest)WebRequest.Create(remote);
                request.Method = headOnly ? "HEAD" : "GET";
                request.AllowAutoRedirect = true;
                request.MaximumAutomaticRedirections = 8;
                request.Timeout = 20000;
                request.ReadWriteTimeout = 30000;
                request.KeepAlive = false;
                request.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) DePLay/1.0";
                request.AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate;

                string range;
                if (headers.TryGetValue("Range", out range) && !string.IsNullOrEmpty(range))
                    ApplyRemoteRange(request, range);
                string accept;
                if (headers.TryGetValue("Accept", out accept) && !string.IsNullOrEmpty(accept))
                    request.Accept = accept;

                using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                {
                    RelayRemote(stream, response, remote, headOnly);
                }
            }
            catch (WebException error)
            {
                HttpWebResponse response = error.Response as HttpWebResponse;
                if (response == null)
                {
                    Log.Error("remote request", error);
                    WriteError(stream, 502, "Bad Gateway", headOnly);
                    return;
                }
                using (response)
                {
                    int status = (int)response.StatusCode;
                    string reason = CleanHeader(response.StatusDescription);
                    if (reason.Length == 0) reason = "Remote Error";
                    WriteRemoteHead(stream, status, reason, response.ContentType, 0, null, headOnly);
                }
            }
            catch (Exception error)
            {
                Log.Error("remote request", error);
                WriteError(stream, 502, "Bad Gateway", headOnly);
            }
            finally
            {
                if (request != null) request.Abort();
            }
        }

        private void RelayRemote(NetworkStream stream, HttpWebResponse response, Uri remote, bool headOnly)
        {
            int status = (int)response.StatusCode;
            string reason = CleanHeader(response.StatusDescription);
            if (reason.Length == 0) reason = "OK";
            string contentType = response.ContentType;
            string finalUrl = response.ResponseUri == null ? remote.AbsoluteUri : response.ResponseUri.AbsoluteUri;
            bool playlist = IsPlaylistContentType(contentType) || Streamlink.IsPlaylistUrl(finalUrl);

            if (playlist && !headOnly)
            {
                string text;
                using (Stream body = response.GetResponseStream())
                using (StreamReader reader = new StreamReader(body, Encoding.UTF8))
                {
                    text = reader.ReadToEnd();
                }
                string rewritten = RewritePlaylist(text, response.ResponseUri == null ? remote : response.ResponseUri);
                byte[] bytes = Encoding.UTF8.GetBytes(rewritten);
                WriteRemoteHead(stream, status, reason,
                    "application/vnd.apple.mpegurl; charset=utf-8", bytes.Length, null, false);
                stream.Write(bytes, 0, bytes.Length);
                return;
            }

            long length = response.ContentLength;
            string contentRange = response.Headers["Content-Range"];
            WriteRemoteHead(stream, status, reason, contentType, length, contentRange, headOnly);
            if (headOnly) return;

            using (Stream body = response.GetResponseStream())
            {
                byte[] buffer = new byte[65536];
                int read;
                while ((read = body.Read(buffer, 0, buffer.Length)) > 0)
                {
                    if (!running) break;
                    stream.Write(buffer, 0, read);
                }
            }
        }

        private string RewritePlaylist(string text, Uri baseUri)
        {
            if (string.IsNullOrEmpty(text)) return text;
            string normalized = text.Replace("\r\n", "\n").Replace('\r', '\n');
            string[] lines = normalized.Split('\n');
            StringBuilder result = new StringBuilder(normalized.Length + 256);
            for (int i = 0; i < lines.Length; i++)
            {
                string line = lines[i];
                string trimmed = line.Trim();
                if (trimmed.Length == 0)
                {
                    result.Append(line);
                }
                else if (trimmed[0] == '#')
                {
                    result.Append(Regex.Replace(line, "URI=\"([^\"]+)\"", delegate(Match match)
                    {
                        return "URI=\"" + ProxyPlaylistTarget(baseUri, match.Groups[1].Value) + "\"";
                    }));
                }
                else
                {
                    result.Append(ProxyPlaylistTarget(baseUri, trimmed));
                }
                if (i + 1 < lines.Length) result.Append('\n');
            }
            return result.ToString();
        }

        private string ProxyPlaylistTarget(Uri baseUri, string value)
        {
            Uri absolute;
            if (!Uri.TryCreate(baseUri, value, out absolute)) return value;
            if (absolute.Scheme != Uri.UriSchemeHttp && absolute.Scheme != Uri.UriSchemeHttps) return value;
            return CreateRemoteUrl(absolute.AbsoluteUri);
        }

        private static bool IsPlaylistContentType(string contentType)
        {
            if (string.IsNullOrEmpty(contentType)) return false;
            string value = contentType.ToLowerInvariant();
            return value.IndexOf("mpegurl", StringComparison.Ordinal) >= 0 ||
                   value.IndexOf("vnd.apple.mpeg", StringComparison.Ordinal) >= 0 ||
                   value.IndexOf("audio/x-scpls", StringComparison.Ordinal) >= 0;
        }

        private static string CleanHeader(string value)
        {
            if (string.IsNullOrEmpty(value)) return string.Empty;
            return value.Replace("\r", " ").Replace("\n", " ").Trim();
        }

        private static void WriteRemoteHead(
            NetworkStream stream,
            int status,
            string reason,
            string contentType,
            long contentLength,
            string contentRange,
            bool headOnly)
        {
            if (string.IsNullOrEmpty(contentType)) contentType = "application/octet-stream";
            contentType = CleanHeader(contentType);
            reason = CleanHeader(reason);
            StringBuilder head = new StringBuilder(320);
            head.Append("HTTP/1.1 ").Append(status).Append(' ').Append(reason).Append("\r\n");
            head.Append("Content-Type: ").Append(contentType).Append("\r\n");
            if (contentLength >= 0) head.Append("Content-Length: ").Append(contentLength).Append("\r\n");
            head.Append("Accept-Ranges: bytes\r\n");
            if (!string.IsNullOrEmpty(contentRange))
                head.Append("Content-Range: ").Append(CleanHeader(contentRange)).Append("\r\n");
            head.Append("Access-Control-Allow-Origin: *\r\n");
            head.Append("Cache-Control: no-store\r\n");
            head.Append("Connection: close\r\n\r\n");
            byte[] headBytes = Encoding.ASCII.GetBytes(head.ToString());
            stream.Write(headBytes, 0, headBytes.Length);
        }

        private static bool TokenEquals(string left, string right)
        {
            if (left == null || right == null || left.Length != right.Length) return false;
            int difference = 0;
            for (int i = 0; i < left.Length; i++) difference |= left[i] ^ right[i];
            return difference == 0;
        }

        private static Dictionary<string, string> ParseQuery(string query)
        {
            Dictionary<string, string> result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            if (string.IsNullOrEmpty(query)) return result;
            string value = query;
            if (value.StartsWith("?", StringComparison.Ordinal)) value = value.Substring(1);
            string[] parts = value.Split('&');
            for (int i = 0; i < parts.Length; i++)
            {
                string part = parts[i];
                if (part.Length == 0) continue;
                int equals = part.IndexOf('=');
                string name = equals < 0 ? part : part.Substring(0, equals);
                string raw = equals < 0 ? string.Empty : part.Substring(equals + 1);
                try
                {
                    name = Uri.UnescapeDataString(name.Replace("+", " "));
                    raw = Uri.UnescapeDataString(raw.Replace("+", " "));
                }
                catch
                {
                    continue;
                }
                if (!result.ContainsKey(name)) result[name] = raw;
            }
            return result;
        }

        private void ServeFile(
            NetworkStream stream,
            string filePath,
            string contentType,
            Dictionary<string, string> requestHeaders,
            bool headOnly)
        {
            FileInfo info = new FileInfo(filePath);
            long length = info.Length;
            long start = 0;
            long end = length - 1;
            bool partial = false;

            string rangeHeader;
            if (requestHeaders.TryGetValue("Range", out rangeHeader) && !string.IsNullOrEmpty(rangeHeader))
            {
                long requestedStart;
                long requestedEnd;
                if (!TryParseRange(rangeHeader, length, out requestedStart, out requestedEnd))
                {
                    WriteError(stream, 416, "Range Not Satisfiable", headOnly);
                    return;
                }
                start = requestedStart;
                end = requestedEnd;
                partial = true;
            }

            long contentLength = end >= start ? end - start + 1 : 0;
            StringBuilder head = new StringBuilder(320);
            head.Append(partial ? "HTTP/1.1 206 Partial Content\r\n" : "HTTP/1.1 200 OK\r\n");
            head.Append("Content-Type: ").Append(contentType).Append("\r\n");
            head.Append("Content-Length: ").Append(contentLength).Append("\r\n");
            head.Append("Accept-Ranges: bytes\r\n");
            head.Append("Cache-Control: no-store\r\n");
            head.Append("X-Content-Type-Options: nosniff\r\n");
            head.Append("Connection: close\r\n");
            if (partial)
            {
                head.Append("Content-Range: bytes ").Append(start).Append('-').Append(end)
                    .Append('/').Append(length).Append("\r\n");
            }
            head.Append("\r\n");

            byte[] headBytes = Encoding.ASCII.GetBytes(head.ToString());
            stream.Write(headBytes, 0, headBytes.Length);

            if (headOnly || contentLength <= 0) return;

            using (FileStream file = new FileStream(
                filePath,
                FileMode.Open,
                FileAccess.Read,
                FileShare.ReadWrite | FileShare.Delete,
                65536,
                FileOptions.SequentialScan))
            {
                file.Seek(start, SeekOrigin.Begin);
                byte[] buffer = new byte[65536];
                long remaining = contentLength;
                while (remaining > 0 && running)
                {
                    int request = (int)Math.Min(buffer.Length, remaining);
                    int read = file.Read(buffer, 0, request);
                    if (read <= 0) break;
                    stream.Write(buffer, 0, read);
                    remaining -= read;
                }
            }
        }

        private static bool TryParseRange(string value, long length, out long start, out long end)
        {
            start = 0;
            end = length - 1;
            if (length <= 0) return false;
            if (!value.StartsWith("bytes=", StringComparison.OrdinalIgnoreCase)) return false;
            string spec = value.Substring(6).Trim();
            int comma = spec.IndexOf(',');
            if (comma >= 0) spec = spec.Substring(0, comma).Trim();
            int dash = spec.IndexOf('-');
            if (dash < 0) return false;
            string left = spec.Substring(0, dash).Trim();
            string right = spec.Substring(dash + 1).Trim();

            if (left.Length == 0)
            {
                long suffix;
                if (!long.TryParse(right, out suffix) || suffix <= 0) return false;
                if (suffix > length) suffix = length;
                start = length - suffix;
                end = length - 1;
                return true;
            }

            if (!long.TryParse(left, out start) || start < 0 || start >= length) return false;
            if (right.Length == 0)
            {
                end = length - 1;
            }
            else
            {
                if (!long.TryParse(right, out end) || end < start) return false;
                if (end >= length) end = length - 1;
            }
            return true;
        }

        private static void WriteError(NetworkStream stream, int status, string reason, bool headOnly)
        {
            byte[] body = Encoding.UTF8.GetBytes(status + " " + reason + "\n");
            StringBuilder head = new StringBuilder(160);
            head.Append("HTTP/1.1 ").Append(status).Append(' ').Append(reason).Append("\r\n");
            head.Append("Content-Type: text/plain; charset=utf-8\r\n");
            head.Append("Content-Length: ").Append(body.Length).Append("\r\n");
            head.Append("Cache-Control: no-store\r\n");
            head.Append("Connection: close\r\n\r\n");
            byte[] headBytes = Encoding.ASCII.GetBytes(head.ToString());
            stream.Write(headBytes, 0, headBytes.Length);
            if (!headOnly) stream.Write(body, 0, body.Length);
        }

        private static string MimeType(string path)
        {
            string extension = Path.GetExtension(path);
            if (extension == null) extension = string.Empty;
            switch (extension.ToLowerInvariant())
            {
                case ".html":
                case ".htm":
                    return "text/html; charset=utf-8";
                case ".js":
                    return "application/javascript; charset=utf-8";
                case ".css":
                    return "text/css; charset=utf-8";
                case ".json":
                    return "application/json; charset=utf-8";
                case ".svg":
                    return "image/svg+xml";
                case ".png":
                    return "image/png";
                case ".jpg":
                case ".jpeg":
                    return "image/jpeg";
                case ".gif":
                    return "image/gif";
                case ".webp":
                    return "image/webp";
                case ".avif":
                    return "image/avif";
                case ".bmp":
                    return "image/bmp";
                case ".ico":
                    return "image/x-icon";
                case ".mp4":
                case ".m4v":
                    return "video/mp4";
                case ".mov":
                    return "video/quicktime";
                case ".webm":
                    return "video/webm";
                case ".ogv":
                    return "video/ogg";
                case ".mkv":
                    return "video/x-matroska";
                case ".avi":
                    return "video/x-msvideo";
                case ".mp3":
                    return "audio/mpeg";
                case ".m4a":
                    return "audio/mp4";
                case ".aac":
                    return "audio/aac";
                case ".wav":
                    return "audio/wav";
                case ".ogg":
                case ".oga":
                case ".opus":
                    return "audio/ogg";
                case ".flac":
                    return "audio/flac";
                case ".woff":
                    return "font/woff";
                case ".woff2":
                    return "font/woff2";
                case ".ttf":
                    return "font/ttf";
                default:
                    return "application/octet-stream";
            }
        }

        public void Dispose()
        {
            running = false;
            try { listener.Stop(); }
            catch { /* ignore */ }
            try
            {
                if (acceptThread != null) acceptThread.Join(500);
            }
            catch { /* ignore */ }
        }
    }

    internal sealed class MainForm : Form
    {
        private readonly LocalHttpServer server;
        private readonly string initialFile;
        private readonly string initialUrl;
        private AppSettings settings;
        private readonly object pendingLock = new object();
        private WebView2 webView;
        private SingleInstanceServer pipeServer;
        private bool webReady;
        private string pendingTarget;
        private bool pendingTargetIsUrl;
        private string pendingStreamUrl;
        private string pendingStreamName;
        private string pendingStreamError;
        private bool pendingStreamHls;
        private bool pendingStreamLive;
        private string pendingStreamPage;
        private bool hasPendingStream;
        private string currentStreamPage;
        private string currentLanguage;
        private bool nativeFullscreen;
        private FormBorderStyle savedBorderStyle;
        private FormWindowState savedWindowState;
        private Rectangle savedBounds;
        private bool savedTopMost;

        public MainForm(string requestedFile, string requestedUrl)
        {
            initialFile = IOHelper.NormalizeExistingPath(requestedFile);
            initialUrl = requestedUrl;
            settings = AppSettings.Load();
            currentLanguage = settings.Language;
            if (string.IsNullOrEmpty(currentLanguage)) currentLanguage = LanguageStore.Detect();
            NativeStrings.Language = currentLanguage;
            Log.Write("language: " + currentLanguage);
            Log.Write("settings: " + AppSettings.FilePath);
            string webRoot = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "web");
            server = new LocalHttpServer(webRoot);
            if (initialFile != null) server.AllowMedia(initialFile);

            Text = "DePLay";
            BackColor = Color.FromArgb(8, 6, 7);
            ClientSize = new Size(1280, 768);
            MinimumSize = new Size(760, 480);
            StartPosition = FormStartPosition.CenterScreen;
            AutoScaleMode = AutoScaleMode.Dpi;
            try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); }
            catch { /* default icon */ }

            webView = new WebView2();
            webView.Dock = DockStyle.Fill;
            webView.AllowExternalDrop = true;
            webView.DefaultBackgroundColor = Color.FromArgb(8, 6, 7);
            Controls.Add(webView);

            Load += OnFormLoad;
            FormClosing += OnFormClosing;
        }

        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            ApplyDarkWindowChrome();
        }

        private void ApplyDarkWindowChrome()
        {
            try
            {
                int enabled = 1;
                if (NativeMethods.DwmSetWindowAttribute(Handle, 20, ref enabled, sizeof(int)) != 0)
                    NativeMethods.DwmSetWindowAttribute(Handle, 19, ref enabled, sizeof(int));

                int caption = ColorTranslator.ToWin32(Color.FromArgb(23, 12, 14));
                NativeMethods.DwmSetWindowAttribute(Handle, 35, ref caption, sizeof(int));
                int text = ColorTranslator.ToWin32(Color.FromArgb(246, 238, 239));
                NativeMethods.DwmSetWindowAttribute(Handle, 36, ref text, sizeof(int));
                int border = ColorTranslator.ToWin32(Color.FromArgb(88, 18, 25));
                NativeMethods.DwmSetWindowAttribute(Handle, 34, ref border, sizeof(int));
            }
            catch { /* older Windows builds */ }
        }

        private async void OnFormLoad(object sender, EventArgs e)
        {
            try
            {
                string dataFolder = Path.Combine(DataPaths.Folder, "WebView2");
                if (!Directory.Exists(dataFolder)) Directory.CreateDirectory(dataFolder);

                CoreWebView2EnvironmentOptions options = null;
                if (Program.debugPort > 0)
                {
                    options = new CoreWebView2EnvironmentOptions();
                    options.AdditionalBrowserArguments =
                        "--remote-debugging-port=" + Program.debugPort.ToString(CultureInfo.InvariantCulture);
                }
                CoreWebView2Environment environment =
                    await CoreWebView2Environment.CreateAsync(null, dataFolder, options);
                await webView.EnsureCoreWebView2Async(environment);
                ConfigureCoreWebView2();

                webReady = true;
                StartPipeServer();

                string target = null;
                string streamUrl = null;
                string streamName = null;
                string streamError = null;
                bool targetIsUrl = false;
                bool streamHls = false;
                bool streamLive = false;
                string streamPage = null;
                bool hasStream = false;
                lock (pendingLock)
                {
                    target = pendingTarget;
                    targetIsUrl = pendingTargetIsUrl;
                    pendingTarget = null;
                    pendingTargetIsUrl = false;

                    streamUrl = pendingStreamUrl;
                    streamName = pendingStreamName;
                    streamError = pendingStreamError;
                    streamHls = pendingStreamHls;
                    streamLive = pendingStreamLive;
                    streamPage = pendingStreamPage;
                    hasStream = hasPendingStream;
                    pendingStreamUrl = null;
                    pendingStreamName = null;
                    pendingStreamError = null;
                    pendingStreamHls = false;
                    pendingStreamLive = false;
                    pendingStreamPage = null;
                    hasPendingStream = false;
                }

                if (hasStream)
                {
                    NavigateToStream(streamUrl, streamName, streamError, streamHls, streamLive, streamPage);
                }
                else if (!string.IsNullOrEmpty(target))
                {
                    if (targetIsUrl) OpenUrl(target);
                    else NavigateToFile(target);
                }
                else if (!string.IsNullOrEmpty(initialUrl))
                {
                    OpenUrl(initialUrl);
                }
                else
                {
                    NavigateToFile(initialFile);
                }
            }
            catch (Exception error)
            {
                Log.Error("webview init", error);
                string message = NativeStrings.Format("webview.failed", "details", error.Message);
                DialogResult answer = MessageBox.Show(
                    this,
                    message + "\n\n" + NativeStrings.Get("webview.prompt"),
                    NativeStrings.Get("app.title"),
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Error);
                if (answer == DialogResult.Yes)
                {
                    try { Process.Start("https://go.microsoft.com/fwlink/p/?LinkId=2124703"); }
                    catch { /* ignore */ }
                }
                Close();
            }
        }

        private void ConfigureCoreWebView2()
        {
            CoreWebView2 core = webView.CoreWebView2;
            core.Settings.AreDefaultContextMenusEnabled = false;
            core.Settings.AreDevToolsEnabled = false;
            core.Settings.AreBrowserAcceleratorKeysEnabled = false;
            core.Settings.IsStatusBarEnabled = false;
            core.Settings.IsZoomControlEnabled = false;
            core.Settings.IsPasswordAutosaveEnabled = false;
            core.Settings.IsGeneralAutofillEnabled = false;
            core.Settings.IsPinchZoomEnabled = false;
            core.Settings.IsSwipeNavigationEnabled = false;

            webView.AllowExternalDrop = true;
            webView.DefaultBackgroundColor = Color.FromArgb(8, 6, 7);

            core.NavigationStarting += OnNavigationStarting;
            core.NewWindowRequested += OnNewWindowRequested;
            core.DownloadStarting += OnDownloadStarting;
            core.ContainsFullScreenElementChanged += OnContainsFullScreenElementChanged;
            core.ProcessFailed += OnProcessFailed;
            core.DocumentTitleChanged += OnDocumentTitleChanged;
            core.WebMessageReceived += OnWebMessageReceived;
        }

        private void StartPipeServer()
        {
            if (pipeServer != null) return;
            pipeServer = new SingleInstanceServer(OnPipeMessage);
            pipeServer.Start();
        }

        private void OnDocumentTitleChanged(object sender, object e)
        {
            try
            {
                string title = webView.CoreWebView2.DocumentTitle;
                if (!string.IsNullOrEmpty(title)) Text = title;
            }
            catch { /* ignore */ }
        }

        private void OnWebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            const string languagePrefix = "deplay:language:";
            const string settingsPrefix = "deplay:settings:";
            const string errorPrefix = "deplay:error:";
            const string urlPrefix = "deplay:url:";
            const string streamQualityPrefix = "deplay:streamquality:";
            const string resetCommand = "deplay:reset";
            try
            {
                string message = e.TryGetWebMessageAsString();
                if (string.IsNullOrEmpty(message)) return;

                if (message.StartsWith(urlPrefix, StringComparison.Ordinal))
                {
                    string raw = Streamlink.NormalizeUrl(message.Substring(urlPrefix.Length).Trim());
                    if (Streamlink.IsHttpUrl(raw) || Streamlink.IsFileUrl(raw)) OpenUrl(raw);
                    return;
                }

                if (message.StartsWith(settingsPrefix, StringComparison.Ordinal))
                {
                    AppSettings parsed;
                    if (AppSettings.TryParse(message.Substring(settingsPrefix.Length), out parsed))
                    {
                        settings = parsed;
                        currentLanguage = settings.Language;
                        NativeStrings.Language = currentLanguage;
                        AppSettings.Save(settings);
                        Log.Write("settings saved");
                    }
                    return;
                }

                if (message.StartsWith(streamQualityPrefix, StringComparison.Ordinal))
                {
                    string quality = message.Substring(streamQualityPrefix.Length).Trim().ToLowerInvariant();
                    if (Array.IndexOf(Streamlink.Qualities, quality) < 0) quality = "best";
                    settings.StreamQuality = quality;
                    AppSettings.Save(settings);
                    Log.Write("stream quality: " + quality);
                    if (!string.IsNullOrEmpty(currentStreamPage)) OpenUrl(currentStreamPage);
                    return;
                }

                if (string.Equals(message, resetCommand, StringComparison.Ordinal))
                {
                    string language = settings.Language;
                    settings = new AppSettings();
                    settings.Language = language;
                    AppSettings.Save(settings);
                    currentLanguage = settings.Language;
                    NativeStrings.Language = currentLanguage;
                    Log.Write("settings reset");
                    return;
                }

                if (message.StartsWith(errorPrefix, StringComparison.Ordinal))
                {
                    Log.Write("web: " + message.Substring(errorPrefix.Length));
                    return;
                }

                if (!message.StartsWith(languagePrefix, StringComparison.Ordinal)) return;
                string code = LanguageStore.Normalize(message.Substring(languagePrefix.Length));
                if (code == null) return;
                settings.Language = code;
                NativeStrings.Language = code;
                AppSettings.Save(settings);
                if (code == currentLanguage) return;
                currentLanguage = code;
                Log.Write("language: " + code);
            }
            catch (Exception error)
            {
                Log.Error("web message", error);
            }
        }

        private void OnNavigationStarting(object sender, CoreWebView2NavigationStartingEventArgs e)
        {
            if (!IsLocalUrl(e.Uri))
            {
                Log.Write("blocked navigation: " + e.Uri);
                e.Cancel = true;
            }
        }

        private bool IsLocalUrl(string url)
        {
            if (string.IsNullOrEmpty(url)) return false;
            return url.StartsWith(server.BaseUrl, StringComparison.OrdinalIgnoreCase);
        }

        private void OnNewWindowRequested(object sender, CoreWebView2NewWindowRequestedEventArgs e)
        {
            e.Handled = true;
            Log.Write("blocked new window: " + e.Uri);
        }

        private void OnDownloadStarting(object sender, CoreWebView2DownloadStartingEventArgs e)
        {
            e.Cancel = true;
        }

        private void OnProcessFailed(object sender, CoreWebView2ProcessFailedEventArgs e)
        {
            Log.Write("webview process failed: " + e.ProcessFailedKind);
        }

        private void NavigateToFile(string filePath)
        {
            if (!webReady) return;
            string normalized = IOHelper.NormalizeExistingPath(filePath);
            if (normalized != null) server.AllowMedia(normalized);
            string url = server.CreateAppUrl(normalized, currentLanguage, settings.ToQueryString());
            Log.Write("navigate: " + (normalized ?? server.BaseUrl));
            webView.CoreWebView2.Navigate(url);
        }

        private void NavigateToStream(string streamUrl, string name, string error, bool hls, bool live, string page)
        {
            if (string.IsNullOrEmpty(streamUrl) && string.IsNullOrEmpty(error)) return;
            if (!string.IsNullOrEmpty(page)) currentStreamPage = page;
            else if (!string.IsNullOrEmpty(streamUrl)) currentStreamPage = null;
            if (!webReady)
            {
                lock (pendingLock)
                {
                    pendingStreamUrl = streamUrl;
                    pendingStreamName = name;
                    pendingStreamError = error;
                    pendingStreamHls = hls;
                    pendingStreamLive = live;
                    pendingStreamPage = page;
                    hasPendingStream = true;
                }
                return;
            }

            string preferences = settings.ToQueryString();
            string url = server.CreateStreamUrl(streamUrl, name, error, hls, live, page, currentLanguage, preferences);
            Log.Write("navigate stream: " + (hls ? "hls" : "direct") + (live ? " live" : " vod") +
                (string.IsNullOrEmpty(error) ? string.Empty : " (error)"));
            webView.CoreWebView2.Navigate(url);
        }

        private void OpenUrl(string rawUrl)
        {
            if (IsDisposed || string.IsNullOrEmpty(rawUrl)) return;
            if (InvokeRequired)
            {
                try { BeginInvoke(new Action<string>(OpenUrl), rawUrl); }
                catch { /* form is closing */ }
                return;
            }
            RestoreWindow();

            string value = Streamlink.NormalizeUrl(rawUrl);
            if (Streamlink.IsFileUrl(value))
            {
                Uri local;
                if (Uri.TryCreate(value, UriKind.Absolute, out local) && local.IsFile)
                {
                    NavigateToFile(local.LocalPath);
                    return;
                }
            }
            if (!Streamlink.IsHttpUrl(value))
            {
                Log.Write("ignored URL: " + value);
                return;
            }

            string name = Streamlink.NameFromUrl(value);
            if (Streamlink.IsDirectMediaUrl(value))
            {
                if (!webReady)
                {
                    lock (pendingLock)
                    {
                        pendingTarget = value;
                        pendingTargetIsUrl = true;
                    }
                    return;
                }
                if (Streamlink.IsPlaylistUrl(value))
                    NavigateToStream(server.CreateRemoteUrl(value), name, null, true, false, value);
                else
                    NavigateToStream(value, name, null, false, false, null);
                return;
            }

            bool livePage = Streamlink.IsLivePageUrl(value);
            string executable = Streamlink.Detect(null);
            if (executable == null)
            {
                NavigateToStream(null, name, NativeStrings.Get("streamlink.notFound"), false, livePage, value);
                return;
            }
            if (!webReady)
            {
                lock (pendingLock)
                {
                    pendingTarget = value;
                    pendingTargetIsUrl = true;
                }
                return;
            }

            Log.Write("streamlink resolve via " + executable);
            NotifyWeb("deplay:toast:" + NativeStrings.Get("streamlink.resolving"));
            string quality = string.IsNullOrEmpty(settings.StreamQuality) ? "best" : settings.StreamQuality;
            ThreadPool.QueueUserWorkItem(delegate(object state)
            {
                string streamUrl;
                string error;
                bool ok = Streamlink.Resolve(executable, value, quality, 45000, out streamUrl, out error);
                try
                {
                    BeginInvoke(new Action(delegate
                    {
                        if (IsDisposed) return;
                        RestoreWindow();
                        if (!ok)
                        {
                            NavigateToStream(null, name, error, false, livePage, value);
                            return;
                        }
                        bool hls = Streamlink.IsPlaylistUrl(streamUrl);
                        NavigateToStream(hls ? server.CreateRemoteUrl(streamUrl) : streamUrl, name, null, hls, livePage, value);
                    }));
                }
                catch { /* form is closing */ }
            });
        }

        private void NotifyWeb(string message)
        {
            if (!webReady) return;
            try { webView.CoreWebView2.PostWebMessageAsString(message); }
            catch { /* page is not ready */ }
        }

        private void OnPipeMessage(string message)
        {
            if (IsDisposed) return;
            if (InvokeRequired)
            {
                try { BeginInvoke(new Action<string>(OnPipeMessage), message); }
                catch { /* form is closing */ }
                return;
            }
            RestoreWindow();
            if (string.IsNullOrEmpty(message)) return;

            if (Streamlink.IsHttpUrl(message) || Streamlink.IsFileUrl(message))
            {
                OpenUrl(message);
                return;
            }

            string normalized = IOHelper.NormalizeExistingPath(message);
            if (normalized == null)
            {
                MessageBox.Show(
                    this,
                    NativeStrings.Format("file.notFound", "path", message),
                    NativeStrings.Get("app.title"),
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning);
                return;
            }
            if (!webReady)
            {
                lock (pendingLock)
                {
                    pendingTarget = normalized;
                    pendingTargetIsUrl = false;
                }
                return;
            }
            NavigateToFile(normalized);
        }

        private void RestoreWindow()
        {
            try
            {
                if (WindowState == FormWindowState.Minimized) WindowState = FormWindowState.Normal;
                Show();
                NativeMethods.ShowWindow(Handle, 9);
                NativeMethods.SetForegroundWindow(Handle);
                Activate();
            }
            catch { /* ignore */ }
        }

        private void OnContainsFullScreenElementChanged(object sender, object e)
        {
            bool fullscreen = false;
            try { fullscreen = webView.CoreWebView2.ContainsFullScreenElement; }
            catch { /* ignore */ }
            if (fullscreen) EnterNativeFullscreen();
            else ExitNativeFullscreen();
        }

        private void EnterNativeFullscreen()
        {
            if (nativeFullscreen) return;
            savedBorderStyle = FormBorderStyle;
            savedWindowState = WindowState;
            savedBounds = Bounds;
            savedTopMost = TopMost;
            nativeFullscreen = true;

            FormBorderStyle = FormBorderStyle.None;
            WindowState = FormWindowState.Normal;
            TopMost = true;
            Bounds = Screen.FromHandle(Handle).Bounds;
        }

        private void ExitNativeFullscreen()
        {
            if (!nativeFullscreen) return;
            nativeFullscreen = false;
            TopMost = savedTopMost;
            FormBorderStyle = savedBorderStyle;
            if (savedWindowState == FormWindowState.Maximized)
            {
                WindowState = FormWindowState.Maximized;
            }
            else
            {
                WindowState = FormWindowState.Normal;
                Bounds = savedBounds;
            }
        }

        private void OnFormClosing(object sender, FormClosingEventArgs e)
        {
            if (settings != null) AppSettings.Save(settings);
            if (pipeServer != null)
            {
                pipeServer.Dispose();
                pipeServer = null;
            }
            if (server != null) server.Dispose();
            if (webView != null && !webView.IsDisposed)
            {
                try { webView.Dispose(); }
                catch { /* ignore */ }
            }
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                if (pipeServer != null)
                {
                    pipeServer.Dispose();
                    pipeServer = null;
                }
                if (server != null) server.Dispose();
            }
            base.Dispose(disposing);
        }
    }

    internal static class NativeMethods
    {
        [System.Runtime.InteropServices.DllImport("dwmapi.dll")]
        public static extern int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int value, int size);

        [System.Runtime.InteropServices.DllImport("user32.dll")]
        public static extern bool SetForegroundWindow(IntPtr hwnd);

        [System.Runtime.InteropServices.DllImport("user32.dll")]
        public static extern bool ShowWindow(IntPtr hwnd, int command);
    }
}
