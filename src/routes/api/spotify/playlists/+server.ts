import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/server/auth';
import { getCurrentUserPlaylists } from '$lib/server/spotify/client';
import { log } from '$lib/server/logger';
import { rateLimit } from '$lib/server/rateLimit';

export const GET: RequestHandler = async (event) => {
	const limited = rateLimit(event, { limit: 10, windowMs: 60_000 });
	if (limited) return limited;

	log.auth('Playlists API: getSession');
	const session = await auth.api.getSession({ headers: event.request.headers });
	if (!session?.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	let accessToken: string;
	try {
		log.auth('Playlists API: getAccessToken(spotify)');
		const tokenRes = (await auth.api.getAccessToken({
			body: { providerId: 'spotify' },
			headers: event.request.headers
		})) as { accessToken?: string; scope?: string } | Response;
		const data =
			tokenRes instanceof Response ? await tokenRes.json() : (tokenRes as Record<string, unknown>);
		accessToken = (data?.accessToken as string) ?? '';
		log.auth('Playlists API: getAccessToken', { hasToken: !!accessToken });
	} catch (e) {
		log.auth('Playlists API: getAccessToken threw', { error: String(e) });
		return json({ error: 'Spotify account not linked' }, { status: 400 });
	}
	if (!accessToken) {
		return json({ error: 'Spotify account not linked' }, { status: 400 });
	}

	const all: { id: string; name: string; tracksCount: number; imageUrl?: string }[] = [];
	let offset = 0;
	let hasMore = true;

	while (hasMore) {
		const res = await getCurrentUserPlaylists(accessToken, 50, offset);
		for (const pl of res.items) {
			all.push({
				id: pl.id,
				name: pl.name,
				tracksCount: pl.items?.total ?? pl.tracks?.total ?? 0,
				imageUrl: pl.images?.[0]?.url
			});
		}
		offset += res.items.length;
		hasMore = res.next != null;
	}

	return json(all);
};
