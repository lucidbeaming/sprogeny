import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { genericOAuth } from 'better-auth/plugins';
import { createAuthMiddleware } from 'better-auth/api';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { log, anonymizeId } from '$lib/server/logger';

const spotifyClientId = env.SPOTIFY_CLIENT_ID ?? '';
const spotifyScope = [
	'playlist-read-private',
	'playlist-read-collaborative',
	'playlist-modify-public',
	'playlist-modify-private'
];

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailAndPassword: { enabled: false },
	logger: {
		error: (message, ...args) => log.authError(message, args.length ? args : undefined),
		warn: (message, ...args) => log.authWarn(message, args.length ? args : undefined),
		info: () => {},
		debug: () => {}
	},
	hooks: {
		after: createAuthMiddleware(async (ctx) => {
			const session = ctx.context.newSession;
			if (!session) return;
			const isNew = ctx.path.includes('sign-up') || ctx.path.includes('callback');
			log.auth(isNew ? 'Session created' : 'Session refreshed', {
				path: ctx.path,
				uid: anonymizeId(session.session.userId)
			});
		})
	},
	plugins: [
		genericOAuth({
			config: [
				{
					providerId: 'spotify',
					clientId: spotifyClientId,
					clientSecret: env.SPOTIFY_CLIENT_SECRET ?? '',
					authorizationUrl: 'https://accounts.spotify.com/authorize',
					tokenUrl: 'https://accounts.spotify.com/api/token',
					redirectURI: `${env.ORIGIN}/api/auth/oauth2/callback/spotify`,
					scopes: spotifyScope,
					// Spotify removed email from /me responses in February 2026.
					// Synthesize a stable email from the Spotify ID as fallback.
					getUserInfo: async (tokens) => {
						const res = await fetch('https://api.spotify.com/v1/me', {
							headers: { Authorization: `Bearer ${tokens.accessToken}` }
						});
						const text = await res.text();
						if (!res.ok) {
							log.authError('Spotify /me failed', {
								status: res.status,
								body: text.slice(0, 200)
							});
							throw new Error(`Spotify /me ${res.status}: ${text.slice(0, 200)}`);
						}
						let profile;
						try {
							profile = JSON.parse(text);
						} catch {
							log.authError('Spotify /me returned non-JSON', {
								status: res.status,
								body: text.slice(0, 200)
							});
							throw new Error(`Spotify /me non-JSON response: ${text.slice(0, 200)}`);
						}
						return {
							id: profile.id,
							name: profile.display_name ?? profile.id,
							email: profile.email ?? `spotify_${profile.id}@sprogeny.app`,
							emailVerified: false,
							image: profile.images?.[0]?.url ?? null
						};
					}
				}
			]
		}),
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});

log.auth('Spotify provider config', {
	clientIdSet: !!spotifyClientId,
	clientIdPrefix: spotifyClientId ? `${spotifyClientId.slice(0, 8)}…` : '(empty)',
	scope: spotifyScope,
	baseURL: env.ORIGIN
});
