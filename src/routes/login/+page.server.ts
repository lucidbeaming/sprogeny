import { redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { SIMULATIONMODE } from '$env/static/private';
import type { PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';

export const load: PageServerLoad = async (event) => {
	const session = await auth.api.getSession({ headers: event.request.headers });
	if (session?.user) {
		throw redirect(302, '/combine');
	}
	return {
		session: null,
		devMode: dev,
		simulationMode: SIMULATIONMODE === 'true'
	};
};
