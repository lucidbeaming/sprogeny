import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { RequestHandler } from './$types';
import { auth } from '$lib/server/auth';
import { getPlaylist, getClientCredentialsToken } from '$lib/server/spotify/client';
import { extractPlaylistId } from '$lib/playlistId';
import { log } from '$lib/server/logger';
import { rateLimit } from '$lib/server/rateLimit';

async function getAccessTokenFromSession(headers: Headers): Promise<string | null> {
	const session = await auth.api.getSession({ headers });
	if (!session?.user) return null;

	try {
		log.auth('Playlist API: getAccessToken(spotify)');
		const tokenRes = (await auth.api.getAccessToken({
			body: { providerId: 'spotify' },
			headers
		})) as { accessToken?: string; scope?: string } | Response;
		const data =
			tokenRes instanceof Response ? await tokenRes.json() : (tokenRes as Record<string, unknown>);
		const token = (data?.accessToken as string) ?? '';
		log.auth('Playlist API: getAccessToken', { hasToken: !!token });
		return token || null;
	} catch (e) {
		log.auth('Playlist API: getAccessToken threw', { error: String(e) });
		return null;
	}
}

export const GET: RequestHandler = async (event) => {
	const limited = rateLimit(event, { limit: 30, windowMs: 60_000 });
	if (limited) return limited;

	const id = event.url.searchParams.get('id') ?? '';
	const playlistId = extractPlaylistId(id) || id.trim();
	if (!playlistId) {
		return json({ error: 'Invalid playlist ID or URL' }, { status: 400 });
	}

	// Try user token first
	let accessToken = await getAccessTokenFromSession(event.request.headers);

	// In dev mode, fall back to client credentials
	if (!accessToken && dev) {
		try {
			accessToken = await getClientCredentialsToken();
		} catch (e) {
			log.spotify('Playlist API: client credentials failed', { error: String(e) });
			return json({ error: 'Could not obtain Spotify access' }, { status: 500 });
		}
	}

	if (!accessToken) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const playlist = await getPlaylist(playlistId, accessToken);
		return json({
			id: playlist.id,
			name: playlist.name,
			tracksCount: playlist.items?.total ?? playlist.tracks?.total ?? 0,
			imageUrl: playlist.images?.[0]?.url
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		log.spotify('Playlist API: getPlaylist error', { message, playlistId });
		if (message.includes('403') || message.includes('404')) {
			return json({ error: 'Playlist not found or private' }, { status: 403 });
		}
		return json({ error: 'Failed to fetch playlist' }, { status: 500 });
	}
};
