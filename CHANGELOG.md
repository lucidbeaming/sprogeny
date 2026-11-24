# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- README and the 2.0.0 notes describe this repo as a snapshot of the live code, which is developed in a private repo; the 2.0.0 notes no longer give steps for moving a deployment here (#20)

## [2.0.0] - 2026-11-23

Sprogeny 2.0 is the SvelteKit app behind [sprogeny.com](https://sprogeny.com), replacing the original Flask prototype. Sign in with Spotify, add playlists from your library or by link, weight them with sliders, and generate 1 to 5 shuffled, deduplicated playlists of 10 to 300 tracks. The live service runs under Spotify's Development Mode limit of 5 hand-added users. The Flask code stays available under the `flask-legacy` tag (v1.0.0).

This repo is a snapshot of the code behind sprogeny.com; the live site is developed in a private repo.

### Changed

- **Breaking:** the Flask prototype is replaced by the SvelteKit app behind sprogeny.com: combine several playlists with weighted sliders into 1 to 5 new playlists, with Spotify sign-in, PostgreSQL and a build-time album cover carousel. The Flask code stays under the `flask-legacy` tag (#17)
- README rewritten for the SvelteKit app: Spotify Development Mode limits, setup, scripts, logging, cover pipeline and credits (#17)

### Added

- CI: type check, lint and build on pushes and pull requests (#17)

### Fixed

- better-auth warnings and errors reach the app's `[Sprogeny:Auth]` logger; the old `error`/`warn` options were ignored (#17)
- `.env.example` includes `POSTGRES_PASSWORD`, which `npm run db:start` needs (#17)

## [1.0.0] - 2026-11-23

Final release of the original Flask prototype: enter a Spotify username, pick one of their public playlists, and get up to three shuffled "offspring" playlists. It predates Spotify's February 2026 API changes and won't be updated for them; v2.0.0 replaces it with the SvelteKit app behind sprogeny.com. This code stays available under the `flask-legacy` tag.

### Added

- README: screenshots, Spotify API warning (#10), requirements, configuration defaults, how the three playlists are sliced, related projects (#11)

### Changed

- Repository metadata (#5)

### Fixed

- README: this Flask code is the original prototype. The live service is a newer SvelteKit version; this prototype won't be updated for the February 2026 Spotify API changes (#10)
- README frames the project as a proof of concept for a public service whose live deployment is restricted by Spotify's Development Mode limits (#10)
- README warning puts the 5-user manual allowlist first, notes that Extended Quota is closed to individuals, and clarifies that each user can still use their own playlists (#10)
- README clone URL pointed at a `yourusername` placeholder (#11)
- Raised vulnerable pins: Flask 3.1.3, Werkzeug 3.1.9, gunicorn 27.0.1, spotipy 2.26.0, python-dotenv 1.2.4. spotipy 2.26 also reads and adds playlist items through Spotify's new `/items` endpoints (#4)
- `.gitignore` regenerated from GitHub's Python template: wrapped comment lines had become 19 bogus ignore patterns. Adds macOS/editor/env entries and an explicit entry for spotipy's `.cache` token file (#7)

[Unreleased]: https://github.com/lucidbeaming/sprogeny/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/lucidbeaming/sprogeny/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/lucidbeaming/sprogeny/releases/tag/v1.0.0
