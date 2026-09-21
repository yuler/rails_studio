#!/usr/bin/env bash
# Record the Rails Studio README intro (Omarchy fullscreen + Puppeteer walkthrough).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
OUT_MP4="$REPO_ROOT/assets/intro-record.mp4"
STUDIO_URL="${STUDIO_URL:-http://localhost:3000/rails_studio}"
PROFILE="${CHROME_PROFILE:-/tmp/rails-studio-demo-profile}"
DEMO_WS="${DEMO_WS:-9}"
CDP_PORT="${CDP_PORT:-9222}"
export CDP_PORT
SKIP_RECORD="${SKIP_RECORD:-0}"
STEPS_LOG="${STEPS_LOG:-/tmp/rails-studio-demo-steps.log}"
RECORDING_PATH_FILE="${RECORDING_PATH_FILE:-/tmp/rails-studio-demo-recording-path.txt}"
CHROME_LOG="${CHROME_LOG:-/tmp/rails-studio-demo-chrome.log}"
TOAST_SHOT="${TOAST_SHOT:-/tmp/rails-studio-fs-toast.png}"

hypr_eval() {
  hyprctl eval "$1" >/dev/null
}

toast_visible() {
  grim "$TOAST_SHOT"
  local ocr
  ocr=$(tesseract "$TOAST_SHOT" stdout --psm 6 2>/dev/null || true)
  echo "$ocr" | grep -qiE 'full screen|fullscreen|hold Esc|press and hold'
}

wait_until_fullscreen_toast_gone() {
  echo "Waiting for Chrome fullscreen toast to appear…"
  local i seen=0 clean=0
  for i in $(seq 1 48); do
    if toast_visible; then
      seen=1
      echo "Fullscreen toast is on screen; waiting for it to disappear…"
      break
    fi
    sleep 0.25
  done
  if [[ $seen -eq 0 ]]; then
    echo "Fullscreen toast not detected; waiting extra so it is not captured." >&2
  fi
  for i in $(seq 1 80); do
    if toast_visible; then
      clean=0
    else
      clean=$((clean + 1))
      if [[ $clean -ge 3 ]]; then
        echo "Fullscreen toast is gone."
        sleep 1
        return 0
      fi
    fi
    sleep 0.25
  done
  echo "Fullscreen toast still visible after ~20s; recording anyway." >&2
}

if ! command -v hyprctl >/dev/null || [[ -z ${HYPRLAND_INSTANCE_SIGNATURE:-} ]]; then
  echo "Need an Omarchy/Hyprland session (hyprctl + HYPRLAND_INSTANCE_SIGNATURE)." >&2
  exit 1
fi

if ! curl -sf -o /dev/null "$STUDIO_URL"; then
  echo "Rails Studio is not reachable at $STUDIO_URL. Start it with: mise run dev" >&2
  exit 1
fi

if [[ ! -d "$SCRIPT_DIR/node_modules/puppeteer-core" ]]; then
  echo "Installing puppeteer-core…"
  (cd "$SCRIPT_DIR" && npm install --silent)
fi

PREV_WS=$(hyprctl activeworkspace -j | jq -r '.id')
RECORDING_STARTED=0

cleanup() {
  local status=$?
  set +e
  if [[ $RECORDING_STARTED -eq 1 ]]; then
    omarchy capture screenrecording --stop-recording >/dev/null 2>&1
  fi
  pkill -f "user-data-dir=${PROFILE}" >/dev/null 2>&1
  hypr_eval "hl.dispatch(hl.dsp.focus({ workspace = \"${PREV_WS}\" }))"
  exit "$status"
}
trap cleanup EXIT

rm -rf "$PROFILE"
mkdir -p "$PROFILE"

hypr_eval "hl.dispatch(hl.dsp.focus({ workspace = \"${DEMO_WS}\" }))"
sleep 0.25

omarchy launch webapp "$STUDIO_URL" \
  --user-data-dir="$PROFILE" \
  --remote-debugging-port="$CDP_PORT" \
  --remote-allow-origins='*' \
  --no-first-run \
  --no-default-browser-check \
  --disable-session-crashed-bubble \
  --hide-crash-restore-bubble \
  >"$CHROME_LOG" 2>&1 &
disown $! 2>/dev/null || true

for i in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:${CDP_PORT}/json/version" >/dev/null; then
    break
  fi
  if [[ "$i" -eq 60 ]]; then
    echo "Chrome CDP did not start on port $CDP_PORT" >&2
    cat "$CHROME_LOG" 2>/dev/null || true
    exit 1
  fi
  sleep 0.2
done

for i in $(seq 1 50); do
  ADDR=$(hyprctl clients -j | jq -r --argjson ws "$DEMO_WS" '
    .[] | select((.class | test("chrome"; "i")) and .workspace.id == $ws) | .address
  ' | awk 'NR==1{print; exit}')
  if [[ -n ${ADDR} && ${ADDR} != null ]]; then
    hyprctl eval "hl.dispatch(hl.dsp.focus({ window = \"address:${ADDR}\" }))" >/dev/null
    hyprctl eval 'hl.dispatch(hl.dsp.window.fullscreen({ mode = "fullscreen" }))' >/dev/null
    break
  fi
  sleep 0.2
done

(
  cd "$SCRIPT_DIR"
  node --input-type=module -e '
import puppeteer from "puppeteer-core";
const port = process.env.CDP_PORT || "9222";
const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${port}`, defaultViewport: null });
const pages = await browser.pages();
const page = pages[pages.length - 1];
await page.waitForFunction(
  () => [...document.querySelectorAll("aside button span")].some((el) => el.textContent?.trim() === "articles"),
  { timeout: 25000 }
);
browser.disconnect();
'
)

if [[ "$SKIP_RECORD" != "1" ]]; then
  wait_until_fullscreen_toast_gone
  omarchy capture screenrecording --fullscreen
  RECORDING_STARTED=1
  sleep 2
fi

(
  cd "$SCRIPT_DIR"
  CDP_PORT="$CDP_PORT" node "$SCRIPT_DIR/demo.mjs"
) | tee "$STEPS_LOG"

if [[ "$SKIP_RECORD" != "1" ]]; then
  sleep 0.8
  omarchy capture screenrecording --stop-recording | tee "$RECORDING_PATH_FILE"
  RECORDING_STARTED=0
  RAW=$(tail -1 "$RECORDING_PATH_FILE")
  echo
  echo "Raw recording saved: $RAW"
  mkdir -p "$(dirname "$OUT_MP4")"
  cp "$RAW" "$OUT_MP4"
  echo "Copied to $OUT_MP4"
  ls -lh "$OUT_MP4"
else
  echo "Dry run finished (SKIP_RECORD=1). Steps: $STEPS_LOG"
fi
