import { sequence } from '@sveltejs/kit/hooks';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { log } from '$lib/server/logger';

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	if (!building && event.url.pathname.startsWith('/api/auth')) {
		// Scrub OAuth credentials from search params before logging
		const safeSearch =
			event.url.searchParams.size > 0
				? [...event.url.searchParams.keys()]
						.map((k) =>
							['code', 'state', 'token', 'access_token'].includes(k)
								? `${k}=[REDACTED]`
								: `${k}=${event.url.searchParams.get(k)}`
						)
						.join('&')
				: undefined;
		log.auth('Auth request', {
			path: event.url.pathname,
			method: event.request.method,
			search: safeSearch
		});
	} else {
		const session = await auth.api.getSession({ headers: event.request.headers });
		if (session) {
			event.locals.session = session.session;
			event.locals.user = session.user;
		}
	}

	// Always route through svelteKitHandler so cookies set during auth
	// callbacks are flushed into the response via the SvelteKit event.
	return svelteKitHandler({ event, resolve, auth, building });
};

const handleSecurityHeaders: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	return response;
};

export const handle: Handle = sequence(handleBetterAuth, handleSecurityHeaders);

export const handleError: HandleServerError = async ({ error, status, event }) => {
	const message = error instanceof Error ? error.message : String(error);
	const path = event?.url?.pathname ?? 'unknown';
	console.error(`[Sprogeny:Error] ${status} ${path} ${message}`);
	return { message: 'An unexpected error occurred.' };
};
