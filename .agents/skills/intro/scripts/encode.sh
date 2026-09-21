#!/usr/bin/env bash
# Burn captions + narration onto assets/intro-record.mp4 → assets/intro.mp4 (1080p).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
ASSETS="$REPO_ROOT/assets"
INPUT="$ASSETS/intro-record.mp4"
OUT_MP4="$ASSETS/intro.mp4"
OUT_POSTER="$ASSETS/intro-poster.jpg"

if [[ ! -f $INPUT ]]; then
  echo "Missing $INPUT — run: mise run intro:record" >&2
  exit 1
fi

mkdir -p "$ASSETS"
uv run --script "$SCRIPT_DIR/voice.py"

ffmpeg -y -ss 8 -i "$OUT_MP4" -frames:v 1 -update 1 -q:v 3 "$OUT_POSTER"

ls -lh "$OUT_MP4" "$OUT_POSTER"
