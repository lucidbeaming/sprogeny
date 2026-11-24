# Sprogeny

Sprogeny is a web app that combines and shuffles multiple Spotify playlists into fresh, new playlists. Sign in with Spotify, select your playlists, adjust weights, and generate blended playlists without manually dragging tracks around.

## Tech Stack

- **Framework**: SvelteKit + Svelte 5, TypeScript
- **Styling**: Tailwind CSS 4 (with Typography and Forms plugins)
- **Database**: PostgreSQL (via Docker) + Drizzle ORM
- **Auth**: Better Auth with Spotify OAuth
- **3D**: Three.js (splash page animation)

## Prerequisites

- Node.js
- Docker (for PostgreSQL)
- A [Spotify Developer](https://developer.spotify.com) application with a redirect URI pointing to your auth callback

## Setup

1. Clone the repo and install dependencies:

   ```sh
   npm install
   ```

2. Copy the example env file and fill in your values:

   ```sh
   cp .env.example .env
   ```

   Required variables:

   | Variable                | Description                                         |
   | ----------------------- | --------------------------------------------------- |
   | `DATABASE_URL`          | PostgreSQL connection string                        |
   | `ORIGIN`                | App origin (e.g. `http://127.0.0.1:9002`)           |
   | `BETTER_AUTH_SECRET`    | 32+ char high-entropy secret for session encryption |
   | `SPOTIFY_CLIENT_ID`     | From your Spotify Developer app                     |
   | `SPOTIFY_CLIENT_SECRET` | From your Spotify Developer app                     |

3. Start the database and push the schema:

   ```sh
   npm run db:start
   npm run db:push
   ```

4. Download the home page album covers (`npm run build` does this automatically; set `SPLASH_LIMIT=60` for a quick local setup):

   ```sh
   npm run covers:fetch
   ```

5. Start the dev server:

   ```sh
   npm run dev
   ```

   The app runs on `http://127.0.0.1:9002` (Spotify OAuth requires an IP address, not `localhost`).

## Scripts

| Command                 | Description                                                            |
| ----------------------- | ---------------------------------------------------------------------- |
| `npm run dev`           | Start dev server                                                       |
| `npm run build`         | Production build (runs `covers:fetch` first)                           |
| `npm run covers:fetch`  | Download the carousel covers listed in `scripts/splash-covers.json`    |
| `npm run covers:curate` | Rebuild that list from Wikidata, MusicBrainz and the Cover Art Archive |
| `npm run preview`       | Preview production build                                               |
| `npm run check`         | Type checking via svelte-check                                         |
| `npm run lint`          | Run Prettier + ESLint                                                  |
| `npm run format`        | Format code with Prettier                                              |
| `npm run db:start`      | Start PostgreSQL via Docker                                            |
| `npm run db:push`       | Push Drizzle schema to database                                        |
| `npm run db:generate`   | Generate Drizzle migrations                                            |
| `npm run db:migrate`    | Run Drizzle migrations                                                 |
| `npm run db:studio`     | Open Drizzle Studio                                                    |

## How It Works

1. **Sign in** with your Spotify account
2. **Add playlists** by URL or select from your library
3. **Adjust weights** with sliders to control track distribution from each source
4. **Generate** 1-5 new playlists with 10-300 tracks each, shuffled and deduplicated

Track usage is hashed per user to prevent duplicates across blend operations. No playlist data is stored after your session ends.

## Production Logging (Ubuntu)

Logs are written to stdout/stderr and captured by PM2. All log lines are timestamped and prefixed so they can be grepped independently:

| Prefix               | Source                                             |
| -------------------- | -------------------------------------------------- |
| `[Sprogeny:Combine]` | Page load, API handler, combine/simulate functions |
| `[Sprogeny:Spotify]` | Spotify API client calls                           |
| `[Sprogeny:Auth]`    | Auth session checks                                |

PM2 writes these to `/var/log/sprogeny/app.log` and `/var/log/sprogeny/error.log` per `ecosystem.config.cjs`.

### 1. Create the log directory

```sh
sudo mkdir -p /var/log/sprogeny
sudo chown sprogeny:adm /var/log/sprogeny
sudo chmod 750 /var/log/sprogeny
```

Replace `sprogeny` with the user PM2 runs as.

### 2. Install log rotation

```sh
sudo cp deploy/logrotate.conf /etc/logrotate.d/sprogeny
sudo logrotate --debug /etc/logrotate.d/sprogeny   # dry-run to verify
```

This rotates logs daily, keeps 14 days, compresses old files, and signals PM2 to reopen its file handles after rotation.

### 3. Filter logs

```sh
# All combine activity
grep 'Sprogeny:Combine' /var/log/sprogeny/app.log

# Errors only (stderr)
tail -f /var/log/sprogeny/error.log

# Live combine activity
tail -f /var/log/sprogeny/app.log | grep 'Sprogeny:Combine'
```

## Spotify Permissions

Sprogeny requests the minimum scopes needed:

- `playlist-read-private` / `playlist-read-collaborative` — read your playlists
- `playlist-modify-public` / `playlist-modify-private` — create blended playlists

## Home page album covers

The covers in the home page carousel aren't stored in the repo. `scripts/splash-covers.json` lists them by MusicBrainz release ID, with artist, title and year, and `npm run covers:fetch` (run before every build) downloads each one's 500px front image into the git-ignored `static/images/splash/`, which `/api/images` serves. Covers already on disk are kept, unlisted ones are removed, and a failed download only logs a warning.

`npm run covers:curate` rebuilds the list and keeps only real covers of original releases:

1. **Notable studio albums:** candidates are Wikidata studio albums with a MusicBrainz release group, ranked by how many Wikipedia language editions cover them
2. **No compilations, live, remix, DJ-mix, mixtape, demo, soundtrack or spoken-word releases**, and no Various Artists
3. **The original edition:** an official release from the album's first year, on a real label, with a barcode or catalog number, on physical media
4. **Real scans:** the Cover Art Archive has front and back scans; the front is approved and isn't commented as fan art or similar. The release MusicBrainz editors picked as the album's cover comes first, then other pressings before Japanese ones (obi strips), preferring high-resolution scans
5. **Variety:** one cover per artist, and no genre over 8% of the list

It follows MusicBrainz's one-request-per-second limit and caches responses in `.cache/musicbrainz/`. Options: `--target 400` (list size), `--genre-share 0.08`, `--fresh` (start over; by default existing entries are kept). To remove a cover, add its release group ID (drops the album) or release ID (drops that pressing's scan, so another is tried) to `scripts/splash-covers-exclude.txt` and rerun.

The checks can't judge what a cover shows, so look over any new covers before merging an updated list (for example in `static/images/splash/` after `npm run covers:fetch`). Explicit or otherwise unsuitable covers go in the exclude list, with a comment saying why; _Virgin Killer_ (1976) is already there.

## Credits

The album covers are `front-500` thumbnails from the [Cover Art Archive](https://coverartarchive.org/), a joint project of [MusicBrainz](https://musicbrainz.org/) and the [Internet Archive](https://archive.org/); the candidate albums come from [Wikidata](https://www.wikidata.org/). The covers remain the property of their artists, labels or designers. They're used as decoration only, and the site credits them on its Terms of Use and FAQ pages.
