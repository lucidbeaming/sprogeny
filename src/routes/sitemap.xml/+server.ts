import type { RequestHandler } from '@sveltejs/kit';

const BASE = 'https://sprogeny.com';
const pages = [
	{ path: '/', changefreq: 'monthly', priority: '1.0' },
	{ path: '/faq', changefreq: 'monthly', priority: '0.8' },
	{ path: '/terms', changefreq: 'yearly', priority: '0.3' }
];

export const GET: RequestHandler = () => {
	const urls = pages
		.map(
			({ path, changefreq, priority }) =>
				`\n  <url><loc>${BASE}${path}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`
		)
		.join('');

	return new Response(
		`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}\n</urlset>`,
		{ headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'max-age=3600' } }
	);
};
