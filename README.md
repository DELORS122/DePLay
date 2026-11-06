# DePLay

A local media player for video, photos, and sound — a standalone Windows application: files are opened from disk and are never uploaded anywhere.

## Features

- **Video:** playback, seeking ±2 seconds, frame-by-frame stepping, speed 0.1×–3×, repeat, volume, mute, PiP, and fullscreen mode.
- **Timeline:** buffer, progress, slider dragging, and frame preview on hover.
- **Embedded MP4 audio:** the player parses the container and shows all audio tracks in the file — with language, channel, sample rate, and codec. Supported tracks are enabled automatically all at once; the **"Disable all" / "Enable all"** button toggles them with a single click.
- **Track names:** taken from MP4 metadata (`trak/udta/name`, then `hdlr.name`). If there is no name in the file, the track language is shown, and if that is absent — "Track N".
- **External audio:** MP3, WAV, M4A, AAC, OGG, FLAC, and OPUS are added to the video as independent tracks and synchronized with it.
- **Photos:** gallery, zoom with the mouse wheel or buttons, dragging, double-click, "Fit" and "1:1" modes, swipes and pinch on touch screens.
- **Interface:** Russian, English, and German languages, dark-red angular theme, bottom settings panel, drag-and-drop.
- **Auto-hide:** during video playback and photo viewing, the bottom panels, HUD, and cursor hide after inactivity, like on YouTube. Mouse movement brings back the controls; when paused, the panels stay in place.

### Downloading the installer

The DePLay installer is available **via GitHub Releases**:

1. Go to the GitHub Releases page of this repository.
2. Download `DePLay-Setup.exe`.
3. Run the installer — the application will be installed to `%LOCALAPPDATA%\Programs\DePLay`.

After installation, the application launches from the Start menu or by double-clicking the executable file. Initial registration of file types (.mp4, etc.) happens automatically on first launch.

### Launch options

```powershell
.\DePLay.exe
.\DePLay.exe "C:\Videos\movie.mp4"