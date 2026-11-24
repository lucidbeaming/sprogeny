import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { SIMULATIONMODE } from '$env/static/private';
import type { RequestHandler } from './$types';
import { auth } from '$lib/server/auth';
import {
	combinePlaylists,
	simulateCombinePlaylists,
	clearUsedTracks
} from '$lib/server/spotify/combine';
import { getSeveralTracks, getClientCredentialsToken } from '$lib/server/spotify/client';
import { log, anonymizeId } from '$lib/server/logger';
import { rateLimit } from '$lib/server/rateLimit';

const MAX_PLAYLISTS = 20;

function parseAndValidateBody(body: Record<string, unknown>) {
	const playlistIds = Array.isArray(body.playlistIds) ? (body.playlistIds as string[]) : [];
	const weights = Array.isArray(body.weights) ? (body.weights as number[]) : [];
	const numPlaylists =
		typeof body.numPlaylists === 'number'
			? Math.max(1, Math.min(5, Math.floor(body.numPlaylists)))
			: undefined;
	const tracksPerPlaylist =
		typeof body.tracksPerPlaylist === 'number'
			? Math.max(10, Math.min(300, Math.floor(body.tracksPerPlaylist)))
			: undefined;

	if (playlistIds.length === 0) return { error: 'At least one playlist required' };
	if (playlistIds.length > MAX_PLAYLISTS)
		return { error: `Maximum ${MAX_PLAYLISTS} playlists allowed` };
	if (weights.length !== 0 && weights.length !== playlistIds.length)
		return { error: 'weights length must match playlistIds length' };

	const validId = /^[a-zA-Z0-9]{22}$/;
	if (playlistIds.some((id) => typeof id !== 'string' || !validId.test(id)))
		return { error: 'Invalid playlist ID format' };

	const allowRepeats = typeof body.allowRepeats === 'boolean' ? body.allowRepeats : true;

	const normalizedWeights =
		weights.length === playlistIds.length ? weights : playlistIds.map(() => 1 / playlistIds.length);

	if (normalizedWeights.some((w) => typeof w !== 'number' || w < 0 || !Number.isFinite(w)))
		return { error: 'Invalid weights' };

	return { playlistIds, weights: normalizedWeights, numPlaylists, tracksPerPlaylist, allowRepeats };
}

async function getAccessTokenFromSession(headers: Headers): Promise<string | null> {
	const session = await auth.api.getSession({ headers });
	if (!session?.user) return null;

	try {
		const tokenRes = (await auth.api.getAccessToken({
			body: { providerId: 'spotify' },
			headers
		})) as { accessToken?: string; scope?: string } | Response;
		const data =
			tokenRes instanceof Response ? await tokenRes.json() : (tokenRes as Record<string, unknown>);
		return ((data?.accessToken as string) ?? '') || null;
	} catch {
		return null;
	}
}

function trackDetailsToResponse(
	selectedTrackIds: string[],
	trackDetails: {
		id: string;
		name: string;
		artists?: { name: string }[];
		album?: { images?: { url: string }[] };
	}[]
) {
	const byId = new Map(
		trackDetails.map((t) => [
			t.id,
			{
				name: t.name,
				artist: t.artists?.map((a) => a.name).join(', ') ?? '',
				imageUrl: t.album?.images?.[t.album.images.length - 1]?.url
			}
		])
	);
	return selectedTrackIds.map((id) => ({
		id,
		name: byId.get(id)?.name ?? 'Unknown',
		artist: byId.get(id)?.artist ?? '',
		imageUrl: byId.get(id)?.imageUrl
	}));
}

export const POST: RequestHandler = async (event) => {
	const ip = event.getClientAddress();
	const requestStart = Date.now();

	const limited = rateLimit(event, { limit: 10, windowMs: 60_000 });
	if (limited) {
		log.combine('API POST: rate limited', { ip });
		return limited;
	}

	let body: Record<string, unknown>;
	try {
		body = await event.request.json();
	} catch {
		log.combine('API POST: invalid JSON body', { ip });
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const parsed = parseAndValidateBody(body);
	if ('error' in parsed) {
		log.combine('API POST: validation failed', { ip, error: parsed.error });
		return json({ error: parsed.error }, { status: 400 });
	}
	const { playlistIds, weights, numPlaylists, tracksPerPlaylist, allowRepeats } = parsed;

	const simulate = body.simulate === true;

	log.combine('API POST: request', {
		ip,
		simulate,
		playlistCount: playlistIds.length,
		numPlaylists,
		tracksPerPlaylist
	});

	// Try user session first
	log.auth('Combine API: getSession');
	const session = await auth.api.getSession({ headers: event.request.headers });
	let accessToken = session?.user ? await getAccessTokenFromSession(event.request.headers) : null;

	// In dev or simulation mode, fall back to client credentials for simulate requests
	if (!accessToken && simulate && (dev || SIMULATIONMODE === 'true')) {
		try {
			accessToken = await getClientCredentialsToken();
		} catch (e) {
			log.combine('API POST: client credentials failed', { ip, error: String(e) });
			return json({ error: 'Could not obtain Spotify access' }, { status: 500 });
		}
	}

	if (!accessToken) {
		log.combine('API POST: unauthorized (no access token)', { ip });
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		if (simulate) {
			const { playlists, selectedTrackIds } = await simulateCombinePlaylists({
				playlistIds,
				weights,
				accessToken,
				numPlaylists,
				tracksPerPlaylist,
				allowRepeats
			});
			const trackDetails = await getSeveralTracks(selectedTrackIds, accessToken);
			const tracks = trackDetailsToResponse(selectedTrackIds, trackDetails);
			log.combine('API POST: simulate complete', {
				ip,
				playlistCount: playlists.length,
				trackCount: tracks.length,
				ms: Date.now() - requestStart
			});
			return json({ playlists, tracks, simulated: true });
		}

		if (!session?.user) {
			log.combine('API POST: unauthorized (no session user)', { ip });
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const {
			playlists: created,
			selectedTrackIds,
			historyReset
		} = await combinePlaylists({
			playlistIds,
			weights,
			accessToken,
			userId: session.user.id,
			numPlaylists,
			tracksPerPlaylist,
			allowRepeats
		});
		const trackDetails = await getSeveralTracks(selectedTrackIds, accessToken);
		const tracks = trackDetailsToResponse(selectedTrackIds, trackDetails);
		log.combine('API POST: complete', {
			ip,
			uid: anonymizeId(session.user.id),
			createdCount: created.length,
			trackCount: tracks.length,
			historyReset,
			ms: Date.now() - requestStart
		});
		return json({ playlists: created, tracks, historyReset });
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		log.combine('API POST: error', { ip, message, ms: Date.now() - requestStart });
		return json({ error: 'Failed to create playlists' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async (event) => {
	const ip = event.getClientAddress();

	const limited = rateLimit(event, { limit: 5, windowMs: 60_000 });
	if (limited) {
		log.combine('API DELETE: rate limited', { ip });
		return limited;
	}

	log.auth('Combine API DELETE: getSession');
	const session = await auth.api.getSession({ headers: event.request.headers });
	if (!session?.user) {
		log.combine('API DELETE: unauthorized', { ip });
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		await clearUsedTracks(session.user.id);
		log.combine('API DELETE: cleared history', { ip, uid: anonymizeId(session.user.id) });
		return json({ success: true });
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		log.combine('API DELETE: error', { ip, message });
		return json({ error: 'Failed to clear history' }, { status: 500 });
	}
};
