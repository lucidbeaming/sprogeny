import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

interface RateLimitEntry {
	count: number;
	resetAt: number;
}

const buckets = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(
	() => {
		const now = Date.now();
		for (const [key, entry] of buckets) {
			if (now >= entry.resetAt) buckets.delete(key);
		}
	},
	5 * 60 * 1000
);

/**
 * Simple in-memory rate limiter keyed by IP + route.
 * Returns a 429 Response if the limit is exceeded, or null if the request is allowed.
 */
export function rateLimit(
	event: RequestEvent,
	{ limit, windowMs }: { limit: number; windowMs: number }
): Response | null {
	const ip = event.getClientAddress();
	const key = `${ip}:${event.url.pathname}`;
	const now = Date.now();

	const entry = buckets.get(key);
	if (!entry || now >= entry.resetAt) {
		buckets.set(key, { count: 1, resetAt: now + windowMs });
		return null;
	}

	entry.count++;
	if (entry.count > limit) {
		const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
		return json(
			{ error: 'Too many requests' },
			{
				status: 429,
				headers: { 'Retry-After': String(retryAfter) }
			}
		);
	}

	return null;
}
