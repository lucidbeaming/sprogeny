import { json } from '@sveltejs/kit';
import { readFileSync } from 'fs';
import { join } from 'path';

export function GET() {
	try {
		const content = readFileSync(join(process.cwd(), 'genres.txt'), 'utf-8');
		const genres = content
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.length > 0);
		return json(genres);
	} catch {
		return json([]);
	}
}
