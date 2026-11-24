import { dev } from '$app/environment';
import { json, error } from '@sveltejs/kit';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { RequestHandler } from './$types';

const CONFIG_FILES: Record<string, string> = {
	carouselConfig: 'src/lib/three/stages/carouselConfig.ts',
	constellationConfig: 'src/lib/three/stages/constellationConfig.ts'
};

const HEX_KEYS = new Set(['LINE_COLOR']);

function formatValue(key: string, val: unknown): string {
	if (typeof val === 'string') return `'${val}'`;
	if (typeof val === 'number' && HEX_KEYS.has(key)) return '0x' + val.toString(16).padStart(6, '0');
	return String(val);
}

function formatObj(obj: Record<string, unknown>): string {
	return (
		'{ ' +
		Object.entries(obj)
			.map(([k, v]) => `${k}: ${formatValue(k, v)}`)
			.join(', ') +
		' }'
	);
}

function toSource(exportName: string, obj: Record<string, unknown>): string {
	const entries = Object.entries(obj)
		.map(([k, v]) => {
			if (Array.isArray(v)) {
				const items = v.map((item) => `\t\t${formatObj(item)}`).join(',\n');
				return `\t${k}: [\n${items}\n\t]`;
			}
			return `\t${k}: ${formatValue(k, v)}`;
		})
		.join(',\n');
	return `export const ${exportName} = {\n${entries}\n};\n`;
}

export const POST: RequestHandler = async ({ request }) => {
	if (!dev) throw error(403, 'Only available in dev mode');

	const { name, config } = await request.json();

	const relPath = CONFIG_FILES[name];
	if (!relPath) throw error(400, `Unknown config: ${name}`);

	const absPath = resolve(relPath);
	const source = toSource(name, config);

	await writeFile(absPath, source, 'utf-8');

	return json({ ok: true, path: relPath });
};
