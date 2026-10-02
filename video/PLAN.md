# Intro video plan

The README intro is a Framer-style launch video: narrative, motion, real product UI. One 16:9 master serves README, landing-page hero, X, and Product Hunt.

## Decisions

| Topic       | Decision                                                                          |
| ----------- | --------------------------------------------------------------------------------- |
| Style       | Framer launch-video look; built with Remotion (code-rendered, agent-driven)       |
| Deliverable | One 16:9 master, 45s, 1920×1080 @ 60fps, H.264, < 10MB                            |
| Audio       | No narration; synthesized 104 BPM C–G–Am–F loop + click/whoosh/pop/typing SFX     |
| Copy        | English only                                                                      |
| Narrative   | "Prisma has Studio. Drizzle has Studio. Now Rails does too." → features → CTA     |
| Capture     | Puppeteer headless `page.screencast()`, 1440×900 viewport, DPR 2, per-scene clips |
| Demo data   | Separate demo seed (18 users, 36 articles); test `seeds.rb` untouched             |
| Theme       | Dark product UI on dark gradient, Rails red `#e11d48` accent; one theme toggle    |
| Type/motion | Inter + JetBrains Mono; spring transitions, 3D tilt, shadow, glow                 |
| Location    | `video/` (Remotion project + capture scripts); `mise intro:*` point here          |
| Publishing  | MP4 gitignored; upload via GitHub web UI, swap URL in README; commit poster only  |

## Storyboard

| #  | Time | Visual                                           | Copy                                                         |
| -- | ---- | ------------------------------------------------ | ------------------------------------------------------------ |
| 1  | 5.5s | Prisma, Drizzle lines dim; logo pops in          | "Prisma has Studio. Drizzle has Studio. Now Rails does too." |
| 2  | 4s   | Code card: `gem "rails_studio"` + `mount`, typed | "One line. Zero config."                                     |
| 3  | 5s   | Real: window tilts in, open users                | "Every table. Instantly."                                    |
| 4  | 5s   | Real: filter `email ends with .dev`              | "Filter. Sort. Find."                                        |
| 5  | 6.5s | Real: two inline edits → pending bar → Save      | "Stage edits. Commit atomically."                            |
| 6  | 3.5s | Real: click `categories #3`, drawer slides in    | "Follow every association."                                  |
| 7  | 4s   | Real: SQL runner query and results               | "Raw SQL when you need it."                                  |
| 8  | 4s   | Real: console `User.where(role: :admin)`         | "A Rails console. In your browser."                          |
| 9  | 3.5s | `Cmd+K` palette, then dark → light toggle        | "Keyboard-first. Dark or light."                             |
| 10 | 4s   | Logo + `gem "rails_studio"` + GitHub URL         | "Rails Studio"                                               |

## Pipeline

1. `mise run intro:capture` — seed demo data, record one clip + still per scene into `video/public/capture/`.
2. `mise run intro:studio` — Remotion Studio preview.
3. `mise run intro:render` — render `video/out/intro.mp4` and `assets/intro-poster.jpg`.
4. Upload MP4 on GitHub, update the README video URL.

## Open later

- Swap the synthesized loop for a licensed track if it sounds too plain.
- Derived cuts: 1:1 / 4:5 for X feed, 6–10s silent loop for hero background.
