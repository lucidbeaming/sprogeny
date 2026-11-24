<script lang="ts">
	import { resolve } from '$app/paths';
	import SplashRotator from '$lib/components/SplashRotator.svelte';
	import { serializeSchema } from '$lib/utils/json-ld';
</script>

<svelte:head>
	<title>Sprogeny - Mashup Spotify Playlists</title>
	<meta
		name="description"
		content="Combine and merge Spotify playlists into one mix — with custom weight ratios and truly random shuffle. Free Spotify playlist combiner. No account needed."
	/>
	<meta property="og:title" content="Sprogeny - Mashup Spotify Playlists" />
	<meta
		property="og:description"
		content="Combine and merge Spotify playlists into one mix — with custom weight ratios and truly random shuffle. Free Spotify playlist combiner. No account needed."
	/>
	<meta property="og:image" content="https://sprogeny.com/images/ui/sprogenypreview.jpg" />
	<meta property="og:url" content="https://sprogeny.com/" />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary_large_image" />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html serializeSchema({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'WebSite',
				'@id': 'https://sprogeny.com/#website',
				url: 'https://sprogeny.com/',
				name: 'Sprogeny',
				description: 'Combine and merge Spotify playlists into weighted, truly random mixes.',
				inLanguage: 'en-US'
			},
			{
				'@type': 'SoftwareApplication',
				'@id': 'https://sprogeny.com/#app',
				name: 'Sprogeny',
				url: 'https://sprogeny.com/',
				applicationCategory: 'MusicApplication',
				operatingSystem: 'Web',
				offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
				description:
					'Sprogeny combines multiple Spotify playlists into one weighted, truly random mix. No algorithms, no ads, no modifications to your original playlists.',
				screenshot: 'https://sprogeny.com/images/ui/sprogenypreview.jpg',
				featureList: [
					'Combine multiple Spotify playlists',
					'Adjust per-playlist weight ratios',
					'Truly random shuffle — no play-count bias',
					'Does not modify original playlists',
					'Free with no ads',
					'Spotify OAuth — no separate account needed'
				]
			},
			{
				'@type': 'VideoObject',
				'@id': 'https://sprogeny.com/#demo-video',
				name: 'Sprogeny Demo — Combine Spotify Playlists',
				description:
					'A walkthrough showing how to sign in, select source playlists, set weight ratios, and generate a new combined playlist.',
				thumbnailUrl: 'https://img.youtube.com/vi/STfNeI2PDAU/maxresdefault.jpg',
				uploadDate: '2026-04-01',
				contentUrl: 'https://www.youtube.com/watch?v=STfNeI2PDAU',
				embedUrl: 'https://www.youtube.com/embed/STfNeI2PDAU?cc_load_policy=1&rel=0'
			}
		]
	})}
</svelte:head>

<div class="relative h-screen w-full overflow-hidden">
	<SplashRotator />

	<main
		id="main-content"
		class="relative z-10 flex h-full flex-col items-center px-4 text-center md:justify-center"
	>
		<!-- Subtle radial vignette for text readability -->
		<div
			class="pointer-events-none absolute inset-0"
			style="background: radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0,0,0,0.45) 0%, transparent 100%);"
		></div>
		<div class="relative flex flex-col items-center py-20 md:py-0">
			<h1
				class="text-6xl leading-none font-extrabold text-white md:text-8xl"
				style="text-shadow: 0 0 40px color-mix(in srgb, var(--color-brand-blue) 50%, transparent), 0 2px 8px color-mix(in srgb, var(--color-brand-blue) 60%, transparent), 0 4px 20px color-mix(in srgb, var(--color-brand-blue) 30%, transparent);"
			>
				SPROGENY
			</h1>
			<h2
				class="mt-2 text-4xl text-white/90"
				style="text-shadow: 0 1px 6px rgba(0,0,0,0.6);"
			>
				Mashup multiple Spotify&trade; playlists
			</h2>

			<div class="mt-12 flex flex-col gap-4 sm:flex-row">
				<a
					href={resolve('/login')}
					class="w-full rounded-full bg-brand-blue px-8 py-3 text-center text-lg font-medium text-white shadow-lg transition hover:bg-[#5599ff] hover:shadow-xl focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 focus:ring-offset-black focus:outline-none sm:w-auto"
				>
					Get Started
				</a>
				<a
					href={resolve('/faq')}
					class="w-full rounded-full border border-white/30 px-8 py-3 text-center text-lg font-medium text-white/80 backdrop-blur-sm transition hover:border-white/60 hover:text-white focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 focus:ring-offset-black focus:outline-none sm:w-auto"
				>
					FAQ
				</a>
			</div>
		</div>
	</main>
</div>
