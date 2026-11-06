using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Text;
using System.Windows.Forms;
using Microsoft.Win32;

namespace DePLaySetup
{
    internal static class L
    {
        internal static readonly bool En =
            string.Equals(CultureInfo.CurrentUICulture.TwoLetterISOLanguageName, "en", StringComparison.OrdinalIgnoreCase);

        internal static string T(string ru, string en)
        {
            return En ? en : ru;
        }

        internal static string AppName { get { return "DePLay"; } }
        internal static string WindowTitle { get { return T("Установка DePLay", "DePLay Setup"); } }
        internal static string Subtitle { get { return T("Локальный медиаплеер для видео, фото и звука", "Local player for video, photos and sound"); } }
        internal static string PathLabel { get { return T("Папка установки", "Install folder"); } }
        internal static string Browse { get { return T("Обзор…", "Browse…"); } }
        internal static string Shortcuts { get { return T("Создать ярлыки в меню «Пуск» и на рабочем столе", "Create Start menu and desktop shortcuts"); } }
        internal static string Register { get { return T("Связать видеофайлы с DePLay (.mp4, .mov, .webm и др.)", "Associate video files with DePLay (.mp4, .mov, .webm, etc.)"); } }
        internal static string Launch { get { return T("Запустить DePLay после установки", "Launch DePLay after installation"); } }
        internal static string Info
        {
            get
            {
                return T(
                    "Установка выполняется для текущего пользователя — права администратора не нужны.\r\n\r\n" +
                    "Windows 11 не позволяет программе автоматически стать приложением по умолчанию. После установки откройте " +
                    "«Параметры → Приложения → Приложения по умолчанию → DePLay» и выберите нужные расширения.",
                    "DePLay installs for the current user, so administrator rights are not required.\r\n\r\n" +
                    "Windows 11 does not let a program become the default handler automatically. After installation open " +
                    "\"Settings → Apps → Default apps → DePLay\" and pick the file types you need.");
            }
        }
        internal static string WebViewOk { get { return T("Microsoft Edge WebView2 Runtime обнаружен.", "Microsoft Edge WebView2 Runtime detected."); } }
        internal static string WebViewMissing { get { return T("Microsoft Edge WebView2 Runtime не найден — без него DePLay не запустится.", "Microsoft Edge WebView2 Runtime not found — DePLay needs it to run."); } }
        internal static string WebViewDownload { get { return T("Скачать WebView2 Runtime", "Download WebView2 Runtime"); } }
        internal static string Install { get { return T("Установить", "Install"); } }
        internal static string Cancel { get { return T("Отмена", "Cancel"); } }
        internal static string Preparing { get { return T("Подготовка…", "Preparing…"); } }
        internal static string Copying { get { return T("Копирование файлов…", "Copying files…"); } }
        internal static string Registering { get { return T("Регистрация в Windows…", "Registering in Windows…"); } }
        internal static string CreatingShortcuts { get { return T("Создание ярлыков…", "Creating shortcuts…"); } }
        internal static string ClosingApp { get { return T("Закрытие запущенного DePLay…", "Closing running DePLay…"); } }
        internal static string RemovingFiles { get { return T("Удаление файлов…", "Removing files…"); } }
        internal static string RemovingRegistry { get { return T("Удаление регистрации…", "Removing registry entries…"); } }
        internal static string RemovingShortcuts { get { return T("Удаление ярлыков…", "Removing shortcuts…"); } }
        internal static string Done { get { return T("Готово", "Done"); } }
        internal static string Failed { get { return T("Установка не завершена", "Installation did not finish"); } }
        internal static string ErrorTitle { get { return T("Ошибка установки", "Installation error"); } }
        internal static string SuccessTitle { get { return T("DePLay установлен", "DePLay installed"); } }
        internal static string SuccessNote
        {
            get
            {
                return T(
                    "DePLay установлен.\r\n\r\n" +
                    "Чтобы открывать видеофайлы в DePLay, назначьте его приложением по умолчанию:\r\n" +
                    "Параметры → Приложения → Приложения по умолчанию → DePLay.\r\n\r\n" +
                    "Удалить программу можно через «Параметры → Приложения → Установленные приложения → DePLay» " +
                    "или ярлык «Удалить DePLay» в меню «Пуск».",
                    "DePLay has been installed.\r\n\r\n" +
                    "To open video files with DePLay, set it as the default app:\r\n" +
                    "Settings → Apps → Default apps → DePLay.\r\n\r\n" +
                    "You can remove the program from \"Settings → Apps → Installed apps → DePLay\" " +
                    "or with the \"Uninstall DePLay\" Start menu shortcut.");
            }
        }
        internal static string PathEmpty { get { return T("Укажите папку установки.", "Please choose an install folder."); } }
        internal static string PathRoot { get { return T("Нельзя устанавливать DePLay в корень диска. Выберите папку в профиле пользователя.", "DePLay cannot be installed into a drive root. Choose a folder inside your user profile."); } }
        internal static string NonEmptyFolder
        {
            get
            {
                return T(
                    "Выбранная папка не пуста и не похожа на установленный DePLay.\r\nПродолжить установку в неё?",
                    "The selected folder is not empty and does not look like an existing DePLay installation.\r\nInstall into it anyway?");
            }
        }
        internal static string ConfirmUninstall
        {
            get
            {
                return T(
                    "Удалить DePLay и его регистрацию в Windows?\r\n\r\nФайлы программы будут удалены. Настройки, журнал и данные WebView2 в %LOCALAPPDATA%\\DePLay останутся.",
                    "Remove DePLay and its Windows registration?\r\n\r\nProgram files will be deleted. Settings, logs and WebView2 data in %LOCALAPPDATA%\\DePLay will remain.");
            }
        }
        internal static string Uninstalled { get { return T("DePLay удалён.", "DePLay has been removed."); } }
        internal static string UninstallTitle { get { return T("Удаление DePLay", "Uninstall DePLay"); } }
        internal static string UninstallNotFound { get { return T("Установка DePLay не найдена.", "DePLay installation was not found."); } }
        internal static string CannotWrite
        {
            get
            {
                return T(
                    "Нет доступа к выбранной папке. Для установки без прав администратора выберите папку в профиле пользователя, например %LOCALAPPDATA%\\Programs\\DePLay.",
                    "The selected folder is not writable. To install without administrator rights choose a folder inside your user profile, for example %LOCALAPPDATA%\\Programs\\DePLay.");
            }
        }
        internal static string Usage
        {
            get
            {
                return "DePLay Setup " + Program.Version + "\r\n\r\n" +
                    "DePLay-Setup.exe [/S] [/DIR=<folder>] [/NOREG] [/NOSHORTCUTS] [/NOLAUNCH]\r\n" +
                    "DePLay-Setup.exe /uninstall [/S] [/DIR=<folder>]\r\n\r\n" +
                    "/S            silent mode\r\n" +
                    "/DIR=<folder> installation folder\r\n" +
                    "/NOREG        do not register file associations\r\n" +
                    "/NOSHORTCUTS  do not create shortcuts\r\n" +
                    "/NOLAUNCH     do not start DePLay after installation\r\n" +
                    "/uninstall    remove DePLay";
            }
        }
    }

    internal sealed class Options
    {
        internal string Dir;
        internal bool Silent;
        internal bool Uninstall;
        internal bool NoReg;
        internal bool NoShortcuts;
        internal bool NoLaunch;
        internal bool Help;

        internal static Options Parse(string[] args)
        {
            Options o = new Options();
            for (int i = 0; i < args.Length; i++)
            {
                string a = args[i].Trim();
                string lower = a.ToLowerInvariant();

                if (lower == "/s" || lower == "/silent" || lower == "-s" || lower == "--silent") o.Silent = true;
                else if (lower == "/uninstall" || lower == "/u" || lower == "-uninstall") o.Uninstall = true;
                else if (lower == "/noreg" || lower == "-noreg") o.NoReg = true;
                else if (lower == "/noshortcuts" || lower == "-noshortcuts") o.NoShortcuts = true;
                else if (lower == "/nolaunch" || lower == "-nolaunch") o.NoLaunch = true;
                else if (lower == "/?" || lower == "/help" || lower == "-h" || lower == "--help") o.Help = true;
                else if (lower.StartsWith("/dir=", StringComparison.Ordinal))
                {
                    o.Dir = Unquote(a.Substring(5));
                }
                else if (lower == "/dir" && i + 1 < args.Length)
                {
                    o.Dir = Unquote(args[++i]);
                }
            }
            return o;
        }

        private static string Unquote(string value)
        {
            if (value == null) return null;
            value = value.Trim();
            if (value.Length >= 2 && value[0] == '"' && value[value.Length - 1] == '"')
                value = value.Substring(1, value.Length - 2);
            return value;
        }
    }

    internal static class Program
    {
        internal const string AppName = "DePLay";
        internal const string Version = "1.0.0";
        internal const string PayloadResource = "DePLay.Payload.zip";
        internal const string ProgId = "DePLay.Video";
        internal const string WebView2Url = "https://go.microsoft.com/fwlink/p/?LinkId=2124703";

        internal static readonly string[] Extensions = { ".mp4", ".m4v", ".mov", ".webm", ".ogv" };

        internal static string DefaultDir
        {
            get
            {
                string registered = Installer.ReadInstallLocation();
                if (!string.IsNullOrEmpty(registered) && Directory.Exists(registered)) return registered;
                return Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "Programs",
                    "DePLay");
            }
        }

        [STAThread]
        private static int Main(string[] args)
        {
            try
            {
                Options options = Options.Parse(args);

                if (options.Help)
                {
                    MessageBox.Show(L.Usage, "DePLay Setup", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    return 0;
                }

                if (options.Uninstall)
                    return RunUninstall(options);

                if (options.Silent)
                    return RunSilentInstall(options);

                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                using (SetupForm form = new SetupForm(options))
                {
                    Application.Run(form);
                    if (form.InstallSucceeded && form.LaunchRequested)
                        Installer.Launch(form.InstallDir);
                    return form.ExitCode;
                }
            }
            catch (Exception ex)
            {
                Installer.Log("fatal: " + ex);
                try
                {
                    MessageBox.Show(ex.Message, L.ErrorTitle, MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
                catch { }
                return 1;
            }
        }

        private static int RunSilentInstall(Options options)
        {
            string dir = string.IsNullOrEmpty(options.Dir) ? DefaultDir : options.Dir;
            Installer.Install(dir, !options.NoReg, !options.NoShortcuts, Installer.Log);
            if (!options.NoLaunch) Installer.Launch(dir);
            return 0;
        }

        private static int RunUninstall(Options options)
        {
            string dir = Installer.ResolveUninstallDir(options.Dir);
            if (string.IsNullOrEmpty(dir))
            {
                Installer.Log("uninstall: installation not found");
                if (!options.Silent)
                    MessageBox.Show(L.UninstallNotFound, L.UninstallTitle, MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return 1;
            }

            if (!options.Silent)
            {
                DialogResult answer = MessageBox.Show(
                    L.ConfirmUninstall,
                    L.UninstallTitle,
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Question,
                    MessageBoxDefaultButton.Button2);
                if (answer != DialogResult.Yes) return 0;
            }

            Installer.Uninstall(dir, options.Silent ? (Action<string>)Installer.Log : null);

            if (!options.Silent)
                MessageBox.Show(L.Uninstalled, L.UninstallTitle, MessageBoxButtons.OK, MessageBoxIcon.Information);
            return 0;
        }
    }

    internal sealed class SetupForm : Form
    {
        private static readonly Color Bg = Color.FromArgb(11, 6, 7);
        private static readonly Color HeaderBg = Color.FromArgb(20, 10, 12);
        private static readonly Color Accent = Color.FromArgb(208, 30, 45);
        private static readonly Color TextColor = Color.FromArgb(242, 232, 232);
        private static readonly Color Muted = Color.FromArgb(166, 138, 142);
        private static readonly Color FieldBg = Color.FromArgb(26, 15, 17);

        private readonly Options options;
        private TextBox pathBox;
        private CheckBox shortcutsCheck;
        private CheckBox registerCheck;
        private CheckBox launchCheck;
        private Button installButton;
        private Button cancelButton;
        private Button browseButton;
        private ProgressBar progress;
        private Label statusLabel;
        private bool busy;

        internal bool InstallSucceeded;
        internal bool LaunchRequested;
        internal string InstallDir;
        internal int ExitCode;

        internal SetupForm(Options options)
        {
            this.options = options;
            BuildUi();
        }

        private void BuildUi()
        {
            Text = L.WindowTitle;
            Font = new Font("Segoe UI", 9F, FontStyle.Regular, GraphicsUnit.Point);
            BackColor = Bg;
            ForeColor = TextColor;
            ClientSize = new Size(640, 540);
            FormBorderStyle = FormBorderStyle.FixedSingle;
            MaximizeBox = false;
            MinimizeBox = true;
            StartPosition = FormStartPosition.CenterScreen;
            AutoScaleMode = AutoScaleMode.Dpi;

            Panel header = new Panel();
            header.Dock = DockStyle.Top;
            header.Height = 96;
            header.BackColor = HeaderBg;
            Controls.Add(header);

            Panel accent = new Panel();
            accent.Dock = DockStyle.Bottom;
            accent.Height = 3;
            accent.BackColor = Accent;
            header.Controls.Add(accent);

            Label title = new Label();
            title.Text = "DePLay";
            title.Font = new Font("Segoe UI", 24F, FontStyle.Bold, GraphicsUnit.Point);
            title.ForeColor = TextColor;
            title.AutoSize = true;
            title.Location = new Point(26, 14);
            header.Controls.Add(title);

            Label subtitle = new Label();
            subtitle.Text = L.Subtitle;
            subtitle.Font = new Font("Segoe UI", 9F, FontStyle.Regular, GraphicsUnit.Point);
            subtitle.ForeColor = Muted;
            subtitle.AutoSize = true;
            subtitle.Location = new Point(29, 61);
            header.Controls.Add(subtitle);

            Label pathLabel = new Label();
            pathLabel.Text = L.PathLabel;
            pathLabel.ForeColor = Muted;
            pathLabel.AutoSize = true;
            pathLabel.Location = new Point(28, 116);
            Controls.Add(pathLabel);

            pathBox = new TextBox();
            pathBox.Location = new Point(28, 138);
            pathBox.Width = 466;
            pathBox.Text = string.IsNullOrEmpty(options.Dir) ? Program.DefaultDir : options.Dir;
            pathBox.BackColor = FieldBg;
            pathBox.ForeColor = TextColor;
            pathBox.BorderStyle = BorderStyle.FixedSingle;
            Controls.Add(pathBox);

            browseButton = new Button();
            browseButton.Text = L.Browse;
            browseButton.Location = new Point(504, 136);
            browseButton.Size = new Size(108, 27);
            browseButton.FlatStyle = FlatStyle.Flat;
            browseButton.FlatAppearance.BorderColor = Color.FromArgb(80, 48, 52);
            browseButton.BackColor = FieldBg;
            browseButton.ForeColor = TextColor;
            browseButton.Cursor = Cursors.Hand;
            browseButton.Click += OnBrowse;
            Controls.Add(browseButton);

            shortcutsCheck = NewCheckBox(L.Shortcuts, 184, true);
            registerCheck = NewCheckBox(L.Register, 212, true);
            launchCheck = NewCheckBox(L.Launch, 240, true);

            Label info = new Label();
            info.Text = L.Info;
            info.ForeColor = Muted;
            info.Location = new Point(28, 282);
            info.Size = new Size(584, 90);
            Controls.Add(info);

            string webViewVersion = Installer.GetWebView2Version();
            Label webView = new Label();
            webView.AutoSize = false;
            webView.Location = new Point(28, 382);
            webView.Size = new Size(584, 20);
            if (!string.IsNullOrEmpty(webViewVersion))
            {
                webView.Text = L.WebViewOk + " " + webViewVersion;
                webView.ForeColor = Color.FromArgb(120, 190, 130);
            }
            else
            {
                webView.Text = L.WebViewMissing;
                webView.ForeColor = Color.FromArgb(232, 158, 92);
            }
            Controls.Add(webView);

            if (string.IsNullOrEmpty(webViewVersion))
            {
                LinkLabel download = new LinkLabel();
                download.Text = L.WebViewDownload;
                download.LinkColor = Color.FromArgb(238, 150, 160);
                download.ActiveLinkColor = Color.White;
                download.AutoSize = true;
                download.Location = new Point(28, 404);
                download.LinkClicked += delegate
                {
                    try { Process.Start(Program.WebView2Url); }
                    catch (Exception ex) { Installer.Log("webview2 link: " + ex.Message); }
                };
                Controls.Add(download);
            }

            progress = new ProgressBar();
            progress.Location = new Point(28, 440);
            progress.Size = new Size(584, 8);
            progress.Style = ProgressBarStyle.Marquee;
            progress.MarqueeAnimationSpeed = 24;
            progress.Visible = false;
            Controls.Add(progress);

            statusLabel = new Label();
            statusLabel.Text = "";
            statusLabel.AutoSize = false;
            statusLabel.Location = new Point(28, 452);
            statusLabel.Size = new Size(584, 20);
            statusLabel.ForeColor = Muted;
            Controls.Add(statusLabel);

            installButton = new Button();
            installButton.Text = L.Install;
            installButton.Location = new Point(430, 484);
            installButton.Size = new Size(182, 40);
            installButton.FlatStyle = FlatStyle.Flat;
            installButton.FlatAppearance.BorderSize = 0;
            installButton.BackColor = Accent;
            installButton.ForeColor = Color.White;
            installButton.Font = new Font("Segoe UI", 10F, FontStyle.Bold, GraphicsUnit.Point);
            installButton.Cursor = Cursors.Hand;
            installButton.Click += OnInstall;
            Controls.Add(installButton);

            cancelButton = new Button();
            cancelButton.Text = L.Cancel;
            cancelButton.Location = new Point(326, 484);
            cancelButton.Size = new Size(96, 40);
            cancelButton.FlatStyle = FlatStyle.Flat;
            cancelButton.FlatAppearance.BorderColor = Color.FromArgb(80, 48, 52);
            cancelButton.BackColor = FieldBg;
            cancelButton.ForeColor = TextColor;
            cancelButton.Cursor = Cursors.Hand;
            cancelButton.Click += delegate { Close(); };
            Controls.Add(cancelButton);

            AcceptButton = installButton;
            CancelButton = cancelButton;

            FormClosing += OnFormClosing;
            Shown += delegate { pathBox.Focus(); pathBox.SelectAll(); };
        }

        private CheckBox NewCheckBox(string text, int y, bool isChecked)
        {
            CheckBox box = new CheckBox();
            box.Text = text;
            box.Location = new Point(28, y);
            box.AutoSize = true;
            box.Checked = isChecked;
            box.ForeColor = TextColor;
            box.Cursor = Cursors.Hand;
            Controls.Add(box);
            return box;
        }

        private void OnBrowse(object sender, EventArgs e)
        {
            using (FolderBrowserDialog dialog = new FolderBrowserDialog())
            {
                dialog.Description = L.PathLabel;
                dialog.ShowNewFolderButton = true;
                string current = pathBox.Text.Trim();
                if (Directory.Exists(current)) dialog.SelectedPath = current;
                if (dialog.ShowDialog(this) == DialogResult.OK) pathBox.Text = dialog.SelectedPath;
            }
        }

        private void OnInstall(object sender, EventArgs e)
        {
            string dir = pathBox.Text.Trim().Trim('"');
            if (dir.Length == 0)
            {
                MessageBox.Show(this, L.PathEmpty, L.AppName, MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            try
            {
                dir = Path.GetFullPath(dir);
            }
            catch
            {
                MessageBox.Show(this, L.PathEmpty, L.AppName, MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            string root = Path.GetPathRoot(dir);
            if (!string.IsNullOrEmpty(root) &&
                string.Equals(dir.TrimEnd(Path.DirectorySeparatorChar), root.TrimEnd(Path.DirectorySeparatorChar), StringComparison.OrdinalIgnoreCase))
            {
                MessageBox.Show(this, L.PathRoot, L.AppName, MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            if (!Installer.CanWriteTo(dir))
            {
                MessageBox.Show(this, L.CannotWrite, L.AppName, MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            bool looksInstalled = File.Exists(Path.Combine(dir, "DePLay.exe")) ||
                                  File.Exists(Path.Combine(dir, "Uninstall.exe"));
            if (Directory.Exists(dir) && !looksInstalled && Directory.GetFileSystemEntries(dir).Length > 0)
            {
                DialogResult answer = MessageBox.Show(
                    this,
                    L.NonEmptyFolder,
                    L.AppName,
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Question,
                    MessageBoxDefaultButton.Button2);
                if (answer != DialogResult.Yes) return;
            }

            SetBusy(true);
            bool succeeded = false;
            try
            {
                Installer.Install(dir, registerCheck.Checked, shortcutsCheck.Checked, SetStatus);
                succeeded = true;
                InstallSucceeded = true;
                InstallDir = dir;
                LaunchRequested = launchCheck.Checked;
                SetStatus(L.Done);
                MessageBox.Show(this, L.SuccessNote, L.SuccessTitle, MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (UnauthorizedAccessException)
            {
                SetStatus(L.Failed);
                MessageBox.Show(this, L.CannotWrite, L.ErrorTitle, MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            catch (Exception ex)
            {
                Installer.Log("install failed: " + ex);
                SetStatus(L.Failed);
                MessageBox.Show(this, ex.Message, L.ErrorTitle, MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                SetBusy(false);
            }

            if (succeeded) Close();
        }

        private void SetBusy(bool value)
        {
            busy = value;
            progress.Visible = value;
            pathBox.Enabled = !value;
            browseButton.Enabled = !value;
            shortcutsCheck.Enabled = !value;
            registerCheck.Enabled = !value;
            launchCheck.Enabled = !value;
            installButton.Enabled = !value;
            cancelButton.Enabled = !value;
            Cursor = value ? Cursors.WaitCursor : Cursors.Default;
            if (!value) statusLabel.Text = "";
        }

        private void SetStatus(string text)
        {
            statusLabel.Text = text;
            Installer.Log(text);
            statusLabel.Update();
        }

        private void OnFormClosing(object sender, FormClosingEventArgs e)
        {
            if (busy) e.Cancel = true;
        }
    }

    internal static class Installer
    {
        internal static void Install(string targetDir, bool register, bool shortcuts, Action<string> status)
        {
            if (status == null) status = delegate { };

            string self = Path.GetFullPath(Application.ExecutablePath);
            targetDir = Path.GetFullPath(targetDir);

            EnsurePayload();

            if (!CanWriteTo(targetDir))
                throw new UnauthorizedAccessException(L.CannotWrite);

            status(L.Preparing);
            Directory.CreateDirectory(targetDir);

            status(L.ClosingApp);
            StopRunningApp();

            status(L.Copying);
            ClearDirectory(targetDir, self);
            ExtractPayload(targetDir);

            string uninstaller = Path.Combine(targetDir, "Uninstall.exe");
            if (!string.Equals(self, uninstaller, StringComparison.OrdinalIgnoreCase))
                File.Copy(self, uninstaller, true);

            if (register)
            {
                status(L.Registering);
                RegistryInstall(targetDir);
            }

            if (shortcuts)
            {
                status(L.CreatingShortcuts);
                ShortcutsCreate(targetDir);
            }

            WriteUninstallEntry(targetDir);
            Log("installed: " + targetDir + "; register=" + register + "; shortcuts=" + shortcuts);
        }

        internal static void Uninstall(string dir, Action<string> status)
        {
            if (status == null) status = delegate { };

            dir = Path.GetFullPath(dir);
            string current = Path.GetFullPath(Application.ExecutablePath);

            status(L.ClosingApp);
            StopRunningApp();

            status(L.RemovingRegistry);
            RegistryUninstallAll();

            status(L.RemovingShortcuts);
            ShortcutsRemove();

            status(L.RemovingFiles);
            if (Directory.Exists(dir))
            {
                foreach (string file in Directory.GetFiles(dir))
                {
                    if (string.Equals(file, current, StringComparison.OrdinalIgnoreCase)) continue;
                    try { File.Delete(file); }
                    catch (Exception ex) { Log("delete file failed: " + file + ": " + ex.Message); }
                }
                foreach (string sub in Directory.GetDirectories(dir))
                {
                    try { Directory.Delete(sub, true); }
                    catch (Exception ex) { Log("delete dir failed: " + sub + ": " + ex.Message); }
                }
            }

            try { Directory.Delete(dir, false); }
            catch { }

            ScheduleCleanup(dir, current);
            Log("uninstalled: " + dir);
        }

        internal static string ResolveUninstallDir(string requestedDir)
        {
            string registered = ReadInstallLocation();

            if (!string.IsNullOrEmpty(requestedDir))
            {
                string requested = Path.GetFullPath(requestedDir);
                if (Directory.Exists(requested) || !string.IsNullOrEmpty(registered)) return requested;
                return null;
            }

            string exe = Path.GetFileName(Application.ExecutablePath);
            if (string.Equals(exe, "Uninstall.exe", StringComparison.OrdinalIgnoreCase))
                return Path.GetDirectoryName(Path.GetFullPath(Application.ExecutablePath));

            if (!string.IsNullOrEmpty(registered) && Directory.Exists(registered))
                return registered;

            return null;
        }

        internal static string ReadInstallLocation()
        {
            try
            {
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(
                    @"Software\Microsoft\Windows\CurrentVersion\Uninstall\DePLay"))
                {
                    if (key == null) return null;
                    object value = key.GetValue("InstallLocation");
                    return value == null ? null : Convert.ToString(value);
                }
            }
            catch
            {
                return null;
            }
        }

        internal static bool CanWriteTo(string dir)
        {
            try
            {
                if (File.Exists(dir)) return false;
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                string probe = Path.Combine(dir, ".deplay-write-test-" + Guid.NewGuid().ToString("N") + ".tmp");
                File.WriteAllText(probe, "test");
                File.Delete(probe);
                return true;
            }
            catch
            {
                return false;
            }
        }

        internal static void Launch(string dir)
        {
            try
            {
                string exe = Path.Combine(dir, "DePLay.exe");
                if (!File.Exists(exe)) exe = Path.Combine(dir, "Uninstall.exe");
                if (!File.Exists(exe)) return;

                ProcessStartInfo info = new ProcessStartInfo();
                info.FileName = Path.Combine(dir, "DePLay.exe");
                info.WorkingDirectory = dir;
                info.UseShellExecute = true;
                Process.Start(info);
            }
            catch (Exception ex)
            {
                Log("launch failed: " + ex.Message);
            }
        }

        internal static string GetWebView2Version()
        {
            string[] paths = new string[]
            {
                @"SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
                @"SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
            };

            RegistryHive[] hives = new RegistryHive[] { RegistryHive.LocalMachine, RegistryHive.CurrentUser };
            foreach (RegistryHive hive in hives)
            {
                foreach (RegistryView view in new RegistryView[] { RegistryView.Registry64, RegistryView.Registry32 })
                {
                    try
                    {
                        using (RegistryKey baseKey = RegistryKey.OpenBaseKey(hive, view))
                        {
                            foreach (string path in paths)
                            {
                                using (RegistryKey key = baseKey.OpenSubKey(path))
                                {
                                    if (key == null) continue;
                                    object pv = key.GetValue("pv");
                                    if (pv == null) continue;
                                    string version = Convert.ToString(pv);
                                    if (!string.IsNullOrEmpty(version)) return version;
                                }
                            }
                        }
                    }
                    catch
                    {
                        // Try the next registry view.
                    }
                }
            }
            return null;
        }

        internal static void Log(string message)
        {
            try
            {
                string folder = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "DePLay");
                Directory.CreateDirectory(folder);
                string line = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + "  [setup] " + message + "\r\n";
                File.AppendAllText(Path.Combine(folder, "setup.log"), line, new UTF8Encoding(true));
            }
            catch
            {
                // Logging must never break the installation.
            }
        }

        private static void EnsurePayload()
        {
            using (Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(Program.PayloadResource))
            {
                if (stream == null)
                    throw new InvalidOperationException("Installer payload is missing. Rebuild DePLay-Setup.exe with build-installer.ps1.");
            }
        }

        private static void ClearDirectory(string dir, string currentExe)
        {
            foreach (string file in Directory.GetFiles(dir))
            {
                if (string.Equals(Path.GetFullPath(file), currentExe, StringComparison.OrdinalIgnoreCase)) continue;
                File.Delete(file);
            }
            foreach (string sub in Directory.GetDirectories(dir))
                Directory.Delete(sub, true);
        }

        private static void ExtractPayload(string targetDir)
        {
            string root = targetDir.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;

            using (Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(Program.PayloadResource))
            {
                if (stream == null)
                    throw new InvalidOperationException("Installer payload is missing.");

                using (ZipArchive archive = new ZipArchive(stream, ZipArchiveMode.Read))
                {
                    foreach (ZipArchiveEntry entry in archive.Entries)
                    {
                        string relative = entry.FullName.Replace('/', Path.DirectorySeparatorChar);
                        if (relative.Length == 0) continue;
                        if (relative.EndsWith(Path.DirectorySeparatorChar.ToString(), StringComparison.Ordinal)) continue;

                        string full = Path.GetFullPath(Path.Combine(root, relative));
                        if (!full.StartsWith(root, StringComparison.OrdinalIgnoreCase))
                            throw new InvalidDataException("Invalid path in installer payload: " + entry.FullName);

                        string parent = Path.GetDirectoryName(full);
                        if (!string.IsNullOrEmpty(parent) && !Directory.Exists(parent))
                            Directory.CreateDirectory(parent);

                        using (Stream source = entry.Open())
                        using (FileStream target = new FileStream(full, FileMode.Create, FileAccess.Write, FileShare.None))
                        {
                            source.CopyTo(target);
                        }
                    }
                }
            }
        }

        private static void StopRunningApp()
        {
            Process[] processes = Process.GetProcessesByName("DePLay");
            foreach (Process process in processes)
            {
                try
                {
                    if (process.CloseMainWindow())
                    {
                        if (!process.WaitForExit(4000))
                        {
                            process.Kill();
                            process.WaitForExit(3000);
                        }
                    }
                    else
                    {
                        process.Kill();
                        process.WaitForExit(3000);
                    }
                }
                catch (Exception ex)
                {
                    Log("close DePLay failed: " + ex.Message);
                }
                finally
                {
                    process.Dispose();
                }
            }
        }

        private static void RegistryInstall(string dir)
        {
            string exe = Path.Combine(dir, "DePLay.exe");
            string command = "\"" + exe + "\" \"%1\"";
            string icon = "\"" + exe + "\",0";

            using (RegistryKey classes = Registry.CurrentUser.CreateSubKey(@"Software\Classes"))
            {
                using (RegistryKey prog = classes.CreateSubKey(Program.ProgId))
                {
                    prog.SetValue(null, "Видео DePLay");
                    prog.SetValue("FriendlyTypeName", "Видео DePLay");
                    using (RegistryKey iconKey = prog.CreateSubKey("DefaultIcon"))
                        iconKey.SetValue(null, icon);
                    using (RegistryKey cmd = prog.CreateSubKey(@"shell\open\command"))
                        cmd.SetValue(null, command);
                }

                using (RegistryKey app = classes.CreateSubKey(@"Applications\DePLay.exe"))
                {
                    app.SetValue("FriendlyAppName", "DePLay");
                    app.SetValue("ApplicationName", "DePLay");
                    using (RegistryKey iconKey = app.CreateSubKey("DefaultIcon"))
                        iconKey.SetValue(null, icon);
                    using (RegistryKey cmd = app.CreateSubKey(@"shell\open\command"))
                        cmd.SetValue(null, command);
                    using (RegistryKey types = app.CreateSubKey("SupportedTypes"))
                    {
                        foreach (string extension in Program.Extensions)
                            types.SetValue(extension, "");
                    }
                }

                foreach (string extension in Program.Extensions)
                {
                    using (RegistryKey openWith = classes.CreateSubKey(extension + @"\OpenWithProgids"))
                        openWith.SetValue(Program.ProgId, new byte[0], RegistryValueKind.Binary);
                }
            }

            using (RegistryKey capabilities = Registry.CurrentUser.CreateSubKey(@"Software\DePLay\Capabilities"))
            {
                capabilities.SetValue("ApplicationName", "DePLay");
                capabilities.SetValue("ApplicationDescription", "Локальный медиаплеер DePLay");
                capabilities.SetValue("ApplicationIcon", icon);
                using (RegistryKey associations = capabilities.CreateSubKey("FileAssociations"))
                {
                    foreach (string extension in Program.Extensions)
                        associations.SetValue(extension, Program.ProgId);
                }
            }

            using (RegistryKey registered = Registry.CurrentUser.CreateSubKey(@"Software\RegisteredApplications"))
                registered.SetValue("DePLay", @"Software\DePLay\Capabilities");

            using (RegistryKey appPaths = Registry.CurrentUser.CreateSubKey(
                @"Software\Microsoft\Windows\CurrentVersion\App Paths\DePLay.exe"))
            {
                appPaths.SetValue(null, exe);
                appPaths.SetValue("Path", dir);
            }
        }

        private static void RegistryUninstallAll()
        {
            string classes = @"Software\Classes";

            foreach (string extension in Program.Extensions)
            {
                try
                {
                    using (RegistryKey key = Registry.CurrentUser.OpenSubKey(
                        classes + "\\" + extension + @"\OpenWithProgids", true))
                    {
                        if (key != null) key.DeleteValue(Program.ProgId, false);
                    }
                }
                catch (Exception ex) { Log("registry OpenWithProgids: " + ex.Message); }
            }

            string[] keys = new string[]
            {
                classes + @"\DePLay.Video",
                classes + @"\Applications\DePLay.exe",
                @"Software\DePLay",
                @"Software\Microsoft\Windows\CurrentVersion\App Paths\DePLay.exe",
                @"Software\Microsoft\Windows\CurrentVersion\Uninstall\DePLay"
            };

            foreach (string path in keys)
            {
                try
                {
                    Registry.CurrentUser.DeleteSubKeyTree(path, false);
                }
                catch (Exception ex) { Log("registry delete " + path + ": " + ex.Message); }
            }

            try
            {
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(@"Software\RegisteredApplications", true))
                {
                    if (key != null) key.DeleteValue("DePLay", false);
                }
            }
            catch (Exception ex) { Log("registry RegisteredApplications: " + ex.Message); }
        }

        private static void WriteUninstallEntry(string dir)
        {
            string exe = Path.Combine(dir, "DePLay.exe");
            string uninstaller = Path.Combine(dir, "Uninstall.exe");

            long size = 0;
            try
            {
                foreach (string file in Directory.GetFiles(dir, "*", SearchOption.AllDirectories))
                {
                    try { size += new FileInfo(file).Length; }
                    catch { }
                }
            }
            catch { }

            using (RegistryKey key = Registry.CurrentUser.CreateSubKey(
                @"Software\Microsoft\Windows\CurrentVersion\Uninstall\DePLay"))
            {
                key.SetValue("DisplayName", "DePLay");
                key.SetValue("DisplayVersion", Program.Version);
                key.SetValue("Publisher", "DePLay");
                key.SetValue("InstallLocation", dir);
                key.SetValue("DisplayIcon", exe + ",0");
                key.SetValue("UninstallString", "\"" + uninstaller + "\" /uninstall");
                key.SetValue("QuietUninstallString", "\"" + uninstaller + "\" /uninstall /S");
                key.SetValue("NoModify", 1, RegistryValueKind.DWord);
                key.SetValue("NoRepair", 1, RegistryValueKind.DWord);
                key.SetValue("EstimatedSize", (int)Math.Max(1, size / 1024), RegistryValueKind.DWord);
                key.SetValue("InstallDate", DateTime.Now.ToString("yyyyMMdd"));
                key.SetValue("Comments", "DePLay — локальный медиаплеер");
            }
        }

        private static void ShortcutsCreate(string dir)
        {
            string exe = Path.Combine(dir, "DePLay.exe");

            string programs = Environment.GetFolderPath(Environment.SpecialFolder.Programs);
            if (!string.IsNullOrEmpty(programs))
            {
                CreateShortcut(Path.Combine(programs, "DePLay.lnk"), exe, dir, "DePLay — локальный медиаплеер");
                CreateShortcut(Path.Combine(programs, "Удалить DePLay.lnk"), Path.Combine(dir, "Uninstall.exe"), dir, "Удалить DePLay", "/uninstall");
            }

            string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
            if (!string.IsNullOrEmpty(desktop))
                CreateShortcut(Path.Combine(desktop, "DePLay.lnk"), exe, dir, "DePLay — локальный медиаплеер");
        }

        private static void ShortcutsRemove()
        {
            string programs = Environment.GetFolderPath(Environment.SpecialFolder.Programs);
            string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);

            foreach (string path in new string[]
            {
                string.IsNullOrEmpty(programs) ? null : Path.Combine(programs, "DePLay.lnk"),
                string.IsNullOrEmpty(programs) ? null : Path.Combine(programs, "Удалить DePLay.lnk"),
                string.IsNullOrEmpty(desktop) ? null : Path.Combine(desktop, "DePLay.lnk")
            })
            {
                if (string.IsNullOrEmpty(path)) continue;
                try
                {
                    if (File.Exists(path)) File.Delete(path);
                }
                catch (Exception ex) { Log("delete shortcut failed: " + path + ": " + ex.Message); }
            }
        }

        private static void CreateShortcut(string shortcutPath, string targetPath, string workingDir, string description)
        {
            CreateShortcut(shortcutPath, targetPath, workingDir, description, null);
        }

        private static void CreateShortcut(string shortcutPath, string targetPath, string workingDir, string description, string arguments)
        {
            object shell = null;
            object shortcut = null;
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType == null) return;

                shell = Activator.CreateInstance(shellType);
                shortcut = shellType.InvokeMember(
                    "CreateShortcut",
                    BindingFlags.InvokeMethod,
                    null,
                    shell,
                    new object[] { shortcutPath });

                Type shortcutType = shortcut.GetType();
                shortcutType.InvokeMember("TargetPath", BindingFlags.SetProperty, null, shortcut, new object[] { targetPath });
                shortcutType.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, shortcut, new object[] { workingDir });
                shortcutType.InvokeMember("IconLocation", BindingFlags.SetProperty, null, shortcut, new object[] { targetPath + ",0" });
                shortcutType.InvokeMember("Description", BindingFlags.SetProperty, null, shortcut, new object[] { description });
                if (!string.IsNullOrEmpty(arguments))
                    shortcutType.InvokeMember("Arguments", BindingFlags.SetProperty, null, shortcut, new object[] { arguments });
                shortcutType.InvokeMember("Save", BindingFlags.InvokeMethod, null, shortcut, null);
            }
            catch (Exception ex)
            {
                Log("shortcut failed: " + shortcutPath + ": " + ex.Message);
            }
            finally
            {
                if (shortcut != null && System.Runtime.InteropServices.Marshal.IsComObject(shortcut))
                    System.Runtime.InteropServices.Marshal.ReleaseComObject(shortcut);
                if (shell != null && System.Runtime.InteropServices.Marshal.IsComObject(shell))
                    System.Runtime.InteropServices.Marshal.ReleaseComObject(shell);
            }
        }

        private static void ScheduleCleanup(string dir, string currentExe)
        {
            try
            {
                string target = Path.GetFullPath(dir)
                    .TrimEnd(Path.DirectorySeparatorChar);
                if (string.IsNullOrEmpty(target)) return;

                string command = "ping 127.0.0.1 -n 3 >nul";
                if (IsInside(dir, currentExe))
                    command += " & del /f /q \"" + currentExe + "\"";
                command += " & rmdir /s /q \"" + target + "\"";

                ProcessStartInfo info = new ProcessStartInfo();
                info.FileName = "cmd.exe";
                info.Arguments = "/c " + command;
                info.UseShellExecute = false;
                info.CreateNoWindow = true;
                info.WindowStyle = ProcessWindowStyle.Hidden;
                info.WorkingDirectory = Path.GetTempPath();
                Process.Start(info);
            }
            catch (Exception ex)
            {
                Log("cleanup scheduling failed: " + ex.Message);
            }
        }

        private static bool IsInside(string dir, string path)
        {
            string root = Path.GetFullPath(dir).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
            string full = Path.GetFullPath(path);
            return full.StartsWith(root, StringComparison.OrdinalIgnoreCase);
        }
    }
}
