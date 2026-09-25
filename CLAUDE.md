# CLAUDE.md — SAP Music

Orientation doc for Claude / Claude Code working in this repo.

## Project
**SAP Music** — Standard Acid Procedure. Artist site for a South Florida bass music producer (dubstep, halftime, glitch hop, glitch pop, psy bass). The artist rebranded from SAP to **Erosyn**: the Erosyn site is the homepage (`index.html`), and the legacy SAP page lives at `sap.html`.

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
Production at `standardacidprocedure.com` is served by **Vercel** (Vercel GitHub integration); pushes to `main` deploy production and PR branches get preview URLs. `.github/workflows/pages.yml` also publishes to GitHub Pages on push to `main`, and `CNAME` pins the domain there.

## Key pages
- `index.html` — homepage: the Erosyn rebrand site (formerly SAP). Standalone single file (one `<style>`, one `<script>`, no shared CSS) built as a no-scroll, DAW-style app with hash-routed views. It lives at the root but its assets stay under `erosyn/`, so every asset path carries the `erosyn/` prefix (`erosyn/01-logos/`, `erosyn/02-press-kit/`, `erosyn/web/`, …); keep that prefix on new assets. Missing assets fall back to CSS art. The page loads resized copies from `erosyn/web/` (regenerate them from the pack masters when art changes); modal "Open full file" links point at the masters. The Music view lists the real catalog from soundcloud.com/erosynmusic (cover art saved in `erosyn/web/releases/`) and loads the SoundCloud widget only when a visitor presses Play. Remaining placeholders are marked `BRAND SWAP` / `CONTENT SWAP`.
- `sap.html` — legacy SAP landing page (hero, releases, shows, press toolkit), formerly `index.html`. Its canonical and `og:url` point at `/sap.html`, not the root.
- `drum-machine.html` — interactive drum machine
- `erosyn/index.html` — redirect stub only: sends `/erosyn/` to `/` and keeps the `#view`, so old deep links such as `/erosyn/#music` still work. Do not build here.
- `erosyn/brand.html` — Erosyn brand system v01 guide. Standalone single file; asset paths resolve relative to the page (pack folders sit beside it). Pack Map folder cards link to the GitHub tree view because the static hosts (Vercel, Pages) serve no directory listings. The Download ZIP button points to a GitHub Release asset (tag `erosyn-pack-v01`), not a file in the repo. When the pack changes, rebuild the zip from the committed tree (the site-only `index.html` and `web/` are excluded) with `git archive --format=zip -9 --prefix=artist-asset-pack/ -o erosyn-artist-asset-pack-v01.zip HEAD:erosyn -- ':!index.html' ':!web'`, then run `gh release upload erosyn-pack-v01 erosyn-artist-asset-pack-v01.zip --clobber`.

## Key sections (sap.html)
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
  - CSP meta tag added to the SAP page (now `sap.html`) and `drum-machine.html`

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
