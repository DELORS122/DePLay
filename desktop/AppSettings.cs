using System;
using System.Globalization;
using System.IO;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
using System.Text;

namespace DePLay
{
    /// <summary>
    /// Persistent player preferences. The local HTTP server uses a random port on
    /// every launch, so localStorage cannot survive a restart; this file is the
    /// single source of truth for the desktop build.
    /// </summary>
    [DataContract]
    internal sealed class AppSettings
    {
        internal const int CurrentVersion = 1;

        private static readonly string[] FpsValues =
        {
            "auto", "23.976", "24", "25", "29.97", "30", "48", "50", "59.94", "60", "120"
        };

        [DataMember(Name = "version")]
        public int Version;

        [DataMember(Name = "language")]
        public string Language;

        [DataMember(Name = "volume")]
        public double Volume;

        [DataMember(Name = "muted")]
        public bool Muted;

        [DataMember(Name = "rate")]
        public double Rate;

        [DataMember(Name = "loop")]
        public bool Loop;

        [DataMember(Name = "fps")]
        public string Fps;

        [DataMember(Name = "streamQuality")]
        public string StreamQuality;

        public AppSettings()
        {
            Version = CurrentVersion;
            Volume = 0.9;
            Rate = 1.0;
            Loop = false;
            Fps = "auto";
            Muted = false;
            Language = null;
            StreamQuality = "best";
        }

        public static string FilePath
        {
            get
            {
                return DePLay.DataPaths.File("settings.json");
            }
        }

        public static AppSettings Load()
        {
            AppSettings result = null;
            try
            {
                if (File.Exists(FilePath))
                {
                    using (FileStream stream = new FileStream(FilePath, FileMode.Open, FileAccess.Read, FileShare.Read))
                    {
                        DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(AppSettings));
                        result = serializer.ReadObject(stream) as AppSettings;
                    }
                }
            }
            catch (Exception error)
            {
                Log.Error("settings read", error);
                result = null;
            }

            if (result == null) result = new AppSettings();
            if (string.IsNullOrEmpty(result.Language)) result.Language = LanguageStore.Read();
            if (string.IsNullOrEmpty(result.Language)) result.Language = LanguageStore.Detect();
            result.Normalize();
            return result;
        }

        public static bool TryParse(string json, out AppSettings settings)
        {
            settings = null;
            if (string.IsNullOrEmpty(json)) return false;
            try
            {
                byte[] bytes = Encoding.UTF8.GetBytes(json);
                using (MemoryStream stream = new MemoryStream(bytes))
                {
                    DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(AppSettings));
                    settings = serializer.ReadObject(stream) as AppSettings;
                }
            }
            catch (Exception error)
            {
                Log.Error("settings parse", error);
                settings = null;
                return false;
            }
            if (settings == null) return false;
            settings.Normalize();
            return true;
        }

        public static void Save(AppSettings settings)
        {
            if (settings == null) return;
            settings.Normalize();
            try
            {
                string folder = Path.GetDirectoryName(FilePath);
                if (!string.IsNullOrEmpty(folder) && !Directory.Exists(folder))
                    Directory.CreateDirectory(folder);

                string temporary = FilePath + ".tmp";
                using (FileStream stream = new FileStream(temporary, FileMode.Create, FileAccess.Write, FileShare.None))
                {
                    DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(AppSettings));
                    serializer.WriteObject(stream, settings);
                }

                if (File.Exists(FilePath))
                {
                    try
                    {
                        File.Replace(temporary, FilePath, null);
                    }
                    catch (PlatformNotSupportedException)
                    {
                        File.Delete(FilePath);
                        File.Move(temporary, FilePath);
                    }
                    catch (IOException)
                    {
                        File.Delete(FilePath);
                        File.Move(temporary, FilePath);
                    }
                }
                else
                {
                    File.Move(temporary, FilePath);
                }
            }
            catch (Exception error)
            {
                Log.Error("settings save", error);
            }
        }

        public void Normalize()
        {
            Version = CurrentVersion;
            if (Volume < 0 || Volume > 1 || double.IsNaN(Volume)) Volume = 0.9;
            if (Rate < 0.1 || Rate > 3 || double.IsNaN(Rate)) Rate = 1.0;
            if (string.IsNullOrEmpty(Language)) Language = LanguageStore.Detect();
            else
            {
                string code = LanguageStore.Normalize(Language);
                Language = code == null ? LanguageStore.Detect() : code;
            }

            bool knownFps = false;
            if (!string.IsNullOrEmpty(Fps))
            {
                for (int i = 0; i < FpsValues.Length; i++)
                {
                    if (string.Equals(FpsValues[i], Fps, StringComparison.Ordinal)) { knownFps = true; break; }
                }
            }
            if (!knownFps) Fps = "auto";

            // Quality names depend on the stream ("720p60", "audio_only",
            // "chunked", ...), so only the token shape is validated here.
            if (Streamlink.IsQualityName(StreamQuality)) StreamQuality = StreamQuality.Trim();
            else StreamQuality = "best";
        }

        public string ToQueryString()
        {
            StringBuilder text = new StringBuilder();
            Append(text, "lang", Language);
            Append(text, "volume", Volume.ToString("0.###", CultureInfo.InvariantCulture));
            Append(text, "muted", Muted ? "1" : "0");
            Append(text, "rate", Rate.ToString("0.###", CultureInfo.InvariantCulture));
            Append(text, "loop", Loop ? "1" : "0");
            Append(text, "fps", Fps);
            Append(text, "slq", StreamQuality);
            return text.ToString();
        }

        private static void Append(StringBuilder text, string name, string value)
        {
            if (string.IsNullOrEmpty(value)) return;
            if (text.Length > 0) text.Append('&');
            text.Append(name).Append('=').Append(Uri.EscapeDataString(value));
        }
    }
}
