/**
 * Downloads the home page carousel's album covers listed in scripts/splash-covers.json
 * (written by scripts/curate-splash-covers.mjs) from the Cover Art Archive into
 * static/images/splash/, which is git-ignored. /api/images serves whatever is in that folder.
 *
 * Runs as `prebuild`. Covers already on disk are kept, covers no longer listed are removed,
 * and a failed download only prints a warning, so a build never fails because of it.
 *
 * Usage:  node scripts/fetch-splash-covers.mjs
 *   SPLASH_SKIP=1     skip entirely
 *   SPLASH_LIMIT=60   only fetch the first 60 covers (quick local setup)
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LIST = join(root, 'scripts', 'splash-covers.json');
const DIR = join(root, 'static', 'images', 'splash');
const USER_AGENT = 'sprogeny-cover-fetch/1.0 (https://joshuacurry.dev/)';
const CONCURRENCY = 4;
const COVER_FILE = /^[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/i;

if (process.env.SPLASH_SKIP) {
	console.log('[splash] SPLASH_SKIP set, not fetching covers');
	process.exit(0);
}

try {
	const limit = Number(process.env.SPLASH_LIMIT) || Infinity;
	const covers = JSON.parse(readFileSync(LIST, 'utf8')).slice(0, limit);
	const wanted = new Set(covers.map((c) => `${c.release}.jpg`));
	mkdirSync(DIR, { recursive: true });

	// Remove covers that are no longer listed (only files named like a cover)
	let removed = 0;
	for (const file of readdirSync(DIR)) {
		if (COVER_FILE.test(file) && !wanted.has(file)) {
			unlinkSync(join(DIR, file));
			removed++;
		}
	}

	const missing = covers.filter((c) => !existsSync(join(DIR, `${c.release}.jpg`)));
	let fetched = 0;
	let failed = 0;
	const queue = [...missing];
	await Promise.all(
		Array.from({ length: CONCURRENCY }, async () => {
			for (let cover = queue.shift(); cover; cover = queue.shift()) {
				try {
					const res = await fetch(
						`https://coverartarchive.org/release/${cover.release}/front-500`,
						{
							headers: { 'User-Agent': USER_AGENT },
							redirect: 'follow'
						}
					);
					const type = res.headers.get('content-type') ?? '';
					if (!res.ok || !type.startsWith('image/')) throw new Error(`HTTP ${res.status} ${type}`);
					writeFileSync(join(DIR, `${cover.release}.jpg`), Buffer.from(await res.arrayBuffer()));
					fetched++;
				} catch (e) {
					failed++;
					console.warn(`[splash] ${cover.artist} - ${cover.title}: ${e.message}`);
				}
			}
		})
	);

	console.log(
		`[splash] ${covers.length - missing.length} cached, ${fetched} fetched, ${failed} failed, ${removed} removed`
	);
} catch (e) {
	console.warn(`[splash] skipped: ${e.message}`);
}
