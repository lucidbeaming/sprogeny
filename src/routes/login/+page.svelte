<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { createAuthClient } from 'better-auth/client';
	import { genericOAuthClient } from 'better-auth/client/plugins';
	import PageHeader from '$lib/components/PageHeader.svelte';

	let { data } = $props();

	const authClient = createAuthClient({
		plugins: [genericOAuthClient()]
	});

	async function signInWithSpotify() {
		await authClient.signIn.oauth2({
			providerId: 'spotify',
			callbackURL: '/combine'
		});
	}
</script>

<svelte:head>
	<title>Sign In – Sprogeny</title>
	<meta
		name="description"
		content="Sign in with Spotify to start combining your playlists with Sprogeny."
	/>
	<meta property="og:title" content="Sign In – Sprogeny" />
	<meta
		property="og:description"
		content="Sign in with Spotify to start combining your playlists with Sprogeny."
	/>
	<meta property="og:image" content="https://sprogeny.com/images/ui/sprogenypreview.jpg" />
	<meta property="og:url" content="https://sprogeny.com/login" />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<main id="main-content" class="flex min-h-screen items-center justify-center px-4">
	<div class="w-full max-w-md text-center">
		<PageHeader subtitle="Combine and shuffle Spotify playlists" />

		{#if data.simulationMode}
			<div
				class="mt-8 rounded-xl border border-amber-600/30 bg-amber-950/30 px-5 py-4 text-left text-sm text-amber-200/90"
			>
				<p class="font-semibold text-amber-300">Spotify access is currently limited</p>
				<p class="mt-1 text-amber-200/70">
					Spotify's updated developer policy restricts new logins to accounts pre-approved in the
					developer dashboard. If you were invited, you can still sign in below. Everyone else can
					explore the full UI using simulation mode — no Spotify account required.
				</p>
			</div>
		{/if}

		<div class="mt-8 flex flex-col items-center gap-3">
			<button
				type="button"
				onclick={signInWithSpotify}
				class="inline-flex items-center gap-3 rounded-full bg-essential-bright-accent px-6 py-3 text-base font-medium text-essential-base shadow-lg transition hover:bg-text-bright-accent hover:shadow-xl focus:ring-2 focus:ring-essential-bright-accent focus:ring-offset-2 focus:ring-offset-background-base focus:outline-none sm:px-8 sm:py-4 sm:text-lg"
			>
				<svg class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
					<path
						d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
					/>
				</svg>
				Sign in with Spotify
			</button>

			{#if data.simulationMode}
				<button
					type="button"
					onclick={() => goto(resolve('/combine'))}
					class="inline-flex items-center gap-2 rounded-full border border-amber-600/30 bg-amber-950/30 px-6 py-3 text-sm font-medium text-amber-300 transition hover:bg-amber-950/50 focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 focus:ring-offset-background-base focus:outline-none"
				>
					Try demo mode
				</button>
			{/if}

			{#if data.devMode}
				<button
					type="button"
					onclick={() => goto(resolve('/combine'))}
					class="inline-flex items-center gap-2 rounded-full border border-yellow-600/40 bg-yellow-950/40 px-6 py-3 text-sm font-medium text-yellow-300 transition hover:bg-yellow-950/60 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-background-base focus:outline-none"
				>
					Skip login (dev mode)
				</button>
			{/if}
		</div>

		<p class="mt-8 text-sm text-text-subdued">
			We only read playlists you choose and create new ones in your library. We never store your
			Spotify credentials.
		</p>
	</div>
</main>
