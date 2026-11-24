import * as THREE from 'three';

// Keywords that define genre families
const FAMILIES: Record<string, string[]> = {
	rock: [
		'rock',
		'grunge',
		'shoegaze',
		'britpop',
		'krautrock',
		'rockabilly',
		'post-hardcore',
		'emo'
	],
	metal: ['metal', 'metalcore', 'grindcore', 'sludge', 'doom', 'thrash'],
	jazz: ['jazz', 'bebop', 'bop', 'swing', 'bossa nova'],
	electronic: [
		'electronic',
		'electro',
		'techno',
		'house',
		'trance',
		'dubstep',
		'drum and bass',
		'jungle',
		'breakbeat',
		'breakcore',
		'idm',
		'edm',
		'chiptune',
		'glitch',
		'dnb',
		'breaks'
	],
	hiphop: ['hip hop', 'rap', 'boom bap', 'trap', 'grime'],
	folk: ['folk', 'bluegrass', 'americana', 'celtic', 'neofolk'],
	classical: [
		'classical',
		'baroque',
		'symphony',
		'concerto',
		'orchestral',
		'opera',
		'romantic classical'
	],
	ambient: ['ambient', 'drone', 'new age', 'chillout', 'chillwave', 'downtempo'],
	punk: ['punk', 'ska', 'hardcore'],
	soul: ['soul', 'r&b', 'funk', 'gospel', 'disco', 'motown'],
	pop: ['pop', 'synth-pop', 'dance-pop', 'europop', 'eurodance', 'schlager'],
	country: ['country', 'southern rock'],
	reggae: ['reggae', 'dub', 'dancehall'],
	blues: ['blues'],
	industrial: ['industrial', 'ebm', 'dark wave', 'gothic', 'noise'],
	experimental: [
		'experimental',
		'avant-garde',
		'noise',
		'plunderphonics',
		'free improvisation',
		'non-music',
		'leftfield'
	]
};

export interface GenreNode {
	genre: string;
	position: THREE.Vector3;
	family: string;
}

export interface GenreConnection {
	from: number;
	to: number;
	strength: number;
}

/**
 * Compute affinity between two genres based on shared words and family membership.
 */
function genreAffinity(
	a: string,
	b: string,
	tokensA: string[],
	tokensB: string[],
	familyA: string,
	familyB: string
): number {
	let score = 0;

	const shared = tokensA.filter((w) => tokensB.includes(w) && w.length > 2);
	score += shared.length * 0.4;

	if (familyA === familyB && familyA !== 'other') {
		score += 0.3;
	}

	if (a.includes(b) || b.includes(a)) {
		score += 0.5;
	}

	return Math.min(score, 1);
}

function getFamily(genre: string): string {
	const lower = genre.toLowerCase();
	for (const [family, keywords] of Object.entries(FAMILIES)) {
		for (const kw of keywords) {
			if (lower.includes(kw) || kw.includes(lower)) {
				return family;
			}
		}
	}
	return 'other';
}

// Family color palette
const FAMILY_COLORS: Record<string, number> = {
	rock: 0xff6644,
	metal: 0xcc3333,
	jazz: 0xffaa22,
	electronic: 0x44ccff,
	hiphop: 0xff44aa,
	folk: 0x88cc44,
	classical: 0xffdd88,
	ambient: 0x6688ff,
	punk: 0xff8800,
	soul: 0xff6699,
	pop: 0xff88dd,
	country: 0xccaa44,
	reggae: 0x44cc66,
	blues: 0x4466cc,
	industrial: 0x888888,
	experimental: 0xaa44ff,
	other: 0x4488ff
};

export function getFamilyColor(genre: string): number {
	return FAMILY_COLORS[getFamily(genre)] ?? FAMILY_COLORS.other;
}

/**
 * Build a 3D layout for genre nodes using cluster-based placement.
 * Genres in the same family cluster together, with affinity-based fine positioning.
 */
export function buildGenreGraph(genres: string[]): {
	nodes: GenreNode[];
	connections: GenreConnection[];
} {
	const nodes: GenreNode[] = [];

	// Group genres by family
	const familyGroups: Record<string, number[]> = {};
	genres.forEach((genre, i) => {
		const family = getFamily(genre);
		if (!familyGroups[family]) familyGroups[family] = [];
		familyGroups[family].push(i);
		nodes.push({ genre, position: new THREE.Vector3(), family });
	});

	// Arrange family clusters in a sphere
	const familyNames = Object.keys(familyGroups);
	const familyCenters: Record<string, THREE.Vector3> = {};
	const clusterRadius = 18;

	familyNames.forEach((family, fi) => {
		// Distribute family centers using fibonacci sphere
		const phi = Math.acos(1 - (2 * (fi + 0.5)) / familyNames.length);
		const theta = Math.PI * (1 + Math.sqrt(5)) * fi;
		familyCenters[family] = new THREE.Vector3(
			clusterRadius * Math.sin(phi) * Math.cos(theta),
			clusterRadius * Math.cos(phi),
			clusterRadius * Math.sin(phi) * Math.sin(theta)
		);
	});

	// Position nodes within their family cluster
	for (const [family, indices] of Object.entries(familyGroups)) {
		const center = familyCenters[family];
		const innerRadius = 2 + Math.sqrt(indices.length) * 1.2;

		indices.forEach((nodeIdx, i) => {
			// Fibonacci sphere within cluster — bias phi so points span more vertical arc (taller clusters)
			const t = (i + 0.5) / indices.length;
			const phi = Math.acos(1 - 2 * t);
			const theta = Math.PI * (1 + Math.sqrt(5)) * i;
			const sinP = Math.sin(phi);
			const r = innerRadius;
			nodes[nodeIdx].position.set(
				center.x + r * sinP * Math.cos(theta),
				center.y + r * Math.cos(phi),
				center.z + r * sinP * Math.sin(theta)
			);
		});
	}

	// Taller on screen (camera +Z): compress X/Z spread vs Y so the cloud reads more vertical than wide
	const xzScale = 0.72;
	const yScale = 1.42;
	for (const node of nodes) {
		node.position.x *= xzScale;
		node.position.y *= yScale;
		node.position.z *= xzScale;
	}

	// Precompute tokens for affinity scoring
	const tokensByIndex = genres.map((g) => g.toLowerCase().split(/[\s\-&]+/));

	const connections: GenreConnection[] = [];
	for (let i = 0; i < genres.length; i++) {
		for (let j = i + 1; j < genres.length; j++) {
			const strength = genreAffinity(
				genres[i],
				genres[j],
				tokensByIndex[i],
				tokensByIndex[j],
				nodes[i].family,
				nodes[j].family
			);
			if (strength >= 0.3) {
				connections.push({ from: i, to: j, strength });
			}
		}
	}

	return { nodes, connections };
}
