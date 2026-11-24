/**
 * Fetches name and cover image for each sample playlist via Spotify client credentials
 * and prints the updated playlistMeta block ready to paste into samplePlaylists.ts.
 *
 * Usage:  node scripts/enrich-sample-playlists.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, '..');

// --- read .env (simple key=value parser, handles quoted values) ---
function loadEnv(path) {
	const env = {};
	let raw;
	try {
		raw = readFileSync(path, 'utf8');
	} catch {
		return env;
	}
	for (const line of raw.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const eq = trimmed.indexOf('=');
		if (eq === -1) continue;
		const key = trimmed.slice(0, eq).trim();
		const val = trimmed
			.slice(eq + 1)
			.trim()
			.replace(/^["']|["']$/g, '');
		env[key] = val;
	}
	return env;
}

const env = loadEnv(resolve(root, '.env'));
const clientId = env.SPOTIFY_CLIENT_ID;
const clientSecret = env.SPOTIFY_CLIENT_SECRET;

if (!clientId || !clientSecret) {
	console.error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set in .env');
	process.exit(1);
}

// --- extract playlist IDs from samplePlaylistUrls.ts ---
const urlsSource = readFileSync(resolve(root, 'src/lib/samplePlaylistUrls.ts'), 'utf8');
const idPattern = /spotify\.com\/playlist\/([a-zA-Z0-9]{22})/g;
const ids = [...urlsSource.matchAll(idPattern)].map((m) => m[1]);

if (ids.length === 0) {
	console.error('No playlist IDs found in samplePlaylistUrls.ts');
	process.exit(1);
}

// --- Spotify client credentials ---
async function getToken() {
	const res = await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
		},
		body: 'grant_type=client_credentials'
	});
	if (!res.ok) throw new Error(`Token request failed: ${res.status} ${await res.text()}`);
	const data = await res.json();
	return data.access_token;
}

async function getPlaylist(id, token) {
	const res = await fetch(`https://api.spotify.com/v1/playlists/${id}?fields=id,name,images`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	if (!res.ok) throw new Error(`Playlist ${id} failed: ${res.status} ${await res.text()}`);
	return res.json();
}

// --- main ---
const token = await getToken();
console.error(`Fetching ${ids.length} playlists...\n`);

const results = [];
for (const id of ids) {
	try {
		const pl = await getPlaylist(id, token);
		// prefer the 300px image; fall back to largest available
		const image =
			pl.images?.find((img) => img.width === 300)?.url ??
			pl.images?.sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ??
			'';
		results.push({ id, name: pl.name, imageUrl: image });
		console.error(`  ✓  ${pl.name}`);
	} catch (e) {
		console.error(`  ✗  ${id}: ${e.message}`);
		results.push({ id, name: `Unknown (${id})`, imageUrl: '' });
	}
}

// --- print updated playlistMeta block ---
const lines = results.map(
	({ id, name, imageUrl }) =>
		`\t'${id}': {\n\t\tname: '${name.replace(/'/g, "\\'")}',\n\t\timageUrl: '${imageUrl}'\n\t}`
);

console.log('\n// Paste this into the playlistMeta record in src/lib/samplePlaylists.ts:\n');
console.log(
	`const playlistMeta: Record<string, { name: string; imageUrl: string }> = {\n${lines.join(',\n')}\n};`
);
