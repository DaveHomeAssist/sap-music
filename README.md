# SAP Music

Artist site for **SAP — Standard Acid Procedure**, a South Florida bass music producer (dubstep, halftime, glitch hop, psy bass). Live at [standardacidprocedure.com](https://standardacidprocedure.com).

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
Pushes to `main` auto-deploy to GitHub Pages. The `CNAME` file pins the custom domain `standardacidprocedure.com`.

## Notable features
- **Click-to-play release cards** — poster art loads first, SoundCloud iframes lazy-load on interaction
- **Press toolkit** — bio, assets, and links for press / venues / promoters
- **Split shows section** — confirmed upcoming dates separated from booking / inquiry info
- **Drum machine** — standalone interactive page at `/drum-machine.html`
