# Erosyn launch

## Outcome and scope

Make the official launch easy to find: feature Scorcher on the homepage, cue it first in the existing Music deck, publish verified streaming links, and use erosynmusic.com in current metadata. Preserve the existing catalog, booking flow, local preferences, themes, and click-to-play audio behavior. No backend, tracking, automatic playback, shows, or new platform claims.

## Confirmed sources, November 5, 2026

- [SoundCloud single](https://soundcloud.com/erosynmusic/scorcher): Erosyn, Scorcher, Dubstep, 3:30; published November 5. The artist description is “Finding beauty in the dark.” The cover at `erosyn/web/releases/scorcher.jpg` is the unedited 500px SoundCloud artwork.
- [Apple Music single](https://music.apple.com/us/album/scorcher/6821793136?i=6821793137): Erosyn, Scorcher, release date November 5, 2026; 210857 ms; Dubstep. Verified using Apple's public catalog lookup for artist 6821129153.
- [Spotify single](https://open.spotify.com/track/6bCqCFf0fjrOiBsiZHSq1j): Erosyn, Scorcher, 210857 ms, playable. Spotify artist ID: 4wR3loMCdXnWA2GJBjaBfP. Verified by the Spotify catalog and the public track/artist page metadata.
- Dave confirmed the official launch and DistroKid distribution in this session. Other destinations may still be propagating. Only the three verified services are linked; do not claim availability everywhere or add guessed URLs.

## Acceptance

- A new visitor sees the launch and can choose Spotify, Apple Music, or SoundCloud from Home.
- Scorcher is the first of 11 tracks; its actual cover, date, runtime and SoundCloud URL agree with the deck.
- Existing visitors retain their saved track selection; no third-party player loads before Play.
- Home and Music remain usable in both themes at phone, landscape, desktop and ultrawide sizes. The document has no page overflow.
- Canonical, social and recording metadata use erosynmusic.com. The old domain continues to work; no hosting redirects or legacy SAP pages change.
- Existing booking regression and focused launch checks pass before release.

## Recheck, November 21, 2026

An information pass compared the site with each public source. Nothing on the public pages needed to change.

- SoundCloud: the profile lists 11 tracks and the newest is still Scorcher (November 5). All 11 titles, release months and runtimes in the Music view match their track pages. The profile reads "Miami, FL" and "Finding beauty in the dark".
- Apple Music: the public catalog lookup for artist 6821129153 returns one release, Scorcher - Single (November 5, 2026; 210857 ms; Dubstep).
- Spotify: the artist embed for 4wR3loMCdXnWA2GJBjaBfP lists one track, Scorcher (210857 ms).
- No fourth platform was verified. A Deezer search for the artist and title found no listing. Keep the three listening links.
- The Instagram and Threads links respond, but an automated check could not read either profile, so those handles remain unconfirmed here.
- No confirmed show dates were found in the project notes, so the Shows view stays empty.
- erosynmusic.com was registered on November 5, 2026 and is served by Vercel. Production matched `main`, and the launch, booking and editorial checks passed against the live site.
- Found in this pass and fixed the same day in pull request 17: both API functions now accept requests from erosynmusic.com. Before that they refused it while still accepting the legacy domain. `tests/api-origin.mjs` covers this.
