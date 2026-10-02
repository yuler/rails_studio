---
name: intro
description: Capture and render the Rails Studio README intro video (Puppeteer headless capture + Remotion). Use when the user asks to update the intro video, README hero video, launch video, assets/intro-poster.jpg, or mise intro:capture / intro:render.
---

# Intro

The intro is a Framer-style launch video: hook copy, an install card, then one persistent product window that swaps real UI clips while the camera moves, then an outro. Everything lives in `video/`. Audio is synthesized locally (no downloaded tracks): background music plus click, whoosh, pop, and typing effects. Do not reintroduce screen recording, TTS, or burned-in subtitles.

## Preconditions

- Dummy app running: `mise run dev:rails` (default `STUDIO_URL=http://127.0.0.1:3000/rails_studio`).
- Frontend assets built (`mise run build`) so the dummy app serves the current UI.
- Google Chrome installed (`CHROME_PATH` to override), `ffmpeg`, `pnpm`, `uv` (audio synthesis).
- Capture is headless; it does not take over the screen.
- Run `intro:capture` before `intro:studio` / `intro:render`: `Product.tsx` imports the gitignored `video/public/capture/manifest.json`.

## Commands

From the repo root:

```bash
mise run intro:capture             # seeds demo data, records every scene
SCENES=sql,fk mise run intro:capture   # re-record some scenes, keep the rest
mise run intro:studio              # preview in Remotion Studio
mise run intro:render              # audio + video/out/intro.mp4 + assets/intro-poster.jpg
```

Then upload `video/out/intro.mp4` through the GitHub web UI (drag into an issue or PR comment) and replace the `user-attachments` URL in `README.md`. The MP4 is not committed.

## Layout

| Path                           | Role                                                              |
| ------------------------------ | ----------------------------------------------------------------- |
| `video/capture/seed.rb`        | Demo data (18 users, 36 articles); replaces dummy dev data        |
| `video/capture/capture.mjs`    | One `setup` + one `scenes` entry per clip; writes `manifest.json` |
| `video/public/capture/`        | `<scene>.webm`, `<scene>.png`, `manifest.json` (gitignored)       |
| `video/audio/generate.py`      | Synthesizes `music.wav` + SFX into `video/public/audio/`          |
| `video/src/sound.tsx`          | `Music` and `Sfx`; per-effect levels in `LEVEL`                   |
| `video/src/scenes/Hook.tsx`    | "Prisma has Studio. Drizzle has Studio. Now Rails does too."      |
| `video/src/scenes/Install.tsx` | Typed Gemfile + routes card                                       |
| `video/src/scenes/Product.tsx` | `SHOTS`: clip, seconds, headline, trim, camera, optional `pan`    |
| `video/src/scenes/Outro.tsx`   | Logo, `gem "rails_studio"`, GitHub URL                            |

## After a feature lands

1. Add a scene to `scenes` and `setup` in `capture.mjs`.
2. `SCENES=<name> mise run intro:capture`; check `video/public/capture/<name>.png`.
3. Add a `SHOTS` entry in `Product.tsx`; tune `camera` with `npx remotion still src/index.ts Intro /tmp/f.jpg --frame N` from `video/`.
4. `mise run intro:render`, spot-check frames, upload.

## Fragile facts

| Pitfall                           | Required approach                                                     |
| --------------------------------- | --------------------------------------------------------------------- |
| Screencast ignores emulated DPR   | `--force-device-scale-factor=2` + `defaultViewport: null`             |
| `--window-size` includes chrome   | Resize via `Browser.setWindowBounds` until viewport is 1440×900       |
| No cursor in headless capture     | `injectCursor` draws a fake cursor and click ring from mouse events   |
| Button text includes shortcuts    | Match with `startsWith` ("Run" vs "SQL Runner")                       |
| Off-screen cells                  | Mouse clicks only hit the viewport; pick visible targets              |
| Clip longer than shot             | `Product.tsx` speeds the clip up (`playbackRate`) to fit `seconds`    |
| Console opens from its header bar | Click the bottom bar, not a button                                    |
| Click/typing sounds drift         | They come from `manifest.json` events; recapture after editing scenes |
| Render killed (`Killed: 9`)       | Memory: keep `--concurrency 3` for 2880px clips                       |
