# SAP Music

Artist site for **Erosyn** (formerly **SAP — Standard Acid Procedure**), a South Florida bass music producer and DJ. Live at [standardacidprocedure.com](https://standardacidprocedure.com).

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
Production is served by Vercel: pushes to `main` deploy `standardacidprocedure.com`, and PR branches get preview URLs. A GitHub Pages workflow also publishes on push to `main`; the `CNAME` file pins the custom domain there.

## Notable features
- **Click-to-play release cards** — poster art loads first, SoundCloud iframes lazy-load on interaction
- **Press toolkit** — bio, assets, and links for press / venues / promoters
- **Split shows section** — confirmed upcoming dates separated from booking / inquiry info
- **Erosyn rhythm machine** — standalone interactive page at `/drum-machine.html`, with dubstep, grime, DnB, psytrance, electro, hardstyle, and rave kits

## Drum machine audio notes
- Built with the browser Web Audio API via `AudioContext`; there is no server side audio processing.
- Tempo is labeled in BPM and schedules sixteenth note steps with `(60 / BPM / 4) * 1000` milliseconds. Each preset sets its own tempo (for example DnB 174, Electro 128), and changing tempo while playing re-times the loop.
- Noise buffer lengths use `audioContext.sampleRate`, so the generated clap and snare noise durations track the active browser audio device sample rate.
- Synth voice pitches are set with oscillator frequency values in Hz, and envelopes use gain automation against `audioContext.currentTime`.
