let cached: string[] | null = null;

export async function fetchGenres(): Promise<string[]> {
	if (cached) return cached;
	try {
		const res = await fetch('/api/genres');
		cached = await res.json();
		return cached!;
	} catch {
		return [];
	}
}
