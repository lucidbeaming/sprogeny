/**
 * Builds the list of album covers for the home page carousel, keeping only real covers of
 * original releases. (Searching MusicBrainz by tag mostly turned up compilations, fan-made or
 * reused artwork and user uploads, so candidates come from Wikidata instead.)
 *
 *   1. Candidates: Wikidata items that are a studio album (Q482994) with a MusicBrainz release
 *      group ID, ranked by how many Wikipedia language editions cover them (notability).
 *   2. MusicBrainz: the release group has no secondary type (compilation, live, remix, DJ-mix,
 *      mixtape, demo, soundtrack, spoken word) and isn't credited to Various Artists.
 *   3. The cover comes from an official release from the group's first year (the original
 *      edition, not a reissue) on a real label, with a barcode or catalog number, on physical media.
 *   4. Cover Art Archive: that release has front and back scans, and the front image is approved
 *      and has no comment such as "fan art".
 *   5. At most one cover per artist, and no genre takes more than --genre-share of the list.
 *
 * scripts/splash-covers-exclude.txt lists MusicBrainz IDs to skip, one per line (# comments
 * allowed): a release group ID drops that album; a release ID drops just that pressing's scan
 * (say, a photo with the obi strip or the jewel case) so another pressing of the album is tried.
 *
 * Writes scripts/splash-covers.json (IDs and credits only, no images);
 * scripts/fetch-splash-covers.mjs downloads the images. Existing entries are kept, so a rerun
 * only adds covers until --target is reached (--fresh starts over).
 *
 * MusicBrainz allows one request per second per client; responses are cached in
 * .cache/musicbrainz/, so reruns are fast.
 *
 * Usage:  node scripts/curate-splash-covers.mjs [--target 400] [--genre-share 0.08] [--fresh]
 */

import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'scripts', 'splash-covers.json');
const EXCLUDE = join(root, 'scripts', 'splash-covers-exclude.txt');
const CACHE = join(root, '.cache', 'musicbrainz');
const USER_AGENT = 'sprogeny-cover-curation/1.0 (https://joshuacurry.dev/)';

const VARIOUS_ARTISTS = '89ad4ac3-39f7-470e-963a-56509c546377';
const NO_LABEL = '157afde4-4bf5-4039-8ad2-5a15acc85176';
const SUSPECT_COMMENT = /fan|custom|unofficial|fake|bootleg|reproduction|replica|edited|made by/i;

// Studio albums with a MusicBrainz release group, most-covered first
const CANDIDATES_QUERY = `
SELECT ?rg ?links (SAMPLE(?genreLabel) AS ?genre) (SAMPLE(?performer) AS ?by) WHERE {
  ?album wdt:P31 wd:Q482994 ; wdt:P436 ?rg ; wikibase:sitelinks ?links .
  FILTER(?links >= 8)
  OPTIONAL { ?album wdt:P136 ?g . ?g rdfs:label ?genreLabel . FILTER(LANG(?genreLabel) = "en") }
  OPTIONAL { ?album wdt:P175 ?performer }
} GROUP BY ?rg ?links ORDER BY DESC(?links) LIMIT 6000`;

// --- arguments ---
const args = process.argv.slice(2);
const arg = (name, fallback) => {
	const i = args.indexOf(`--${name}`);
	return i === -1 ? fallback : args[i + 1];
};
const target = Number(arg('target', 400));
const genreShare = Number(arg('genre-share', 0.08));
const fresh = args.includes('--fresh');

// --- HTTP: cached, rate-limited, retried ---
mkdirSync(CACHE, { recursive: true });
let lastMusicBrainzRequest = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, accept = 'application/json') {
	const cacheFile = join(CACHE, createHash('sha1').update(url).digest('hex') + '.json');
	if (existsSync(cacheFile)) return JSON.parse(readFileSync(cacheFile, 'utf8'));

	const isMusicBrainz = url.startsWith('https://musicbrainz.org/');
	for (let attempt = 0; attempt < 6; attempt++) {
		const wait = isMusicBrainz ? lastMusicBrainzRequest + 1100 - Date.now() : 0;
		await sleep(Math.max(wait, attempt ? 2000 * 2 ** attempt : 0));
		if (isMusicBrainz) lastMusicBrainzRequest = Date.now();

		const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: accept } });
		if (res.status === 503 || res.status === 429) continue; // rate limited: back off and retry
		// 404 is a real answer (e.g. no cover art), so cache it like a success
		const data = res.ok ? await res.json() : { error: res.status };
		if (res.ok || res.status === 404) writeFileSync(cacheFile, JSON.stringify(data));
		return data;
	}
	return { error: 'rate limited' };
}

const mb = (path, params) =>
	getJson(
		`https://musicbrainz.org/ws/2/${path}?${new URLSearchParams({ ...params, fmt: 'json' })}`
	);

// --- the checks ---
const year = (date) => (date ? date.slice(0, 4) : '');
const credit = (artistCredit) => artistCredit.map((c) => c.name + (c.joinphrase ?? '')).join('');

async function pickCover(releaseGroupId) {
	const group = await mb(`release-group/${releaseGroupId}`, { inc: 'artist-credits' });
	if (group.error) return `lookup failed (${group.error})`;
	if (group['primary-type'] !== 'Album' || group['secondary-types']?.length)
		return 'not a plain album';
	if (group['artist-credit']?.some((c) => c.artist.id === VARIOUS_ARTISTS))
		return 'various artists';

	const firstYear = year(group['first-release-date']);
	if (!firstYear) return 'no release date';

	const browse = await mb('release', {
		'release-group': releaseGroupId,
		status: 'official',
		inc: 'labels+media',
		limit: 100
	});
	const originals = (browse.releases ?? [])
		.filter((r) => year(r.date) === firstYear)
		.filter((r) => r['cover-art-archive']?.front && r['cover-art-archive']?.back)
		.filter((r) =>
			r['label-info']?.some(
				(li) => li.label && li.label.id !== NO_LABEL && (li['catalog-number'] || r.barcode)
			)
		)
		.filter((r) => r.media?.some((m) => m.format && m.format !== 'Digital Media'));
	if (!originals.length) return 'no original physical release with front and back scans';

	// Try the release MusicBrainz editors picked as the group's cover first (usually the
	// cleanest image), then other pressings before Japanese ones (whose scans often include
	// the obi strip), oldest first.
	const groupArt = await getJson(`https://coverartarchive.org/release-group/${releaseGroupId}`);
	const representative = groupArt.release?.split('/').pop();
	const rank = (r) => (r.id === representative ? 0 : r.country === 'JP' ? 2 : 1);
	originals.sort((a, b) => rank(a) - rank(b) || a.date.localeCompare(b.date));

	// Among the first few acceptable fronts, prefer a high-resolution scan (one with a
	// 1200px thumbnail) over a phone photo or small scan
	let fallback;
	for (const release of originals.slice(0, 5)) {
		if (excluded.has(release.id)) continue; // this pressing's scan is excluded; try the next
		const art = await getJson(`https://coverartarchive.org/release/${release.id}`);
		const front = art.images?.find((i) => i.front && i.types?.includes('Front'));
		const hasBack = art.images?.some((i) => i.types?.includes('Back'));
		if (!front || !hasBack || !front.approved || !front.thumbnails?.['500']) continue;
		if (front.comment && SUSPECT_COMMENT.test(front.comment)) continue;
		const cover = {
			release: release.id,
			releaseGroup: releaseGroupId,
			artist: credit(group['artist-credit']),
			title: group.title,
			year: Number(firstYear)
		};
		if (front.thumbnails['1200']) return cover;
		fallback ??= cover;
	}
	return fallback ?? 'front image not approved, missing a back scan or commented';
}

// --- main ---
const excluded = new Set(
	existsSync(EXCLUDE)
		? readFileSync(EXCLUDE, 'utf8')
				.split('\n')
				.map((l) => l.replace(/#.*/, '').trim())
				.filter(Boolean)
		: []
);
const covers = (!fresh && existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : []).filter(
	(c) => !excluded.has(c.release) && !excluded.has(c.releaseGroup)
);
const seenArtists = new Set(covers.map((c) => c.artist.toLowerCase()));
const seenGroups = new Set(covers.map((c) => c.releaseGroup));
const perGenre = {};
for (const c of covers) perGenre[c.genre] = (perGenre[c.genre] ?? 0) + 1;
const genreCap = Math.max(1, Math.ceil(target * genreShare));
const rejected = {};
const reject = (reason) => (rejected[reason] = (rejected[reason] ?? 0) + 1);

const sparql = await getJson(
	`https://query.wikidata.org/sparql?${new URLSearchParams({ query: CANDIDATES_QUERY })}`,
	'application/sparql-results+json'
);
const candidates = (sparql.results?.bindings ?? []).map((b) => ({
	releaseGroup: b.rg.value,
	genre: b.genre?.value ?? 'unknown',
	performer: b.by?.value // Wikidata item, to skip repeat artists before any MusicBrainz request
}));
// Performers of covers already in the list, so a rerun skips their other albums without lookups
const listedGroups = new Set(covers.map((c) => c.releaseGroup));
const seenPerformers = new Set(
	candidates.filter((c) => c.performer && listedGroups.has(c.releaseGroup)).map((c) => c.performer)
);
console.error(
	`${candidates.length} Wikidata candidates; starting with ${covers.length} covers, target ${target}, at most ${genreCap} per genre.`
);

for (const candidate of candidates) {
	if (covers.length >= target) break;
	if (seenGroups.has(candidate.releaseGroup)) continue;
	if (excluded.has(candidate.releaseGroup)) {
		reject('excluded');
		continue;
	}
	if (candidate.performer && seenPerformers.has(candidate.performer)) {
		reject('artist already in the list');
		continue;
	}
	if ((perGenre[candidate.genre] ?? 0) >= genreCap) {
		reject('genre full');
		continue;
	}
	const result = await pickCover(candidate.releaseGroup);
	if (typeof result === 'string') {
		reject(result);
		continue;
	}
	if (seenArtists.has(result.artist.toLowerCase())) {
		reject('artist already in the list');
		continue;
	}
	covers.push({ ...result, genre: candidate.genre });
	seenGroups.add(result.releaseGroup);
	seenArtists.add(result.artist.toLowerCase());
	if (candidate.performer) seenPerformers.add(candidate.performer);
	perGenre[candidate.genre] = (perGenre[candidate.genre] ?? 0) + 1;
	console.error(`  + ${result.artist} - ${result.title} (${result.year}) [${candidate.genre}]`);
	writeFileSync(OUT, JSON.stringify(covers, null, '\t') + '\n'); // save progress
}

covers.sort((a, b) => a.artist.localeCompare(b.artist) || a.year - b.year);
writeFileSync(OUT, JSON.stringify(covers, null, '\t') + '\n');
console.error(`\n${covers.length} covers written to scripts/splash-covers.json.`);
console.error('Rejected:', rejected);
