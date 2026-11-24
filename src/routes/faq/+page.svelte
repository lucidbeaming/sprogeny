<script lang="ts">
	import { resolve } from '$app/paths';
	import ConstellationBackground from '$lib/components/ConstellationBackground.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { serializeSchema } from '$lib/utils/json-ld';
</script>

<svelte:head>
	<title>FAQ - Sprogeny</title>
	<meta
		name="description"
		content="FAQ: How does Sprogeny combine Spotify playlists? Is it free? What data is stored? Does it modify your playlists? Answers to all common questions."
	/>
	<meta property="og:title" content="FAQ - Sprogeny" />
	<meta
		property="og:description"
		content="FAQ: How does Sprogeny combine Spotify playlists? Is it free? What data is stored? Does it modify your playlists? Answers to all common questions."
	/>
	<meta property="og:image" content="https://sprogeny.com/images/ui/sprogenypreview.jpg" />
	<meta property="og:url" content="https://sprogeny.com/faq" />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary_large_image" />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html serializeSchema({
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: [
			{
				'@type': 'Question',
				name: 'What is Sprogeny?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: 'Sprogeny lets you combine multiple Spotify playlists into fresh, shuffled mixes. Pick your source playlists, set the weight for each, and generate new playlists directly in your Spotify library.'
				}
			},
			{
				'@type': 'Question',
				name: 'How does it work?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: 'Sign in with your Spotify account. Add source playlists by pasting a link or selecting from your library. Adjust the weight sliders to control how many tracks come from each source. Hit Generate — new playlists appear in your Spotify library instantly.'
				}
			},
			{
				'@type': 'Question',
				name: 'Is it free?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: 'Yes. Sprogeny is completely free to use. No premium tier, no ads, no upsells.'
				}
			},
			{
				'@type': 'Question',
				name: 'Do I need to create an account?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: "No. You sign in with your existing Spotify account — there's no separate registration or password to manage."
				}
			},
			{
				'@type': 'Question',
				name: 'Will it modify my original playlists?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: 'Never. Sprogeny only reads your source playlists and creates new ones. Your originals are left completely untouched.'
				}
			},
			{
				'@type': 'Question',
				name: "How is the shuffle different from Spotify's?",
				acceptedAnswer: {
					'@type': 'Answer',
					text: "Sprogeny uses a truly random shuffle. There's no weighted shuffle that favors popular tracks, no play-count bias, and no artificial emotional weighting. Every track has an equal chance of appearing."
				}
			},
			{
				'@type': 'Question',
				name: 'Does it use AI or algorithms to pick tracks?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: "No. Sprogeny doesn't use algorithms or AI to decide what you hear. It pulls tracks from the playlists you choose, in the proportions you set, and shuffles them randomly. Nothing is added that you didn't ask for."
				}
			},
			{
				'@type': 'Question',
				name: "What's it good for?",
				acceptedAnswer: {
					'@type': 'Answer',
					text: "Getting deep cuts from albums instead of always hearing the hits. Mashing up genres you wouldn't normally combine. Importing friends' playlists or official Spotify playlists and mixing them. Discovering music that Spotify's algorithms don't surface well — experimental, fringe, and niche artists."
				}
			},
			{
				'@type': 'Question',
				name: 'Does Sprogeny store my data?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: 'Your session is stored in an encrypted cookie. Playlist data and track information are not persisted after your session ends. A hashed (non-reversible) record of used tracks is stored to prevent duplicates — no raw user IDs or playlist contents are kept.'
				}
			},
			{
				'@type': 'Question',
				name: 'Does Sprogeny track me?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: 'Sprogeny uses a self-hosted, cookieless analytics tool to count page views. No cookies are set, no personal information is collected, and no data is shared with third parties. There are no ad networks or tracking pixels.'
				}
			},
			{
				'@type': 'Question',
				name: 'Is my Spotify password safe?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: "We never see or store your Spotify password. Authentication is handled entirely through Spotify's OAuth flow — we receive a temporary access token, never your credentials."
				}
			},
			{
				'@type': 'Question',
				name: 'What Spotify permissions are requested?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: 'Only the minimum needed: playlist-read-private, playlist-read-collaborative, playlist-modify-public, playlist-modify-private. We do not access listening history, saved tracks, or profile details beyond your display name.'
				}
			},
			{
				'@type': 'Question',
				name: 'Can I revoke access?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: 'Yes. Visit https://www.spotify.com/account/apps/ and remove Sprogeny at any time. This immediately revokes all access.'
				}
			},
			{
				'@type': 'Question',
				name: 'Where do the album covers on the home page come from?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: 'From the Cover Art Archive (https://coverartarchive.org/), a joint project of MusicBrainz and the Internet Archive. They are shown as decoration only, and each cover belongs to its artist, label or designer. See the Terms of Use for details.'
				}
			}
		]
	})}
</svelte:head>

<div class="relative min-h-screen">
	<ConstellationBackground />

	<main id="main-content" class="relative z-10 mx-auto max-w-2xl px-4 py-6 sm:py-12">
		<PageHeader subtitle="FAQ" />

		<div class="mt-10 space-y-10">
			<section class="faq-section">
				<h2 class="text-lg font-semibold text-text-base sm:text-xl">What is Sprogeny?</h2>
				<p class="mt-2 leading-relaxed text-text-subdued">
					Sprogeny lets you combine multiple Spotify playlists into fresh, shuffled mixes. Pick your
					source playlists, set the weight for each, and generate new playlists directly in your
					Spotify library.
				</p>
			</section>

			<section class="faq-section">
				<h2 class="text-lg font-semibold text-text-base sm:text-xl">How does it work?</h2>
				<ol class="mt-2 list-inside list-decimal space-y-1.5 leading-relaxed text-text-subdued">
					<li>Sign in with your Spotify account.</li>
					<li>Add source playlists by pasting a link or selecting from your library.</li>
					<li>Adjust the weight sliders to control how many tracks come from each source.</li>
					<li>Hit Generate — new playlists appear in your Spotify library instantly.</li>
				</ol>
			</section>

			<section class="faq-section">
				<h2 class="text-lg font-semibold text-text-base sm:text-xl">Is it free?</h2>
				<p class="mt-2 leading-relaxed text-text-subdued">
					Yes. Sprogeny is completely free to use. No premium tier, no ads, no upsells.
				</p>
			</section>

			<section class="faq-section">
				<h2 class="text-lg font-semibold text-text-base sm:text-xl">
					Do I need to create an account?
				</h2>
				<p class="mt-2 leading-relaxed text-text-subdued">
					No. You sign in with your existing Spotify account — there's no separate registration or
					password to manage.
				</p>
			</section>

			<section class="faq-section">
				<h2 class="text-lg font-semibold text-text-base sm:text-xl">
					Will it modify my original playlists?
				</h2>
				<p class="mt-2 leading-relaxed text-text-subdued">
					Never. Sprogeny only reads your source playlists and creates new ones. Your originals are
					left completely untouched.
				</p>
			</section>

			<section class="faq-section">
				<h2 class="text-lg font-semibold text-text-base sm:text-xl">
					How is the shuffle different from Spotify's?
				</h2>
				<p class="mt-2 leading-relaxed text-text-subdued">
					Sprogeny uses a truly random shuffle. There's no "weighted shuffle" that favors popular
					tracks, no play-count bias, and no artificial emotional weighting. Every track has an
					equal chance of appearing.
				</p>
			</section>

			<section class="faq-section">
				<h2 class="text-lg font-semibold text-text-base sm:text-xl">
					Does it use AI or algorithms to pick tracks?
				</h2>
				<p class="mt-2 leading-relaxed text-text-subdued">
					No. Sprogeny doesn't use algorithms or AI to decide what you hear. It pulls tracks from
					the playlists you choose, in the proportions you set, and shuffles them randomly. Nothing
					is added that you didn't ask for.
				</p>
			</section>

			<section class="faq-section">
				<h2 class="text-lg font-semibold text-text-base sm:text-xl">What's it good for?</h2>
				<ul class="mt-2 space-y-1.5 leading-relaxed text-text-subdued">
					<li>Getting deep cuts from albums instead of always hearing the hits.</li>
					<li>Mashing up genres you wouldn't normally combine.</li>
					<li>
						Importing your friends' playlists or official Spotify playlists and mixing them
						together.
					</li>
					<li>
						Discovering music that Spotify's algorithms don't surface well — experimental, fringe,
						and niche artists.
					</li>
				</ul>
			</section>

			<section class="faq-section">
				<h2 class="text-lg font-semibold text-text-base sm:text-xl">
					Does Sprogeny store my data?
				</h2>
				<p class="mt-2 leading-relaxed text-text-subdued">
					Your session is stored in an encrypted cookie. We do not persist playlist data or track
					information after your session ends. A hashed (non-reversible) record of used tracks is
					stored to prevent duplicates across combine operations — no raw user IDs or playlist
					contents are kept.
				</p>
			</section>

			<section class="faq-section">
				<h2 class="text-lg font-semibold text-text-base sm:text-xl">Does Sprogeny track me?</h2>
				<p class="mt-2 leading-relaxed text-text-subdued">
					Sprogeny uses a self-hosted, cookieless analytics tool to count page views. No cookies are
					set, no personal information is collected, and no data is shared with third parties. There
					are no ad networks or tracking pixels.
				</p>
			</section>

			<section class="faq-section">
				<h2 class="text-lg font-semibold text-text-base sm:text-xl">
					Is my Spotify password safe?
				</h2>
				<p class="mt-2 leading-relaxed text-text-subdued">
					We never see or store your Spotify password. Authentication is handled entirely through
					Spotify's OAuth flow — we receive a temporary access token, never your credentials.
				</p>
			</section>

			<section class="faq-section">
				<h2 class="text-lg font-semibold text-text-base sm:text-xl">
					What Spotify permissions are requested?
				</h2>
				<p class="mt-2 leading-relaxed text-text-subdued">Only the minimum needed:</p>
				<ul class="mt-2 space-y-1.5 leading-relaxed text-text-subdued">
					<li>
						<code class="rounded bg-background-elevated-base/80 px-1.5 py-0.5 text-sm"
							>playlist-read-private</code
						> — Read your private playlists so you can select them as sources.
					</li>
					<li>
						<code class="rounded bg-background-elevated-base/80 px-1.5 py-0.5 text-sm"
							>playlist-read-collaborative</code
						> — Read collaborative playlists you're part of.
					</li>
					<li>
						<code class="rounded bg-background-elevated-base/80 px-1.5 py-0.5 text-sm"
							>playlist-modify-public</code
						> — Create the new combined playlists in your library.
					</li>
					<li>
						<code class="rounded bg-background-elevated-base/80 px-1.5 py-0.5 text-sm"
							>playlist-modify-private</code
						> — Create private combined playlists.
					</li>
				</ul>
				<p class="mt-2 leading-relaxed text-text-subdued">
					We do not access your listening history, saved tracks, or profile details beyond your
					display name.
				</p>
			</section>

			<section class="faq-section">
				<h2 class="text-lg font-semibold text-text-base sm:text-xl">Can I revoke access?</h2>
				<p class="mt-2 leading-relaxed text-text-subdued">
					Yes. Visit your
					<a
						href="https://www.spotify.com/account/apps/"
						target="_blank"
						rel="external noopener noreferrer"
						class="text-text-bright-accent hover:underline">Spotify account apps page</a
					>
					and remove Sprogeny at any time. This immediately revokes all access.
				</p>
			</section>

			<section class="faq-section">
				<h2 class="text-lg font-semibold text-text-base sm:text-xl">
					Where do the album covers on the home page come from?
				</h2>
				<p class="mt-2 leading-relaxed text-text-subdued">
					From the
					<a
						href="https://coverartarchive.org/"
						target="_blank"
						rel="external noopener noreferrer"
						class="text-text-bright-accent hover:underline">Cover Art Archive</a
					>, a joint project of MusicBrainz and the Internet Archive. They're shown as decoration
					only, and each cover belongs to its artist, label or designer. See the
					<a href={resolve('/terms')} class="text-text-bright-accent hover:underline"
						>Terms of Use</a
					> for details.
				</p>
			</section>

			<section class="faq-section">
				<h2 class="text-lg font-semibold text-text-base sm:text-xl">About</h2>
				<p class="mt-2 leading-relaxed text-text-subdued">
					Sprogeny is a <a
						href="https://joshuacurry.dev/"
						class="text-text-bright-accent hover:underline">personal project</a
					> built because I wanted a better way to combine playlists without manually dragging tracks
					around. It's built with SvelteKit, Three.js, and the Spotify Web API.
				</p>
				<p class="mt-2 leading-relaxed text-text-subdued">
					I also build tools for artists, like <a
						href="https://opencallmanager.com/"
						class="text-text-bright-accent hover:underline">Open Call Manager</a
					>, a platform for finding and tracking art open calls.
				</p>
				<p class="mt-2 leading-relaxed text-text-subdued">
					If you have questions, feature requests, or found a bug — <a
						href="https://joshuacurry.dev/"
						class="text-text-bright-accent hover:underline">I'd love to hear from you</a
					>.
				</p>
			</section>
		</div>

		<div class="mt-12 flex justify-center border-t border-decorative-subdued pt-8">
			<a
				href={resolve('/login')}
				class="inline-block rounded-full bg-essential-bright-accent px-6 py-3 font-medium text-essential-base transition hover:bg-text-bright-accent focus:ring-2 focus:ring-essential-bright-accent focus:ring-offset-2 focus:ring-offset-background-base focus:outline-none"
			>
				Get Started
			</a>
		</div>
	</main>
</div>

<style>
	.faq-section {
		background: rgba(0, 0, 0, 0.7);
		border: 1px solid rgba(68, 136, 255, 0.12);
		border-radius: 0.75rem;
		padding: 1.25rem 1.5rem;
		backdrop-filter: blur(4px);
	}
</style>
