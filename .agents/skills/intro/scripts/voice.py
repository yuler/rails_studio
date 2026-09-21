#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["edge-tts"]
# ///
"""TTS each captions.ass Dialogue line, burn captions, mux narration → assets/intro.mp4."""

from __future__ import annotations

import asyncio
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

import edge_tts

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = Path(
    subprocess.check_output(
        ["git", "-C", str(SCRIPT_DIR), "rev-parse", "--show-toplevel"],
        text=True,
    ).strip()
)
ASSETS = REPO_ROOT / "assets"
ASS_PATH = SCRIPT_DIR / "captions.ass"
WORK_DIR = SCRIPT_DIR.parent / "audio"
VIDEO_IN = ASSETS / "intro-record.mp4"
VIDEO_OUT = ASSETS / "intro.mp4"
DEFAULT_VOICE = os.environ.get("EDGE_TTS_VOICE", "en-US-GuyNeural")


def parse_dialogues(ass_path: Path) -> list[dict[str, str]]:
    lines: list[dict[str, str]] = []
    for raw in ass_path.read_text(encoding="utf-8").splitlines():
        if not raw.startswith("Dialogue:"):
            continue
        payload = raw.split(":", 1)[1].strip()
        parts = payload.split(",", 9)
        if len(parts) < 10:
            raise ValueError(f"Malformed Dialogue line: {raw}")
        text = re.sub(r"\{[^}]*\}", "", parts[9]).replace(r"\N", " ").strip()
        if not text:
            continue
        lines.append({"start": parts[1], "end": parts[2], "text": text})
    return lines


def ass_time_to_ms(stamp: str) -> int:
    hours, minutes, rest = stamp.split(":")
    seconds, centiseconds = rest.split(".")
    return (int(hours) * 3600 + int(minutes) * 60 + int(seconds)) * 1000 + int(centiseconds) * 10


def slug(text: str, *, limit: int = 40) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return (s[:limit].rstrip("-") or "line")


def ffprobe_duration_ms(path: Path) -> int:
    out = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "csv=p=0",
            str(path),
        ],
        text=True,
    ).strip()
    if not out:
        raise RuntimeError(f"no duration: {path}")
    return int(float(out) * 1000)


def valid_clip(path: Path) -> bool:
    if not path.is_file() or path.stat().st_size < 512:
        return False
    try:
        return ffprobe_duration_ms(path) > 50
    except (subprocess.CalledProcessError, ValueError, RuntimeError):
        return False


async def synthesize(text: str, voice: str, out: Path, *, attempts: int = 6) -> None:
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            communicate = edge_tts.Communicate(text, voice)
            await communicate.save(str(out))
            if not valid_clip(out):
                raise RuntimeError("invalid or empty TTS file")
            return
        except Exception as exc:  # noqa: BLE001 — retry transient TTS/network errors
            last_error = exc
            if out.exists():
                out.unlink()
            if attempt == attempts:
                break
            delay = min(2**attempt, 16)
            print(f"  retry {attempt}/{attempts} after {delay}s: {exc}", file=sys.stderr)
            await asyncio.sleep(delay)
    assert last_error is not None
    raise last_error


def decode_wav(src: Path, dest: Path) -> None:
    subprocess.check_call(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(src),
            "-ar",
            "48000",
            "-ac",
            "2",
            "-c:a",
            "pcm_s16le",
            str(dest),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def mux(video: Path, clips: list[tuple[Path, int]], dest: Path) -> None:
    if shutil.which("ffmpeg") is None:
        raise SystemExit("ffmpeg is required")

    duration_s = ffprobe_duration_ms(video) / 1000
    ass = str(ASS_PATH).replace("\\", "/").replace(":", "\\:")
    wavs: list[Path] = []
    cmd: list[str] = ["ffmpeg", "-y", "-i", str(video)]
    for path, _delay in clips:
        wav = path.with_name(f"{path.stem}.wav")
        decode_wav(path, wav)
        wavs.append(wav)
        cmd += ["-i", str(wav)]

    filters: list[str] = [
        f"[0:v]ass={ass},scale=1920:1080:flags=lanczos[vout]",
    ]
    mix_labels: list[str] = []
    for i, (_path, delay) in enumerate(clips, start=1):
        filters.append(f"[{i}:a]adelay={delay}|{delay}:all=1[a{i}]")
        mix_labels.append(f"[a{i}]")

    n = len(clips)
    filters.append(
        f"{''.join(mix_labels)}amix=inputs={n}:duration=longest:dropout_transition=0:normalize=0,"
        f"apad=whole_dur={duration_s:.3f}[aout]"
    )
    cmd += [
        "-filter_complex",
        ";".join(filters),
        "-map",
        "[vout]",
        "-map",
        "[aout]",
        "-c:v",
        "libx264",
        "-preset",
        "slow",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-t",
        f"{duration_s:.3f}",
        "-movflags",
        "+faststart",
        str(dest),
    ]
    try:
        subprocess.check_call(cmd)
    finally:
        for wav in wavs:
            if wav.exists():
                wav.unlink()


async def main() -> int:
    if not ASS_PATH.is_file():
        print(f"Missing captions: {ASS_PATH}", file=sys.stderr)
        return 1
    if not VIDEO_IN.is_file():
        print(f"Missing {VIDEO_IN} — run: mise run intro:record", file=sys.stderr)
        return 1

    dialogues = parse_dialogues(ASS_PATH)
    if not dialogues:
        print(f"No Dialogue lines in {ASS_PATH}", file=sys.stderr)
        return 1

    WORK_DIR.mkdir(parents=True, exist_ok=True)
    for old in WORK_DIR.glob("*.mp3"):
        old.unlink()
    for old in WORK_DIR.glob("*.wav"):
        old.unlink()
    manifest_path = WORK_DIR / "manifest.json"
    for extra in (manifest_path, WORK_DIR / "timeline.txt"):
        if extra.exists():
            extra.unlink()

    voice = DEFAULT_VOICE
    print(f"Voice: {voice}")
    print(f"Captions: {ASS_PATH}")
    print(f"Video: {VIDEO_IN}")
    print()

    manifest: list[dict[str, str | int]] = []
    clips: list[tuple[Path, int]] = []
    for i, line in enumerate(dialogues, start=1):
        start_tag = line["start"].replace(":", "-")
        end_tag = line["end"].replace(":", "-")
        name = f"{i:02d}_{start_tag}_{end_tag}_{slug(line['text'])}.mp3"
        dest = WORK_DIR / name
        delay = ass_time_to_ms(line["start"])
        print(f"[{line['start']}–{line['end']}] {line['text']}")
        await synthesize(line["text"], voice, dest)
        clips.append((dest, delay))
        manifest.append({**line, "file": name, "delay_ms": delay})

    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    timeline = ["# start    end      file"]
    for item in manifest:
        timeline.append(f"{item['start']}  {item['end']}  {item['file']}")
    (WORK_DIR / "timeline.txt").write_text("\n".join(timeline) + "\n", encoding="utf-8")
    print()
    print(f"Wrote {len(clips)} clips + manifest.json + timeline.txt → {WORK_DIR}")
    print(f"Encoding captions + narration onto {VIDEO_IN.name} → {VIDEO_OUT}")
    ASSETS.mkdir(parents=True, exist_ok=True)
    mux(VIDEO_IN, clips, VIDEO_OUT)
    print(f"Wrote {VIDEO_OUT} ({ffprobe_duration_ms(VIDEO_OUT) / 1000:.1f}s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
