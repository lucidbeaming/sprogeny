import { pgTable, text, unique } from 'drizzle-orm/pg-core';

/** Used track IDs per user (hashed) for duplicate avoidance. No raw user id stored. */
export const usedPlaylistTracks = pgTable(
	'used_playlist_tracks',
	{
		userIdHash: text('user_id_hash').notNull(),
		trackId: text('track_id').notNull()
	},
	(t) => [unique().on(t.userIdHash, t.trackId)]
);

export * from './auth.schema';
