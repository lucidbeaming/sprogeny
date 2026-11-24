<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { extractPlaylistId } from '$lib/playlistId';
	import { samplePlaylists } from '$lib/samplePlaylists';
	import { createAuthClient } from 'better-auth/client';
	import PageHeader from '$lib/components/PageHeader.svelte';

	interface Source {
		id: string;
		name: string;
		weight: number;
		imageUrl?: string;
		tracksCount?: number;
	}

	let { data } = $props();
	let devMode = $derived(data.devMode && !data.user);
	let loggedIn = $derived(!!data.user);

	let sources = $state<Source[]>([]);
	let pasteUrl = $state('');
	let pasteError = $state('');
	let myPlaylistsOpen = $state(false);
	let myPlaylists = $state<{ id: string; name: string; tracksCount: number; imageUrl?: string }[]>(
		[]
	);
	let myPlaylistsLoading = $state(false);
	let myPlaylistsCached = $state(false);
	// Spotify's GET /me/playlists has no date field (no added_at or created_at on playlist summaries).
	// "Recent" uses the API's default order, which reflects recency. "Date added" is not available.
	let playlistSort = $state<'recent' | 'size' | 'az'>('recent');
	let sortedPlaylists = $derived.by(() => {
		const list = [...myPlaylists];
		switch (playlistSort) {
			case 'recent':
				return list;
			case 'size':
				return list.sort((a, b) => b.tracksCount - a.tracksCount);
			case 'az':
				return list.sort((a, b) => a.name.localeCompare(b.name));
		}
	});
	// Max useful weight (%) for each source given the desired output size.
	// If a playlist has fewer tracks than its weighted share, cap the slider there.
	let sourceMaxWeights = $derived(
		sources.map((s) => {
			if (!s.tracksCount) return 100;
			const n = Math.max(1, Number(numPlaylists));
			if (allowRepeats && n > 1) return 100;
			const desired = n * Math.max(10, Number(tracksPerPlaylist));
			return Math.min(100, Math.floor((s.tracksCount / desired) * 100));
		})
	);
	let hasSourceCap = $derived(sourceMaxWeights.some((w) => w < 100));

	// When output settings change (numPlaylists/tracksPerPlaylist), clamp any source whose
	// current weight now exceeds its max, and redistribute the freed weight to others.
	$effect(() => {
		const maxes = sourceMaxWeights;
		if (!sources.some((s, i) => s.weight > (maxes[i] ?? 100))) return;

		const updated = sources.map((s, i) => ({ ...s, weight: Math.min(s.weight, maxes[i] ?? 100) }));
		const total = updated.reduce((sum, s) => sum + s.weight, 0);
		const deficit = 100 - total;

		if (deficit > 0) {
			const flexible = updated
				.map((s, i) => ({ i, slack: (maxes[i] ?? 100) - s.weight }))
				.filter((x) => x.slack > 0);
			const totalSlack = flexible.reduce((sum, x) => sum + x.slack, 0);
			if (totalSlack > 0) {
				let distributed = 0;
				for (let j = 0; j < flexible.length; j++) {
					const { i, slack } = flexible[j];
					const add =
						j === flexible.length - 1
							? deficit - distributed
							: Math.round(deficit * (slack / totalSlack));
					const capped = Math.min(slack, add);
					updated[i].weight += capped;
					distributed += capped;
				}
			}
		}

		sources = updated;
	});

	let clearHistoryConfirm = $state(false);
	let clearHistoryLoading = $state(false);
	let clearHistoryDone = $state(false);
	let generating = $state(false);
	let generatingStep = $state(0);
	let stepInterval: ReturnType<typeof setInterval> | null = null;
	$effect(() => () => {
		if (stepInterval) clearInterval(stepInterval);
	});
	let resultPlaylists = $state<{ name: string; url: string }[]>([]);
	let resultTracks = $state<{ id: string; name: string; artist: string; imageUrl?: string }[]>([]);
	let combineError = $state('');
	let numPlaylists = $state(1);
	let allowRepeats = $state(true);
	let tracksPerPlaylist = $state(100);

	const GENERATING_STEPS = ['Fetching playlists…', 'Selecting tracks…', 'Creating playlists…'];
	const SIMULATED_STEPS = ['Reading playlists…', 'Selecting tracks…', 'Simulating creation…'];

	const authClient = createAuthClient();

	async function signOut() {
		await authClient.signOut();
		goto(resolve('/logout'), { replaceState: true });
	}

	function pasteUrlError(raw: string): string | null {
		const input = raw.trim();
		if (!input) return 'Paste a Spotify playlist link or ID first.';

		const lower = input.toLowerCase();
		const isSpotifyUrl = lower.includes('spotify.com') || lower.startsWith('spotify:');

		if (isSpotifyUrl) {
			if (/spotify(?:\.com[/]|:)track[:]/i.test(input))
				return "That's a track link — paste a playlist link instead.";
			if (/spotify(?:\.com[/]|:)album[:]/i.test(input))
				return "That's an album link — paste a playlist link instead.";
			if (/spotify(?:\.com[/]|:)artist[:]/i.test(input))
				return "That's an artist link — paste a playlist link instead.";
			if (/spotify(?:\.com[/]|:)(?:show|episode|user)[:]/i.test(input))
				return "That Spotify link type isn't supported — paste a playlist link.";
			return "Couldn't find a playlist ID in that Spotify link.";
		}

		if (/^https?:\/\//i.test(input)) return "That doesn't look like a Spotify link.";
		if (input.length < 10) return "That's too short to be a playlist ID or link.";

		return "Couldn't recognise that as a Spotify playlist link or ID.";
	}

	function addByUrl() {
		pasteError = '';
		const id = extractPlaylistId(pasteUrl);
		if (!id) {
			pasteError = pasteUrlError(pasteUrl) ?? "Couldn't find a playlist ID in that link.";
			return;
		}
		if (sources.some((s) => s.id === id)) {
			pasteError = 'That playlist is already in the list.';
			return;
		}
		sources = [...sources, { id, name: `Playlist ${id.slice(0, 8)}…`, weight: 0 }];
		pasteUrl = '';
		normalizeWeights();
	}

	function normalizeWeights() {
		if (sources.length === 0) return;
		const each = Math.round(100 / sources.length);
		sources = sources.map((s, i) => ({
			...s,
			weight: i === sources.length - 1 ? 100 - each * (sources.length - 1) : each
		}));
	}

	function distributeEqually() {
		normalizeWeights();
	}

	function removeSource(id: string) {
		sources = sources.filter((s) => s.id !== id);
		normalizeWeights();
	}

	function setWeight(id: string, weight: number) {
		const idx = sources.findIndex((s) => s.id === id);
		const maxPct = idx >= 0 ? (sourceMaxWeights[idx] ?? 100) : 100;
		const clamped = Math.max(0, Math.min(maxPct, Math.round(weight)));
		const others = sources.filter((s) => s.id !== id);
		const othersSum = others.reduce((sum, s) => sum + s.weight, 0);
		const remainder = 100 - clamped;
		sources = sources.map((s) => {
			if (s.id === id) return { ...s, weight: clamped };
			if (othersSum === 0)
				return { ...s, weight: others.length > 0 ? Math.round(remainder / others.length) : 0 };
			const ratio = s.weight / othersSum;
			return { ...s, weight: Math.round(remainder * ratio) };
		});
		const total = sources.reduce((sum, s) => sum + s.weight, 0);
		if (total !== 100 && others.length > 0) {
			const firstOtherId = others[0].id;
			sources = sources.map((s) =>
				s.id === firstOtherId ? { ...s, weight: s.weight + (100 - total) } : s
			);
		}
	}

	async function openMyPlaylists() {
		myPlaylistsOpen = true;
		if (myPlaylistsCached) return;
		await fetchMyPlaylists();
	}

	async function fetchMyPlaylists() {
		myPlaylistsLoading = true;
		myPlaylists = [];

		if (devMode) {
			myPlaylists = samplePlaylists;
			myPlaylistsLoading = false;
			myPlaylistsCached = true;
			return;
		}

		try {
			const res = await fetch('/api/spotify/playlists');
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				combineError = j.error ?? 'Failed to load playlists';
				return;
			}
			const list = await res.json();
			const seen: Record<string, boolean> = {};
			myPlaylists = list.filter((pl: { id: string }) => {
				if (seen[pl.id]) return false;
				seen[pl.id] = true;
				return true;
			});
			myPlaylistsCached = true;
		} finally {
			myPlaylistsLoading = false;
		}
	}

	async function clearHistory() {
		clearHistoryLoading = true;
		try {
			const res = await fetch('/api/spotify/combine', { method: 'DELETE' });
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				combineError = j.error ?? 'Failed to clear history';
				return;
			}
			clearHistoryDone = true;
			clearHistoryConfirm = false;
		} finally {
			clearHistoryLoading = false;
		}
	}

	function addFromMyPlaylists(pl: {
		id: string;
		name: string;
		tracksCount: number;
		imageUrl?: string;
	}) {
		if (sources.some((s) => s.id === pl.id)) {
			myPlaylistsOpen = false;
			return;
		}
		sources = [
			...sources,
			{ id: pl.id, name: pl.name, weight: 0, imageUrl: pl.imageUrl, tracksCount: pl.tracksCount }
		];
		normalizeWeights();
		myPlaylistsOpen = false;
	}

	async function resolvePasteName(id: string) {
		try {
			const res = await fetch(`/api/spotify/playlist?id=${encodeURIComponent(id)}`);
			if (res.ok) {
				const pl = await res.json();
				sources = sources.map((s) =>
					s.id === id
						? { ...s, name: pl.name, imageUrl: pl.imageUrl, tracksCount: pl.tracksCount }
						: s
				);
			}
		} catch {
			// keep placeholder name
		}
	}

	async function generate() {
		if (sources.length === 0) {
			combineError = 'Add at least one playlist.';
			return;
		}
		combineError = '';
		resultPlaylists = [];
		resultTracks = [];
		generating = true;
		generatingStep = 0;

		const steps = devMode ? SIMULATED_STEPS : GENERATING_STEPS;
		let stepIndex = 0;
		stepInterval = setInterval(() => {
			stepIndex = (stepIndex + 1) % steps.length;
			generatingStep = stepIndex;
		}, 2000);

		try {
			const weights = sources.map((s) => s.weight / 100);
			const res = await fetch('/api/spotify/combine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					playlistIds: sources.map((s) => s.id),
					weights,
					numPlaylists: Math.max(1, Math.min(5, Number(numPlaylists) || 1)),
					tracksPerPlaylist: Math.max(10, Math.min(300, Number(tracksPerPlaylist) || 100)),
					allowRepeats,
					...(devMode ? { simulate: true } : {})
				})
			});
			const result = await res.json().catch(() => ({}));
			if (!res.ok) {
				combineError = result.error ?? 'Failed to create playlists';
				return;
			}
			resultPlaylists = result.playlists ?? [];
			resultTracks = result.tracks ?? [];
			if (result.historyReset) {
				combineError =
					'Your track history was full and has been automatically reset. These playlists include all available tracks.';
			}
		} finally {
			generating = false;
			if (stepInterval) {
				clearInterval(stepInterval);
				stepInterval = null;
			}
		}
	}

	$effect(() => {
		sources.forEach((s) => {
			if (s.name.startsWith('Playlist ') && s.name.endsWith('…')) {
				resolvePasteName(s.id);
			}
		});
	});
</script>

<svelte:head>
	<title>Combine - Sprogeny</title>
	<meta
		name="description"
		content="Select your Spotify playlists, set weights, and generate a combined playlist tailored to your taste."
	/>
	<meta property="og:title" content="Combine - Sprogeny" />
	<meta
		property="og:description"
		content="Select your Spotify playlists, set weights, and generate a combined playlist tailored to your taste."
	/>
	<meta property="og:image" content="https://sprogeny.com/images/ui/sprogenypreview.jpg" />
	<meta property="og:url" content="https://sprogeny.com/combine" />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<main id="main-content" class="combine-page mx-auto w-full max-w-2xl px-4 pt-8 pb-4">
	{#if devMode}
		<div
			class="mb-4 rounded-md border border-yellow-600/40 bg-yellow-950/40 px-4 py-2 text-sm text-yellow-300"
		>
			Demo mode — using sample playlists, generation is simulated. No Spotify account required.
		</div>
	{/if}

	<PageHeader subtitle="Combine playlists" />
	{#if loggedIn}
		<div class="-mt-4 mb-8 flex justify-center">
			<button
				type="button"
				onclick={signOut}
				class="rounded-md bg-essential-bright-accent px-4 py-2 font-medium text-essential-base hover:bg-text-bright-accent focus:ring-2 focus:ring-essential-bright-accent focus:ring-offset-2 focus:ring-offset-background-base focus:outline-none"
			>
				Sign out
			</button>
		</div>
	{/if}

	<!-- Add playlists group -->
	<div class="content-block mb-8">
		<h2 class="section-heading mb-4!" style="font-family: var(--font-heading)">Add playlists</h2>

		<!-- Add by URL -->
		<div>
			<label for="paste-url" class="mb-1 block text-xs text-text-subdued">Paste a link</label>
			<div class="flex gap-2">
				<input
					id="paste-url"
					type="text"
					bind:value={pasteUrl}
					placeholder="Paste a playlist link"
					aria-describedby={pasteError ? 'paste-url-error' : undefined}
					class="flex-1 rounded-md border border-decorative-subdued bg-background-base px-3 py-2 text-text-base shadow-sm placeholder:text-text-subdued focus:border-essential-bright-accent focus:ring-1 focus:ring-essential-bright-accent"
					onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addByUrl())}
				/>
				<button
					type="button"
					onclick={addByUrl}
					class="rounded-md bg-essential-bright-accent px-4 py-2 font-medium text-essential-base hover:bg-text-bright-accent focus:ring-2 focus:ring-essential-bright-accent focus:ring-offset-2 focus:ring-offset-background-base focus:outline-none"
				>
					Add
				</button>
			</div>
			{#if pasteError}
				<p id="paste-url-error" class="mt-1 text-sm text-text-negative" role="alert">
					{pasteError}
				</p>
			{/if}
		</div>

		<div class="my-8 flex items-center gap-4 px-10 sm:my-12">
			<div class="h-px flex-1 bg-decorative-subdued"></div>
			<span class="text-xs font-semibold tracking-widest text-text-subdued">OR</span>
			<div class="h-px flex-1 bg-decorative-subdued"></div>
		</div>

		<!-- Add from my playlists -->
		<div class="flex justify-center pb-6">
			<button
				type="button"
				onclick={openMyPlaylists}
				class="rounded-md bg-essential-bright-accent px-4 py-2 font-medium text-essential-base hover:bg-text-bright-accent focus:ring-2 focus:ring-essential-bright-accent focus:ring-offset-2 focus:ring-offset-background-base focus:outline-none"
			>
				Choose from your playlists
			</button>
		</div>
	</div>

	{#if myPlaylistsOpen}
		<!-- svelte-ignore a11y_interactive_supports_focus -->
		<div
			class="fixed inset-0 z-10 flex items-center justify-center bg-background-press/80"
			role="dialog"
			aria-modal="true"
			aria-labelledby="playlist-modal-title"
			onkeydown={(e) => e.key === 'Escape' && (myPlaylistsOpen = false)}
		>
			<div
				class="modal-panel max-h-[80vh] w-full max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl shadow-xl sm:max-w-md"
			>
				<div
					class="border-b border-[color-mix(in_srgb,var(--color-brand-blue)_20%,transparent)] px-4 py-3"
				>
					<h2 id="playlist-modal-title" class="section-heading !mb-0">
						{devMode ? 'Sample playlists' : 'Your playlists'}
					</h2>
					<div class="mt-2 flex items-center gap-1">
						{#each [{ key: 'recent', label: 'Recent' }, { key: 'size', label: 'Size' }, { key: 'az', label: 'A–Z' }] as opt (opt.key)}
							<button
								type="button"
								onclick={() => (playlistSort = opt.key as typeof playlistSort)}
								class="rounded-md px-2 py-1 text-xs font-medium transition {playlistSort === opt.key
									? 'bg-essential-bright-accent text-essential-base'
									: 'text-text-subdued hover:bg-background-tinted-highlight hover:text-text-base'}"
							>
								{opt.label}
							</button>
						{/each}
						{#if myPlaylistsCached && !myPlaylistsLoading}
							<button
								type="button"
								onclick={fetchMyPlaylists}
								class="ml-auto rounded-md px-2 py-1 text-xs text-text-subdued hover:bg-background-tinted-highlight hover:text-text-base"
							>
								Refresh
							</button>
						{/if}
					</div>
				</div>
				<div class="max-h-96 overflow-y-auto p-2">
					{#if myPlaylistsLoading}
						<p class="py-4 text-center text-text-subdued">Loading…</p>
					{:else}
						{#each sortedPlaylists as pl (pl.id)}
							<button
								type="button"
								onclick={() => addFromMyPlaylists(pl)}
								class="flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm text-text-base hover:bg-background-tinted-highlight active:bg-background-tinted-press"
							>
								{#if pl.imageUrl}
									<img
										src={pl.imageUrl}
										alt=""
										class="h-10 w-10 flex-shrink-0 rounded object-cover"
									/>
								{:else}
									<div
										class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-background-tinted-base text-text-subdued"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											fill="currentColor"
											class="h-5 w-5"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6Z" /></svg
										>
									</div>
								{/if}
								<div class="min-w-0 flex-1">
									<span class="font-medium">{pl.name}</span>
									<span class="text-text-subdued"> · {pl.tracksCount} tracks</span>
								</div>
							</button>
						{/each}
					{/if}
				</div>
				<div
					class="border-t border-[color-mix(in_srgb,var(--color-brand-blue)_20%,transparent)] p-2"
				>
					<button
						type="button"
						onclick={() => (myPlaylistsOpen = false)}
						class="w-full rounded-md bg-essential-bright-accent px-4 py-2 font-medium text-essential-base hover:bg-text-bright-accent focus:ring-2 focus:ring-essential-bright-accent focus:ring-offset-2 focus:ring-offset-background-base focus:outline-none"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Sources + generation group -->
	<div class="content-block">
		<!-- Source list with sliders -->
		<div class="mb-6">
			<div class="mb-2 flex items-center justify-between">
				<h3 class="section-heading !mb-0">Sources</h3>
				{#if sources.length > 0}
					<button
						type="button"
						onclick={distributeEqually}
						class="text-sm text-essential-bright-accent hover:underline focus:rounded focus:ring-2 focus:ring-essential-bright-accent focus:outline-none"
					>
						Reset
					</button>
				{/if}
			</div>
			{#if sources.length === 0}
				<ul class="space-y-3" aria-label="Sources list, empty">
					{#each [48, 64, 56] as w (w)}
						<li
							class="flex items-center gap-3 rounded-lg border border-decorative-subdued bg-background-base p-3 opacity-30"
							aria-hidden="true"
						>
							<div class="h-10 w-10 flex-shrink-0 rounded bg-background-tinted-base"></div>
							<div class="flex-1 space-y-1.5">
								<div class="h-2.5 rounded-full bg-text-subdued" style="width: {w}%"></div>
								<div class="h-2 rounded-full bg-text-subdued" style="width: {w * 0.6}%"></div>
							</div>
							<div class="h-2 w-24 rounded-full bg-text-subdued"></div>
						</li>
					{/each}
				</ul>
			{:else}
				<ul class="space-y-3">
					{#each sources as source, i (source.id)}
						<li
							class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-decorative-subdued bg-background-base p-3"
						>
							{#if source.imageUrl}
								<img
									src={source.imageUrl}
									alt=""
									class="h-10 w-10 flex-shrink-0 rounded object-cover"
								/>
							{:else}
								<div
									class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-background-tinted-base text-text-subdued"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="currentColor"
										class="h-5 w-5"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6Z" /></svg
									>
								</div>
							{/if}
							<span class="min-w-0 flex-1 truncate font-medium text-text-base" title={source.name}>
								{source.name}
							</span>
							<div class="flex w-full items-center gap-2 sm:w-auto">
								<span class="w-10 text-right text-sm text-text-subdued tabular-nums"
									>{source.weight}%</span
								>
								<input
									type="range"
									min="0"
									max="100"
									value={source.weight}
									aria-label="Weight for {source.name}"
									oninput={(e) => {
										const input = e.target as HTMLInputElement;
										const max = sourceMaxWeights[i] ?? 100;
										const val = Number(input.value);
										if (val > max) input.value = String(max);
										setWeight(source.id, Math.min(val, max));
									}}
									class="weight-slider flex-1 sm:w-24 sm:flex-none"
									style="--unavail: {100 - (sourceMaxWeights[i] ?? 100)}%"
								/>
								<button
									type="button"
									onclick={() => removeSource(source.id)}
									class="rounded p-1 hover:bg-background-tinted-base focus:ring-2 focus:ring-essential-bright-accent focus:outline-none active:bg-background-tinted-press"
									style="color: rgba(239, 68, 68, 0.45)"
									aria-label="Remove {source.name}"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="1.5"
										stroke="currentColor"
										class="h-6 w-6"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
										/>
									</svg>
								</button>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
			{#if hasSourceCap}
				<div class="mt-3 flex items-center justify-end gap-2 text-xs text-text-subdued">
					<span class="stripe-swatch"></span>
					<span> not enough songs available</span>
				</div>
			{/if}
		</div>

		<div class="mb-6 h-px bg-decorative-subdued"></div>

		<!-- Output options -->
		<div class="mb-6">
			<h3 class="section-heading mb-3!">Output</h3>
			<div class="flex flex-wrap items-center gap-6">
				<label for="num-playlists" class="flex items-center gap-2 text-sm text-text-subdued">
					Playlists to create (max 5)
					<input
						id="num-playlists"
						type="number"
						min="1"
						max="5"
						bind:value={numPlaylists}
						class="w-16 rounded border border-decorative-subdued bg-background-base px-2 py-1.5 text-sm text-text-base"
					/>
				</label>
				<label for="tracks-per-playlist" class="flex items-center gap-2 text-sm text-text-subdued">
					Tracks per playlist (10–300)
					<input
						id="tracks-per-playlist"
						type="number"
						min="10"
						max="300"
						bind:value={tracksPerPlaylist}
						class="w-20 rounded border border-decorative-subdued bg-background-base px-2 py-1.5 text-sm text-text-base"
					/>
				</label>
			</div>
			<label class="mt-0 flex items-center gap-2 py-8 text-sm text-text-subdued md:mt-4 md:py-0">
				Allow repeated songs <input
					type="checkbox"
					bind:checked={allowRepeats}
					class="rounded border-decorative-subdued accent-essential-bright-accent"
				/>
			</label>
		</div>

		{#if generating}
			<div
				class="flex flex-col items-center gap-3 rounded-lg border border-decorative-subdued bg-background-base py-6"
				role="status"
				aria-live="polite"
			>
				<div class="h-2 w-48 overflow-hidden rounded-full bg-background-tinted-base">
					<div
						class="h-full rounded-md bg-essential-bright-accent transition-all duration-500"
						style="width: {((generatingStep + 1) / GENERATING_STEPS.length) * 100}%"
					></div>
				</div>
				<p class="text-sm text-text-subdued">
					{(devMode ? SIMULATED_STEPS : GENERATING_STEPS)[generatingStep]}
				</p>
			</div>
		{:else}
			<div class="flex flex-col items-center gap-3">
				<button
					type="button"
					onclick={generate}
					disabled={generating || sources.length === 0}
					class="rounded-md bg-essential-bright-accent px-4 py-2 font-medium text-essential-base hover:bg-text-bright-accent focus:ring-2 focus:ring-essential-bright-accent focus:ring-offset-2 focus:ring-offset-background-base focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
				>
					{devMode ? 'Simulate Generate' : 'Generate'}
				</button>
				{#if loggedIn}
					{#if clearHistoryDone}
						<p class="text-xs text-text-subdued">
							History cleared — all tracks are available again.
						</p>
					{:else if clearHistoryConfirm}
						<div class="flex items-center gap-2">
							<span class="text-xs text-text-subdued">Clear track history?</span>
							<button
								type="button"
								onclick={clearHistory}
								disabled={clearHistoryLoading}
								class="text-xs text-text-negative hover:underline disabled:opacity-50"
							>
								{clearHistoryLoading ? 'Clearing…' : 'Yes, clear'}
							</button>
							<button
								type="button"
								onclick={() => (clearHistoryConfirm = false)}
								class="text-xs text-text-subdued hover:underline"
							>
								Cancel
							</button>
						</div>
					{:else}
						<button
							type="button"
							onclick={() => (clearHistoryConfirm = true)}
							class="text-xs text-text-subdued hover:text-text-base hover:underline focus:rounded focus:ring-2 focus:ring-essential-bright-accent focus:outline-none"
						>
							Clear track history
						</button>
					{/if}
				{/if}
			</div>
		{/if}
	</div>

	{#if combineError}
		<p class="mt-4 text-sm text-text-negative">{combineError}</p>
	{/if}

	{#if resultPlaylists.length > 0}
		<div class="mt-8 space-y-6" role="status" aria-live="polite">
			<div>
				<h3 class="section-heading mb-2!">
					{devMode ? 'Playlists that would be created' : 'Created playlists'}
				</h3>
				<ul
					class="space-y-2 rounded-lg border border-decorative-subdued bg-background-elevated-base p-4"
				>
					{#each resultPlaylists as pl, i (i)}
						<li>
							{#if devMode}
								<span class="text-text-bright-accent">{pl.name}</span>
								<span class="text-sm text-text-subdued"> (simulated)</span>
							{:else}
								<a
									href={pl.url}
									target="_blank"
									rel="external noopener noreferrer"
									class="text-text-bright-accent hover:underline"
								>
									{pl.name} – Open in Spotify
								</a>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
			{#if resultTracks.length > 0}
				<div>
					<h3 class="section-heading mb-2!">
						{devMode ? 'Tracks that would be added' : 'Selected tracks'} ({resultTracks.length})
					</h3>
					<ul
						class="max-h-80 space-y-1.5 overflow-y-auto rounded-lg border border-decorative-subdued bg-background-elevated-base p-4 pr-2"
					>
						{#each resultTracks as track, i (i)}
							<li class="flex items-center gap-2 text-sm">
								{#if track.imageUrl}
									<img
										src={track.imageUrl}
										alt=""
										class="h-8 w-8 flex-shrink-0 rounded object-cover"
									/>
								{:else}
									<div
										class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-background-tinted-base text-text-subdued"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											fill="currentColor"
											class="h-4 w-4"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6Z" /></svg
										>
									</div>
								{/if}
								<div class="min-w-0 flex-1">
									<span class="truncate font-medium text-text-base">{track.name}</span>
									{#if track.artist}
										<span class="truncate text-text-subdued"> — {track.artist}</span>
									{/if}
								</div>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	{/if}
</main>

<style>
	:global(body):has(.combine-page) {
		background-image: linear-gradient(
			45deg,
			rgba(68, 136, 255, 0.08) 25%,
			transparent 25%,
			transparent 50%,
			rgba(68, 136, 255, 0.08) 50%,
			rgba(68, 136, 255, 0.08) 75%,
			transparent 75%,
			transparent
		);
		background-size: 170px 170px;
	}

	.content-block {
		background: color-mix(in srgb, var(--color-brand-blue) 12%, rgba(0, 0, 0, 0.85));
		border: 1px solid color-mix(in srgb, var(--color-brand-blue) 20%, transparent);
		border-radius: 0.75rem;
		padding: 0.75rem;
	}

	@media (min-width: 48rem) {
		.content-block {
			padding: 1.5rem 2rem;
		}
	}

	.modal-panel {
		background: color-mix(in srgb, var(--color-brand-blue) 12%, rgba(0, 0, 0, 0.85));
		border: 1px solid color-mix(in srgb, var(--color-brand-blue) 20%, transparent);
	}

	.stripe-swatch {
		display: inline-block;
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 2px;
		flex-shrink: 0;
		background: repeating-linear-gradient(
			-45deg,
			rgba(239, 68, 68, 0.35),
			rgba(239, 68, 68, 0.35) 2px,
			rgba(239, 68, 68, 0.12) 2px,
			rgba(239, 68, 68, 0.12) 4px
		);
	}

	.weight-slider {
		-webkit-appearance: none;
		appearance: none;
		height: 1.25rem;
		background: transparent;
		cursor: pointer;
	}

	.weight-slider::-webkit-slider-runnable-track {
		height: 0.5rem;
		border-radius: 9999px;
		background:
			repeating-linear-gradient(
					-45deg,
					rgba(239, 68, 68, 0.35),
					rgba(239, 68, 68, 0.35) 2px,
					rgba(239, 68, 68, 0.12) 2px,
					rgba(239, 68, 68, 0.12) 4px
				)
				right / var(--unavail, 0%) 100% no-repeat,
			var(--color-background-tinted-base, #333);
	}

	.weight-slider::-moz-range-track {
		height: 0.5rem;
		border-radius: 9999px;
		background:
			repeating-linear-gradient(
					-45deg,
					rgba(239, 68, 68, 0.35),
					rgba(239, 68, 68, 0.35) 2px,
					rgba(239, 68, 68, 0.12) 2px,
					rgba(239, 68, 68, 0.12) 4px
				)
				right / var(--unavail, 0%) 100% no-repeat,
			var(--color-background-tinted-base, #333);
	}

	.weight-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 1rem;
		height: 1rem;
		border-radius: 50%;
		background: var(--color-essential-bright-accent);
		margin-top: -0.25rem;
		cursor: pointer;
	}

	.weight-slider::-moz-range-thumb {
		width: 1rem;
		height: 1rem;
		border-radius: 50%;
		border: none;
		background: var(--color-essential-bright-accent);
		cursor: pointer;
	}
</style>
