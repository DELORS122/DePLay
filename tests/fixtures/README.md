# Test media fixtures

`tests/fixtures/` contains the sources and generator for the short clips used
to exercise playback, container parsing and multi-track audio handling.

The generated clips are **not committed** (see `.gitignore`): they can be
recreated in a couple of seconds and would otherwise bloat the repository.

## Structure

```text
tests/fixtures/
├── fake-streamlink.cs        Fake streamlink.exe source for integration tests
├── generate-media.py         Generator (Python + FFmpeg)
├── generate-media.sh         Generator (Bash + FFmpeg)
├── README.md                 This file
└── generated/                Created by the generator (ignored by Git)
    ├── sample_video.mp4      H.264 + stereo AAC
    ├── sample_video.mov      H.264 + stereo AAC
    ├── multi_audio_4x_aac.mov   H.264 + 4 AAC tracks (Microphone/Discord/Windows/Apps)
    ├── multi_audio_4x_pcm.mov   H.264 + 4 PCM s16le tracks
    ├── multi_audio_4x_mp4.mp4   H.264 + 4 AAC tracks
    └── audio_only.m4a        AAC audio only
```

Each clip is 3 seconds long, 640×360 at 25 fps, and small enough for automated
tests. Audio tracks use different sine frequencies so it is easy to hear which
track is playing.

## Generate

```bash
# Python
python tests/fixtures/generate-media.py --force

# Bash (Linux/macOS/WSL)
bash tests/fixtures/generate-media.sh --force
```

Both scripts need `ffmpeg` on `PATH`. Use `--list` with the Python script to
see the exact FFmpeg commands without running them.

`tests/run-tests.ps1` runs the Python generator automatically when FFmpeg and
Python are available (FFmpeg is taken from the embedded Streamlink bundle). If
the fixtures are missing, the MP4/MOV test reports that and is skipped.

Audio tracks use ISO 639-2/B language codes in the container (`ger`, not
`deu`); FFmpeg's MOV muxer silently drops codes it cannot map. Track names are
written both as `handler_name` (which QuickTime/FFmpeg preserve) and `title`.
DePLay reads `udta/name` first and then `hdlr`, so the names appear even in
MOV files.

## Manual checks

Open the generated files in DePLay and verify:

1. `multi_audio_4x_pcm.mov` shows four tracks and each one plays (PCM is
   converted to WAV on the fly by `app.js`).
2. `multi_audio_4x_aac.mov` and `multi_audio_4x_mp4.mp4` show four AAC
   tracks with names and languages.
3. Toggling tracks does not desynchronise them from the video.
4. `sample_video.mov` and `sample_video.mp4` behave identically.
