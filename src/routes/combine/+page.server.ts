import { redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { SIMULATIONMODE } from '$env/static/private';
import type { PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { log, anonymizeId } from '$lib/server/logger';

export const load: PageServerLoad = async (event) => {
	const ip = event.getClientAddress();

	if (dev) {
		const session = await auth.api.getSession({ headers: event.request.headers }).catch(() => null);
		log.combine('Page load (dev mode)', {
			ip,
			uid: session?.user?.id ? anonymizeId(session.user.id) : null
		});
		return {
			user: session?.user ?? null,
			devMode: true
		};
	}

	const session = await auth.api.getSession({ headers: event.request.headers });

	if (SIMULATIONMODE === 'true' && !session?.user) {
		log.combine('Page load (simulation mode, unauthenticated)', { ip });
		return {
			user: null,
			devMode: true
		};
	}

	if (!session?.user) {
		log.combine('Page load: unauthenticated, redirecting to login', { ip });
		throw redirect(302, '/login');
	}
	log.combine('Page load', { ip, uid: anonymizeId(session.user.id) });
	return {
		user: session.user,
		devMode: false
	};
};
