# SAP Music

Artist site for **Erosyn** (formerly **SAP, Standard Acid Procedure**), a South Florida bass music producer and DJ. Live at [erosynmusic.com](https://erosynmusic.com).

- `/` — the Erosyn site (`index.html`; its assets live under `erosyn/`)
- `/erosyn/brand.html` — Erosyn brand system and artist asset pack
- `/sap.html` — the legacy SAP page
- `/erosyn/` — redirects to `/`

## Stack
- Static HTML (no build step)
- Modular CSS: `css/tokens.css`, `css/base.css`, `css/components.css`, `css/layout.css`
- Vanilla JS
- Self-hosted fonts under `fonts/`

## Local dev
Serve the directory statically:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

Any other static server works (`npx serve`, `caddy file-server`, etc.).

## Deploy
Production is served by Vercel, the canonical host for the site and its `api/` functions: pushes to `main` deploy `erosynmusic.com`, and PR branches get preview URLs. The repository no longer publishes to GitHub Pages.

## Launch

Scorcher, the new Erosyn single, was released on November 5, 2026. The homepage and Music view feature its verified cover and listening links. Research and scope: [launch record](docs/LAUNCH.md).

## Notable features
- **Click-to-play release cards** — poster art loads first, SoundCloud iframes lazy-load on interaction
- **Press toolkit** — bio, assets, and links for press / venues / promoters
- **Shows** — no dates displayed until artist confirmation; booking inquiries prepare an email to `erosynmusic@gmail.com` with a copy fallback
- **Erosyn rhythm machine** — standalone interactive page at `/drum-machine.html`, with dubstep, grime, DnB, psytrance, electro, hardstyle, and rave kits

## Drum machine audio notes
- Built with the browser Web Audio API via `AudioContext`; today all audio is synthesized in the browser.
- Tempo is labeled in BPM and schedules sixteenth note steps with `(60 / BPM / 4) * 1000` milliseconds. Each preset sets its own tempo (for example DnB 174, Electro 128), and changing tempo while playing re-times the loop.
- Noise buffer lengths use `audioContext.sampleRate`, so the generated clap and snare noise durations track the active browser audio device sample rate.
- Synth voice pitches are set with oscillator frequency values in Hz, and envelopes use gain automation against `audioContext.currentTime`.

## Booking regression checks

Install test-only Playwright (`npm install --no-save --package-lock=false playwright@1.63.0`), run `npx playwright install chromium`, then `node tests/booking.mjs` and `node tests/launch.mjs`. The script starts its own static server and checks phone, landscape, desktop and ultrawide layouts in both themes. It validates and inspects email drafts without opening an email client or sending an inquiry. The same checks run for homepage PRs.
