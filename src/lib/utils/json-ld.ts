export function serializeSchema(schema: Record<string, unknown>): string {
	return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}
