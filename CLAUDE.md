# CLAUDE.md — SAP Music

Orientation doc for Claude / Claude Code working in this repo.

## Project
**SAP Music** — Standard Acid Procedure. Artist site for a South Florida bass music producer (dubstep, halftime, glitch hop, glitch pop, psy bass).

## Domain
standardacidprocedure.com

## Stack
- Static HTML, no build step
- Modular CSS split into four files under `css/`:
  - `tokens.css` — design tokens (colors, spacing, type scale)
  - `base.css` — resets, typography, base element styles
  - `components.css` — reusable component styles (cards, buttons, modals, etc.)
  - `layout.css` — page layout / grid / section-level rules
- Vanilla JS inline in HTML where needed
- Fonts: Orbitron, IBM Plex Mono, Space Grotesk — currently loaded from Google Fonts CDN; self-hosting under `fonts/` is a planned follow-up (CSP currently whitelists `fonts.googleapis.com` / `fonts.gstatic.com`)

## Deploy
GitHub Pages via custom domain. `CNAME` file pins `standardacidprocedure.com`. Pushes to `main` auto-deploy.

## Key pages
- `index.html` — landing page: hero, releases, shows, press toolkit
- `drum-machine.html` — interactive drum machine

## Key sections (index.html)
- **Hero** — artist identity and primary CTA
- **Releases** — click-to-play poster cards (SoundCloud iframes lazy-loaded)
- **Shows** — split into **confirmed** vs **booking / inquiries**
- **Press toolkit** — assets, bio, links for press / venues / promoters

## Recent work
- Tier 1 + 2 + 3 audit fixes:
  - Exit-intent modal removed
  - ARIA tabs downgraded to plain buttons (accessibility simplification)
  - SoundCloud iframes lazy-loaded (`loading="lazy"`)
  - CSS split from single file into 4 modular files
  - CSP meta tag added to `index.html` and `drum-machine.html`

## Follow-ups
- Self-host Google Fonts (Orbitron, IBM Plex Mono, Space Grotesk) and tighten CSP to drop `fonts.googleapis.com` / `fonts.gstatic.com` from `style-src` / `font-src`.

## Build / dev
No build. Serve the directory statically:
```
python3 -m http.server 8000
```
Then open http://localhost:8000.

## Conventions
- Keep HTML semantic — prefer native elements over ARIA roles.
- Do not reintroduce third-party font or analytics CDNs without an explicit reason — CSP is locked down.
- New release cards should follow the existing click-to-play poster pattern; lazy-load any embedded iframes.
- Edit the relevant CSS file by concern (tokens/base/components/layout) — do not inline large style blocks in HTML.
