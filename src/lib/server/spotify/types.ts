/**
 * Spotify Web API response types (February 2026 shape).
 * Playlist uses `items` (not `tracks`); each entry has `item` (not `track`).
 */

export interface SpotifyTrack {
	id: string;
	type: 'track';
	uri?: string;
}

/** GET /tracks?ids= – full track object */
export interface SpotifyImage {
	url: string;
	height?: number | null;
	width?: number | null;
}

export interface SpotifyTrackFull {
	id: string;
	name: string;
	artists?: Array<{ name: string; id?: string }>;
	album?: { images?: SpotifyImage[] };
}

export interface SpotifyEpisode {
	id: string;
	type: 'episode';
	uri?: string;
}

export type SpotifyPlaylistItem = SpotifyTrack | SpotifyEpisode;

/** GET /playlists/{id}/items – Feb 2026: items.items[].item */
export interface SpotifyPlaylistItemsResponse {
	href: string;
	limit: number;
	next: string | null;
	offset: number;
	previous: string | null;
	total: number;
	items: Array<{
		item: SpotifyPlaylistItem | null;
		added_at?: string;
	}>;
}

/** GET /me/playlists – playlist summary (Feb 2026: tracks → items) */
export interface SpotifyPlaylistSummary {
	id: string;
	name: string;
	images?: SpotifyImage[];
	items?: { total: number };
	tracks?: { total: number };
}

export interface SpotifyPaging<T> {
	href: string;
	items: T[];
	limit: number;
	next: string | null;
	offset: number;
	previous: string | null;
	total: number;
}

/** GET /me/playlists response */
export interface SpotifyCurrentUserPlaylistsResponse {
	href: string;
	items: SpotifyPlaylistSummary[];
	limit: number;
	next: string | null;
	offset: number;
	previous: string | null;
	total: number;
}

/** GET /playlists/{id} – playlist metadata (Feb 2026: tracks → items) */
export interface SpotifyPlaylist {
	id: string;
	name: string;
	images?: SpotifyImage[];
	items?: { total: number };
	tracks?: { total: number };
}

/** POST /me/playlists – create playlist response */
export interface SpotifyCreatePlaylistResponse {
	id: string;
	name: string;
	external_urls?: { spotify: string };
}

/** GET /me – current user */
export interface SpotifyCurrentUser {
	id: string;
	display_name?: string;
}
