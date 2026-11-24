import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';

export const GET = async () => {
	try {
		await db.execute(sql`SELECT 1`);
		return json({ status: 'ok' });
	} catch {
		return json({ status: 'error' }, { status: 503 });
	}
};
