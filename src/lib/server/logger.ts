/**
 * Verbose server logging for auth, Spotify API, and combine operations.
 * All output is prefixed so you can filter e.g. grep 'Sprogeny:Combine' /var/log/sprogeny/app.log
 * PM2 captures stdout/stderr to /var/log/sprogeny/{app,error}.log per ecosystem.config.cjs.
 *
 * User-identifying values (IDs, names, emails) must be passed through anonymizeId() before logging.
 * Tokens and secrets are redacted automatically by safeStringify() when nested in objects.
 */

import { createHash } from 'node:crypto';

const PREFIX_AUTH = '[Sprogeny:Auth]';
const PREFIX_SPOTIFY = '[Sprogeny:Spotify]';
const PREFIX_COMBINE = '[Sprogeny:Combine]';

/**
 * One-way hash of any user-identifying string (user ID, email, username).
 * Returns the first 12 hex characters — enough to correlate log lines,
 * not enough to recover the original value.
 */
export function anonymizeId(value: string): string {
	return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

const SENSITIVE_KEYS = new Set([
	'accesstoken',
	'refreshtoken',
	'token',
	'id_token',
	'bearer',
	'secret',
	'password',
	'authorization',
	// user-identifying fields — log via anonymizeId() instead
	'email',
	'username',
	'name',
	'userid',
	'user_id',
	'spotifyid',
	'spotify_id'
]);

function sanitize(obj: unknown): unknown {
	if (obj === null || obj === undefined) return obj;
	if (typeof obj !== 'object') return obj;
	if (Array.isArray(obj)) return obj.map(sanitize);
	const clean: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
		if (SENSITIVE_KEYS.has(key.toLowerCase())) {
			clean[key] = '[REDACTED]';
		} else {
			clean[key] = sanitize(value);
		}
	}
	return clean;
}

function safeStringify(obj: unknown): string {
	try {
		return JSON.stringify(sanitize(obj));
	} catch {
		return String(obj);
	}
}

function timestamp(): string {
	return new Date().toISOString();
}

function write(prefix: string, message: string, data?: unknown): void {
	const ts = timestamp();
	if (data !== undefined) {
		console.log(`${ts} ${prefix} ${message} ${safeStringify(data)}`);
	} else {
		console.log(`${ts} ${prefix} ${message}`);
	}
}

function writeError(prefix: string, message: string, data?: unknown): void {
	const ts = timestamp();
	if (data !== undefined) {
		console.error(`${ts} ${prefix} ${message} ${safeStringify(data)}`);
	} else {
		console.error(`${ts} ${prefix} ${message}`);
	}
}

export const log = {
	auth: (message: string, data?: unknown) => write(PREFIX_AUTH, message, data),
	authWarn: (message: string, data?: unknown) => writeError(PREFIX_AUTH, `WARN ${message}`, data),
	authError: (message: string, data?: unknown) => writeError(PREFIX_AUTH, `ERROR ${message}`, data),
	spotify: (message: string, data?: unknown) => write(PREFIX_SPOTIFY, message, data),
	combine: (message: string, data?: unknown) => write(PREFIX_COMBINE, message, data),
	combineError: (message: string, data?: unknown) => writeError(PREFIX_COMBINE, message, data)
};
