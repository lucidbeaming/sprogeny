import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readdirSync } from 'fs';
import { join } from 'path';

const IMAGE_RE = /\.(jpg|jpeg|png|webp|gif)$/i;

export const GET: RequestHandler = ({ url }) => {
	const dir = join(process.cwd(), 'static', 'images', 'splash');
	let files: string[];
	try {
		files = readdirSync(dir).filter((f) => IMAGE_RE.test(f));
	} catch {
		return json([]);
	}
	// Fisher-Yates shuffle
	for (let i = files.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[files[i], files[j]] = [files[j], files[i]];
	}
	const countParam = url.searchParams.get('count');
	const count = countParam ? Math.max(1, parseInt(countParam, 10) || files.length) : files.length;
	return json(files.slice(0, count).map((f) => `/images/splash/${f}`));
};
