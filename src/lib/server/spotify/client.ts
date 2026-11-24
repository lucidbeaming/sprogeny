/**
 * Server-side Spotify API client using Feb 2026 endpoints.
 * Token must be obtained via auth.api.getAccessToken({ providerId: "spotify" })
 * or via getClientCredentialsToken() for app-level access (no user login needed).
 */

import { env } from '$env/dynamic/private';
import { log } from '$lib/server/logger';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const MAX_RETRIES = 3;

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

let cachedCCToken: { token: string; expiresAt: number } | null = null;

/** Get a client credentials token for app-level Spotify API access (read-only, no user context). */
export async function getClientCredentialsToken(): Promise<string> {
	if (cachedCCToken && Date.now() < cachedCCToken.expiresAt) {
		return cachedCCToken.token;
	}
	const clientId = env.SPOTIFY_CLIENT_ID ?? '';
	const clientSecret = env.SPOTIFY_CLIENT_SECRET ?? '';
	if (!clientId || !clientSecret) {
		throw new Error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set');
	}
	const res = await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`
		},
		body: 'grant_type=client_credentials'
	});
	if (!res.ok) {
		throw new Error(`Spotify client credentials failed: ${res.status}`);
	}
	const data = (await res.json()) as { access_token: string; expires_in: number };
	cachedCCToken = {
		token: data.access_token,
		expiresAt: Date.now() + (data.expires_in - 60) * 1000
	};
	log.spotify('Client credentials token obtained');
	return cachedCCToken.token;
}

export async function spotifyFetch<T>(
	path: string,
	accessToken: string,
	options?: RequestInit
): Promise<T> {
	const url = path.startsWith('http') ? path : `${SPOTIFY_API_BASE}${path}`;
	const method = options?.method ?? 'GET';
	const logPath = path.startsWith('http') ? url : path;

	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		if (attempt > 0) log.spotify('Retry', { attempt, path: logPath });
		else log.spotify('Request', { method, path: logPath });

		const res = await fetch(url, {
			...options,
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
				...options?.headers
			}
		});

		if (res.status === 429 && attempt < MAX_RETRIES) {
			const retryAfter = parseInt(res.headers.get('Retry-After') ?? '', 10);
			const waitMs = (Number.isFinite(retryAfter) ? retryAfter : attempt + 1) * 1000;
			log.spotify('Rate limited, waiting', { waitMs, path: logPath });
			await delay(waitMs);
			continue;
		}

		if (res.status >= 500 && attempt < MAX_RETRIES) {
			const waitMs = Math.pow(2, attempt) * 1000;
			log.spotify('Server error, retrying', { status: res.status, waitMs, path: logPath });
			await delay(waitMs);
			continue;
		}

		if (!res.ok) {
			const text = await res.text();
			let body: unknown = text;
			try {
				body = JSON.parse(text);
			} catch {
				// keep as string
			}
			log.spotify('API error response', {
				status: res.status,
				statusText: res.statusText,
				path: logPath,
				body
			});
			throw new Error(`Spotify API ${res.status}: ${text}`);
		}

		log.spotify('Response OK', { status: res.status, path: logPath });
		return res.json() as Promise<T>;
	}

	throw new Error(`Spotify API: max retries exceeded for ${logPath}`);
}

/** GET /playlists/{id}/items with pagination (Feb 2026: use /items not /tracks) */
export async function getPlaylistItems(
	playlistId: string,
	accessToken: string,
	limit = 100,
	offset = 0
) {
	return spotifyFetch<import('./types').SpotifyPlaylistItemsResponse>(
		`/playlists/${playlistId}/items?limit=${limit}&offset=${offset}`,
		accessToken
	);
}

/** GET /me/playlists with pagination */
export async function getCurrentUserPlaylists(accessToken: string, limit = 50, offset = 0) {
	return spotifyFetch<import('./types').SpotifyCurrentUserPlaylistsResponse>(
		`/me/playlists?limit=${limit}&offset=${offset}`,
		accessToken
	);
}

/** GET /playlists/{id} – metadata only (Feb 2026: items only for own playlists) */
export async function getPlaylist(playlistId: string, accessToken: string) {
	return spotifyFetch<import('./types').SpotifyPlaylist>(`/playlists/${playlistId}`, accessToken);
}

/** POST /me/playlists – create playlist (Feb 2026: use /me/playlists not /users/{id}/playlists) */
export async function createPlaylist(
	accessToken: string,
	name: string,
	description?: string,
	public_ = true
) {
	return spotifyFetch<import('./types').SpotifyCreatePlaylistResponse>(
		'/me/playlists',
		accessToken,
		{
			method: 'POST',
			body: JSON.stringify({
				name,
				description: description ?? '',
				public: public_
			})
		}
	);
}

/** POST /playlists/{id}/items – add items (Feb 2026: use /items not /tracks). uris must be spotify:track:id format. */
export async function addPlaylistItems(playlistId: string, accessToken: string, uris: string[]) {
	// Spotify allows max 100 per request
	for (let i = 0; i < uris.length; i += 100) {
		const batch = uris.slice(i, i + 100);
		await spotifyFetch<{ snapshot_id: string }>(`/playlists/${playlistId}/items`, accessToken, {
			method: 'POST',
			body: JSON.stringify({ uris: batch })
		});
	}
}

/** GET /me – current user id */
export async function getCurrentUserId(accessToken: string): Promise<string> {
	const user = await spotifyFetch<import('./types').SpotifyCurrentUser>('/me', accessToken);
	return user.id;
}

/** GET /tracks/{id} – fetch individual tracks (Feb 2026: batch GET /tracks?ids= removed) */
export async function getSeveralTracks(
	ids: string[],
	accessToken: string
): Promise<import('./types').SpotifyTrackFull[]> {
	if (ids.length === 0) return [];
	const results: import('./types').SpotifyTrackFull[] = [];
	// Fetch in small parallel batches with delay to respect rate limits
	const BATCH_SIZE = 3;
	const BATCH_DELAY_MS = 200;
	for (let i = 0; i < ids.length; i += BATCH_SIZE) {
		if (i > 0) await delay(BATCH_DELAY_MS);
		const batch = ids.slice(i, i + BATCH_SIZE);
		const fetched = await Promise.all(
			batch.map((id) =>
				spotifyFetch<import('./types').SpotifyTrackFull>(`/tracks/${id}`, accessToken).catch(
					() => null
				)
			)
		);
		for (const t of fetched) {
			if (t) results.push(t);
		}
	}
	return results;
}
