/**
 * Extract Spotify playlist ID from pasted input.
 * Supports: open.spotify.com/playlist/<id>, embed/playlist/<id>, spotify:playlist:<id>, or raw 22-char ID.
 */

const PLAYLIST_ID_REGEX =
	/(?:open\.spotify\.com\/(?:playlist|embed\/playlist)\/([a-zA-Z0-9]{22}))|(?:spotify:playlist:([a-zA-Z0-9]{22}))|(?:^([a-zA-Z0-9]{22})$)/;

/**
 * Returns the playlist ID if found, otherwise null.
 */
export function extractPlaylistId(input: string | null | undefined): string | null {
	if (input == null || typeof input !== 'string') return null;
	const trimmed = input.trim();
	if (!trimmed) return null;
	const match = trimmed.match(PLAYLIST_ID_REGEX);
	if (!match) return null;
	// One of the capture groups will have the ID
	return match[1] ?? match[2] ?? match[3] ?? null;
}
