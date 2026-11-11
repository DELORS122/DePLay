#!/usr/bin/env python3
"""Generate small FFmpeg fixtures for the DePLay test suite.

Creates a reproducible set of short clips in ``tests/fixtures/generated``:

  sample_video.mp4           H.264 + stereo AAC
  sample_video.mov           H.264 + stereo AAC
  multi_audio_4x_aac.mov     H.264 + four AAC tracks (Microphone/Discord/...)
  multi_audio_4x_pcm.mov     H.264 + four uncompressed PCM (s16le) tracks
  multi_audio_4x_mp4.mp4     H.264 + four AAC tracks
  audio_only.m4a             AAC audio, no video

Requires ``ffmpeg`` on PATH. Run with ``--force`` to overwrite existing files
and ``--list`` to print the plan without generating anything.

    python tests/fixtures/generate-media.py
    python tests/fixtures/generate-media.py --force
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "generated"

# 3 seconds, 640x360, 25 fps - small enough to keep in a temporary folder.
VIDEO = "testsrc2=size=640x360:rate=25:duration=3"
AUDIO_FREQS = [440, 554, 659, 880]
AUDIO_LABELS = ["Microphone", "Discord", "Windows", "Apps"]
# MOV/MP4 store ISO 639-2/B language codes ("ger", not "deu"); FFmpeg's MOV
# muxer silently drops codes it cannot map, so use the /B spelling here.
AUDIO_LANGS = ["eng", "eng", "ger", "rus"]


def lavfi_audio_inputs(tracks: int) -> list[str]:
    """One ``-f lavfi -i sine=...`` input per requested audio track."""
    args: list[str] = []
    for index in range(tracks):
        freq = AUDIO_FREQS[index % len(AUDIO_FREQS)]
        args += ["-f", "lavfi", "-i", f"sine=frequency={freq}:duration=3"]
    return args


def metadata(tracks: int) -> list[str]:
    args: list[str] = []
    for index in range(tracks):
        label = AUDIO_LABELS[index % len(AUDIO_LABELS)]
        lang = AUDIO_LANGS[index % len(AUDIO_LANGS)]
        # handler_name is what QuickTime/FFmpeg actually writes into a MOV
        # track; DePLay reads it as the track name.
        args += [f"-metadata:s:a:{index}", f"handler_name={label}"]
        args += [f"-metadata:s:a:{index}", f"title={label}"]
        args += [f"-metadata:s:a:{index}", f"language={lang}"]
    return args


def command(output: Path, audio_codec: str, tracks: int) -> list[str]:
    # Input 0 is the video source, so audio inputs are numbered 1..tracks.
    args = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-f", "lavfi", "-i", VIDEO]
    args += lavfi_audio_inputs(tracks)
    args += ["-map", "0:v"]
    for index in range(tracks):
        args += ["-map", f"{index + 1}:a"]
    args += ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast"]
    if audio_codec == "aac":
        args += ["-c:a", "aac", "-b:a", "128k"]
    else:
        args += ["-c:a", audio_codec]
    args += metadata(tracks)
    args += ["-shortest", str(output)]
    return args


def plan() -> list[tuple[str, list[str]]]:
    items: list[tuple[str, list[str]]] = []
    items.append(("sample_video.mp4", command(OUTPUT / "sample_video.mp4", "aac", 1)))
    items.append(("sample_video.mov", command(OUTPUT / "sample_video.mov", "aac", 1)))
    items.append(("multi_audio_4x_aac.mov", command(OUTPUT / "multi_audio_4x_aac.mov", "aac", 4)))
    items.append(("multi_audio_4x_pcm.mov", command(OUTPUT / "multi_audio_4x_pcm.mov", "pcm_s16le", 4)))
    items.append(("multi_audio_4x_mp4.mp4", command(OUTPUT / "multi_audio_4x_mp4.mp4", "aac", 4)))
    audio_only = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-f", "lavfi", "-i", "sine=frequency=440:duration=3",
        "-c:a", "aac", "-b:a", "128k", "-metadata:s:a:0", "title=Sample",
        str(OUTPUT / "audio_only.m4a"),
    ]
    items.append(("audio_only.m4a", audio_only))
    return items


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="overwrite existing files")
    parser.add_argument("--list", action="store_true", help="print the plan only")
    args = parser.parse_args()

    items = plan()
    if args.list:
        for name, cmd in items:
            print(f"{name}:")
            print("  " + " ".join(cmd))
        return 0

    if shutil.which("ffmpeg") is None:
        print("ffmpeg was not found on PATH.", file=sys.stderr)
        print("Install FFmpeg (https://ffmpeg.org/download.html) and run this script again.", file=sys.stderr)
        return 1

    OUTPUT.mkdir(parents=True, exist_ok=True)
    failures = 0
    for name, cmd in items:
        target = OUTPUT / name
        if target.exists() and not args.force:
            print(f"skip  {name} (already exists; use --force to rebuild)")
            continue
        print(f"build {name}")
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if result.returncode != 0:
            failures += 1
            print(f"  failed: {result.stderr.strip()}", file=sys.stderr)
        else:
            print(f"  ok ({target.stat().st_size} bytes)")

    if failures:
        print(f"{failures} fixture(s) failed", file=sys.stderr)
        return 1
    print(f"done -> {OUTPUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
