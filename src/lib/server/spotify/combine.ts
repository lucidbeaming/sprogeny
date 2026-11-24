/**
 * Combine and shuffle multiple playlists, then create 3 new playlists.
 * Uses Feb 2026 API (GET/POST /playlists/{id}/items), used_playlist_tracks with hashed user id.
 */

import { createHash } from 'node:crypto';
import { db } from '$lib/server/db';
import { usedPlaylistTracks } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getPlaylistItems, createPlaylist, addPlaylistItems } from './client';
import { log, anonymizeId } from '$lib/server/logger';

function ms(start: number): number {
	return Date.now() - start;
}
import { randomPlaylistName } from './playlistNames';

const BATCH_SIZE = 100;
const DEFAULT_NUM_PLAYLISTS = 3;
const DEFAULT_TRACKS_PER_PLAYLIST = 100;

function hashUserId(userId: string): string {
	return createHash('sha256').update(userId).digest('hex');
}

/**
 * Compute how many tracks to take from each playlist.
 * Starts from weighted targets, caps at each playlist's available track count,
 * then iteratively redistributes any shortfall to playlists that still have capacity.
 */
function computeAllocations(caps: number[], weights: number[], desired: number): number[] {
	const alloc = weights.map((w) => Math.ceil(desired * w));

	for (let iter = 0; iter < caps.length; iter++) {
		let shortfall = 0;
		let flexWeightSum = 0;

		for (let i = 0; i < alloc.length; i++) {
			if (alloc[i] > caps[i]) {
				shortfall += alloc[i] - caps[i];
				alloc[i] = caps[i];
			}
		}
		if (shortfall === 0) break;

		for (let i = 0; i < alloc.length; i++) {
			if (alloc[i] < caps[i]) flexWeightSum += weights[i];
		}
		if (flexWeightSum === 0) break; // all playlists fully used

		for (let i = 0; i < alloc.length; i++) {
			if (alloc[i] < caps[i]) {
				alloc[i] += Math.round(shortfall * (weights[i] / flexWeightSum));
			}
		}
	}

	return alloc.map((a, i) => Math.min(a, caps[i]));
}

/** Fisher–Yates shuffle in place */
function shuffle<T>(arr: T[]): void {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
}

/** Fetch all playlist item IDs (tracks only; Feb 2026: items[].item). Returns [] on 404. */
async function fetchAllPlaylistTrackIds(
	playlistId: string,
	accessToken: string
): Promise<string[]> {
	const ids: string[] = [];
	let offset = 0;
	let total = 0;

	const start = Date.now();
	try {
		do {
			const res = await getPlaylistItems(playlistId, accessToken, BATCH_SIZE, offset);
			total = res.total;
			for (const entry of res.items) {
				const item = entry.item;
				if (item && item.type === 'track' && item.id) {
					ids.push(item.id);
				}
			}
			offset += res.items.length;
		} while (offset < total);
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		if (msg.includes('404')) {
			log.spotify('Playlist not found, skipping', { playlistId });
			return [];
		}
		throw e;
	}

	log.combine('Fetched playlist tracks', { playlistId, trackCount: ids.length, ms: ms(start) });
	return ids;
}

/** Get used track IDs for this user (by hash) */
async function getUsedTrackIds(userIdHash: string): Promise<Set<string>> {
	const rows = await db
		.select({ trackId: usedPlaylistTracks.trackId })
		.from(usedPlaylistTracks)
		.where(eq(usedPlaylistTracks.userIdHash, userIdHash));
	return new Set(rows.map((r) => r.trackId));
}

/** Delete all used track IDs for this user */
export async function clearUsedTracks(userId: string): Promise<void> {
	const userIdHash = hashUserId(userId);
	await db.delete(usedPlaylistTracks).where(eq(usedPlaylistTracks.userIdHash, userIdHash));
	log.combine('clearUsedTracks: cleared', { uid: anonymizeId(userId) });
}

/** Insert used track IDs (ignore conflicts on unique) */
async function insertUsedTrackIds(userIdHash: string, trackIds: string[]): Promise<void> {
	if (trackIds.length === 0) return;
	await db
		.insert(usedPlaylistTracks)
		.values(trackIds.map((trackId) => ({ userIdHash, trackId })))
		.onConflictDoNothing({ target: [usedPlaylistTracks.userIdHash, usedPlaylistTracks.trackId] });
}

export interface CombineInput {
	playlistIds: string[];
	weights: number[];
	accessToken: string;
	userId: string;
	/** Number of playlists to create (1–5). Default 3. */
	numPlaylists?: number;
	/** Tracks per playlist (10–300). Default 100. */
	tracksPerPlaylist?: number;
	/** Allow the same track to appear more than once (from different sources). Default true. */
	allowRepeats?: boolean;
}

export interface SimulateInput {
	playlistIds: string[];
	weights: number[];
	accessToken: string;
	numPlaylists?: number;
	tracksPerPlaylist?: number;
	/** Allow the same track to appear more than once (from different sources). Default true. */
	allowRepeats?: boolean;
}

export interface CreatedPlaylist {
	id: string;
	name: string;
	url: string;
}

export interface CombineResult {
	playlists: CreatedPlaylist[];
	selectedTrackIds: string[];
	historyReset?: boolean;
}

export async function combinePlaylists(input: CombineInput): Promise<CombineResult> {
	const {
		playlistIds,
		weights,
		accessToken,
		userId,
		numPlaylists = DEFAULT_NUM_PLAYLISTS,
		tracksPerPlaylist = DEFAULT_TRACKS_PER_PLAYLIST,
		allowRepeats = true
	} = input;

	if (playlistIds.length === 0) throw new Error('At least one playlist required');
	if (weights.length !== playlistIds.length) {
		throw new Error('weights length must match playlistIds length');
	}

	const totalStart = Date.now();
	const tracksPer = Math.max(10, Math.min(300, tracksPerPlaylist));
	const n = Math.max(1, Math.min(5, numPlaylists));

	log.combine('combinePlaylists: start', {
		playlistCount: playlistIds.length,
		numPlaylists: n,
		tracksPerPlaylist: tracksPer,
		uid: anonymizeId(userId)
	});

	// Normalize weights to sum 1
	const sum = weights.reduce((a, b) => a + b, 0);
	const normalizedWeights =
		sum > 0 ? weights.map((w) => w / sum) : weights.map(() => 1 / weights.length);

	// Fetch all tracks per playlist
	const fetchStart = Date.now();
	const allPlaylistTracks: string[][] = [];
	for (const playlistId of playlistIds) {
		const ids = await fetchAllPlaylistTrackIds(playlistId, accessToken);
		allPlaylistTracks.push(ids);
	}
	log.combine('combinePlaylists: fetched all playlists', {
		trackCounts: allPlaylistTracks.map((t) => t.length),
		ms: ms(fetchStart)
	});

	// Weighted combine with shortfall redistribution
	const desired = n * tracksPer;
	const caps = allPlaylistTracks.map((t) => t.length);
	const allocations = computeAllocations(caps, normalizedWeights, desired);
	log.combine('combinePlaylists: allocations', { allocations, caps });

	const seen = new Set<string>();
	const combined: string[] = [];
	for (let i = 0; i < playlistIds.length; i++) {
		const tracks = allPlaylistTracks[i];
		shuffle(tracks);
		for (const id of tracks.slice(0, allocations[i])) {
			if (allowRepeats || !seen.has(id)) {
				seen.add(id);
				combined.push(id);
			}
		}
	}

	// Shuffle combined 3×
	shuffle(combined);
	shuffle(combined);
	shuffle(combined);

	const userIdHash = hashUserId(userId);
	const usedIds = await getUsedTrackIds(userIdHash);
	let filtered = combined.filter((id) => !usedIds.has(id));
	let historyReset = false;

	log.combine('combinePlaylists: deduplication', {
		combinedCount: combined.length,
		usedCount: usedIds.size,
		filteredCount: filtered.length,
		removedCount: combined.length - filtered.length
	});

	// If all tracks are used up, auto-reset history and use the full combined pool
	if (filtered.length === 0 && combined.length > 0) {
		log.combine('combinePlaylists: history exhausted, auto-resetting');
		await db.delete(usedPlaylistTracks).where(eq(usedPlaylistTracks.userIdHash, userIdHash));
		filtered = combined;
		historyReset = true;
	}

	// Use up to n * tracksPer tracks; fill playlists with tracksPer each (last may have fewer)
	const totalAvailable = Math.min(filtered.length, n * tracksPer);
	if (totalAvailable === 0) {
		log.combine('combinePlaylists: no tracks available');
		return { playlists: [], selectedTrackIds: [] };
	}

	const lists: string[][] = [];
	const selectedTrackIds: string[] = [];
	let offset = 0;
	for (let i = 0; i < n && offset < totalAvailable; i++) {
		const size = Math.min(tracksPer, totalAvailable - offset);
		const chunk = filtered.slice(offset, offset + size);
		lists.push(chunk);
		selectedTrackIds.push(...chunk);
		offset += size;
	}

	const created: CreatedPlaylist[] = [];

	for (const trackIds of lists) {
		if (trackIds.length === 0) continue;

		const name = randomPlaylistName();
		const createStart = Date.now();
		const playlist = await createPlaylist(accessToken, name, 'Generated by Sprogeny', true);

		const uris = trackIds.map((id) => `spotify:track:${id}`);
		await addPlaylistItems(playlist.id, accessToken, uris);

		await insertUsedTrackIds(userIdHash, trackIds);

		log.combine('combinePlaylists: created playlist', {
			playlistId: playlist.id,
			name,
			trackCount: trackIds.length,
			ms: ms(createStart)
		});

		created.push({
			id: playlist.id,
			name,
			url: playlist.external_urls?.spotify ?? `https://open.spotify.com/playlist/${playlist.id}`
		});
	}

	log.combine('combinePlaylists: complete', {
		createdCount: created.length,
		totalTrackCount: selectedTrackIds.length,
		ms: ms(totalStart)
	});

	return { playlists: created, selectedTrackIds, historyReset };
}

/** Same selection algorithm as combinePlaylists but without creating playlists or writing to DB. */
export async function simulateCombinePlaylists(input: SimulateInput): Promise<CombineResult> {
	const {
		playlistIds,
		weights,
		accessToken,
		numPlaylists = DEFAULT_NUM_PLAYLISTS,
		tracksPerPlaylist = DEFAULT_TRACKS_PER_PLAYLIST,
		allowRepeats = true
	} = input;

	if (playlistIds.length === 0) throw new Error('At least one playlist required');
	if (weights.length !== playlistIds.length) {
		throw new Error('weights length must match playlistIds length');
	}

	const totalStart = Date.now();
	const tracksPer = Math.max(10, Math.min(300, tracksPerPlaylist));
	const n = Math.max(1, Math.min(5, numPlaylists));

	log.combine('simulateCombinePlaylists: start', {
		playlistCount: playlistIds.length,
		numPlaylists: n,
		tracksPerPlaylist: tracksPer
	});

	const sum = weights.reduce((a, b) => a + b, 0);
	const normalizedWeights =
		sum > 0 ? weights.map((w) => w / sum) : weights.map(() => 1 / weights.length);

	const allPlaylistTracks: string[][] = [];
	for (const playlistId of playlistIds) {
		const ids = await fetchAllPlaylistTrackIds(playlistId, accessToken);
		allPlaylistTracks.push(ids);
	}

	log.combine('simulateCombinePlaylists: fetched playlists', {
		trackCounts: allPlaylistTracks.map((t) => t.length)
	});

	const desired = n * tracksPer;
	const caps = allPlaylistTracks.map((t) => t.length);
	const allocations = computeAllocations(caps, normalizedWeights, desired);

	const seenSim = new Set<string>();
	const combined: string[] = [];
	for (let i = 0; i < playlistIds.length; i++) {
		const tracks = allPlaylistTracks[i];
		shuffle(tracks);
		for (const id of tracks.slice(0, allocations[i])) {
			if (allowRepeats || !seenSim.has(id)) {
				seenSim.add(id);
				combined.push(id);
			}
		}
	}

	shuffle(combined);
	shuffle(combined);
	shuffle(combined);

	const totalAvailable = Math.min(combined.length, desired);
	if (totalAvailable === 0) {
		log.combine('simulateCombinePlaylists: no tracks available');
		return { playlists: [], selectedTrackIds: [] };
	}

	const lists: string[][] = [];
	const selectedTrackIds: string[] = [];
	let offset = 0;
	for (let i = 0; i < n && offset < totalAvailable; i++) {
		const size = Math.min(tracksPer, totalAvailable - offset);
		const chunk = combined.slice(offset, offset + size);
		lists.push(chunk);
		selectedTrackIds.push(...chunk);
		offset += size;
	}

	const playlists: CreatedPlaylist[] = lists
		.filter((chunk) => chunk.length > 0)
		.map(() => {
			const name = randomPlaylistName();
			return { id: '', name, url: '' };
		});

	log.combine('simulateCombinePlaylists: complete', {
		simulatedCount: playlists.length,
		totalTrackCount: selectedTrackIds.length,
		ms: ms(totalStart)
	});

	return { playlists, selectedTrackIds };
}
