<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/PageHeader.svelte';
</script>

<svelte:head>
	<title>Terms of Use - Sprogeny</title>
	<meta
		name="description"
		content="Terms of use for Sprogeny, an independent Spotify playlist combining tool. Not affiliated with or endorsed by Spotify AB."
	/>
	<meta property="og:title" content="Terms of Use - Sprogeny" />
	<meta
		property="og:description"
		content="Terms of use for Sprogeny, an independent Spotify playlist combining tool. Not affiliated with or endorsed by Spotify AB."
	/>
	<meta property="og:image" content="https://sprogeny.com/images/ui/sprogenypreview.jpg" />
	<meta property="og:url" content="https://sprogeny.com/terms" />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-12">
	<PageHeader subtitle="Terms of Use" />
	<p class="mt-2 text-sm text-text-subdued">Last updated: November 23, 2026</p>

	<div class="mt-10 space-y-10">
		<section>
			<h2 class="text-xl font-semibold text-text-base">Independent Project Disclaimer</h2>
			<p class="mt-2 leading-relaxed text-text-subdued">
				Sprogeny is an independent, personal project. It is <strong class="text-text-base"
					>not affiliated with, endorsed by, or sponsored by Spotify AB</strong
				>
				or any of its subsidiaries. Spotify is a registered trademark of Spotify AB. All Spotify trademarks,
				logos, and brand names referenced on this site are the property of their respective owners and
				are used solely for identification purposes.
			</p>
		</section>

		<section>
			<h2 class="text-xl font-semibold text-text-base">Album Cover Art</h2>
			<p class="mt-2 leading-relaxed text-text-subdued">
				The album covers in the home page animation come from the
				<a
					href="https://coverartarchive.org/"
					target="_blank"
					rel="external noopener noreferrer"
					class="text-text-bright-accent hover:underline">Cover Art Archive</a
				>, a joint project of
				<a
					href="https://musicbrainz.org/"
					target="_blank"
					rel="external noopener noreferrer"
					class="text-text-bright-accent hover:underline">MusicBrainz</a
				>
				and the
				<a
					href="https://archive.org/"
					target="_blank"
					rel="external noopener noreferrer"
					class="text-text-bright-accent hover:underline">Internet Archive</a
				>. Each cover remains the property of its artist, label or designer. The covers are shown
				only as decoration: they don't imply any endorsement, and Sprogeny claims no rights in them.
				If you hold the rights to a cover and want it removed,
				<a
					href="https://joshuacurry.dev/"
					target="_blank"
					rel="external noopener noreferrer"
					class="text-text-bright-accent hover:underline">get in touch</a
				>.
			</p>
		</section>

		<section>
			<h2 class="text-xl font-semibold text-text-base">Use of the Spotify Platform</h2>
			<p class="mt-2 leading-relaxed text-text-subdued">
				Sprogeny accesses your Spotify data exclusively through the
				<a
					href="https://developer.spotify.com/documentation/web-api"
					target="_blank"
					rel="external noopener noreferrer"
					class="text-text-bright-accent hover:underline">official Spotify Web API</a
				>, in accordance with the
				<a
					href="https://developer.spotify.com/terms"
					target="_blank"
					rel="external noopener noreferrer"
					class="text-text-bright-accent hover:underline">Spotify Developer Terms of Service</a
				>. No proprietary code, non-public APIs, reverse-engineered endpoints, or unauthorized
				intellectual property from Spotify is used in this application.
			</p>
		</section>

		<section>
			<h2 class="text-xl font-semibold text-text-base">Authentication &amp; Credentials</h2>
			<p class="mt-2 leading-relaxed text-text-subdued">
				When you sign in, you are redirected to Spotify's own login page. Your Spotify username and
				password are entered directly on Spotify's servers — <strong class="text-text-base"
					>Sprogeny never sees, receives, or stores your Spotify password</strong
				>.
			</p>
			<p class="mt-2 leading-relaxed text-text-subdued">
				Authentication uses Spotify's industry-standard OAuth 2.0 flow. After you grant permission,
				Spotify issues a temporary access token that allows Sprogeny to perform the actions you
				authorized. This token expires automatically and can be revoked at any time from your
				<a
					href="https://www.spotify.com/account/apps/"
					target="_blank"
					rel="external noopener noreferrer"
					class="text-text-bright-accent hover:underline">Spotify account apps page</a
				>.
			</p>
		</section>

		<section>
			<h2 class="text-xl font-semibold text-text-base">Information Collected</h2>
			<p class="mt-2 leading-relaxed text-text-subdued">
				Sprogeny requests only the minimum Spotify permissions needed to function:
			</p>
			<ul class="mt-3 space-y-2 leading-relaxed text-text-subdued">
				<li>
					<strong class="text-text-base">Playlist data</strong> — names, track listings, and metadata
					for playlists you select as sources. This data is used in-memory to generate your combined playlists
					and is not stored after your session ends.
				</li>
				<li>
					<strong class="text-text-base">Display name</strong> — used to identify your account during
					the session. Not stored permanently.
				</li>
				<li>
					<strong class="text-text-base">Hashed track records</strong> — a non-reversible hash of tracks
					used in previous combines, stored to prevent duplicates. No raw track names, playlist contents,
					or user IDs are retained.
				</li>
			</ul>
			<p class="mt-3 leading-relaxed text-text-subdued">
				Sprogeny does <strong class="text-text-base">not</strong> access or collect:
			</p>
			<ul class="mt-2 space-y-1.5 leading-relaxed text-text-subdued">
				<li>Your listening history or play counts</li>
				<li>Your saved or liked tracks</li>
				<li>Your email address or profile details</li>
				<li>Your payment or subscription information</li>
			</ul>
		</section>

		<section>
			<h2 class="text-xl font-semibold text-text-base">Session &amp; Cookies</h2>
			<p class="mt-2 leading-relaxed text-text-subdued">
				Your session is maintained through an encrypted cookie. This cookie contains only session
				identifiers — no personal data, no tracking data, and no advertising cookies. Sprogeny uses
				a self-hosted, cookieless analytics tool (Matomo) to count page views. No cookies are set
				for analytics, no personal information is collected, and no data is shared with third
				parties.
			</p>
		</section>

		<section>
			<h2 class="text-xl font-semibold text-text-base">No Warranties</h2>
			<p class="mt-2 leading-relaxed text-text-subdued">
				Sprogeny is provided "as is" without warranties of any kind, express or implied. There is no
				guarantee of availability, accuracy, or fitness for a particular purpose. The service may be
				modified, suspended, or discontinued at any time without notice.
			</p>
		</section>

		<section>
			<h2 class="text-xl font-semibold text-text-base">Your Responsibilities</h2>
			<p class="mt-2 leading-relaxed text-text-subdued">
				By using Sprogeny, you agree that you have an active Spotify account and that your use of
				Sprogeny complies with
				<a
					href="https://www.spotify.com/legal/end-user-agreement/"
					target="_blank"
					rel="external noopener noreferrer"
					class="text-text-bright-accent hover:underline">Spotify's Terms of Service</a
				>. You are responsible for the playlists you create and the content within them.
			</p>
		</section>

		<section>
			<h2 class="text-xl font-semibold text-text-base">Changes to These Terms</h2>
			<p class="mt-2 leading-relaxed text-text-subdued">
				These terms may be updated from time to time. Continued use of Sprogeny after changes
				constitutes acceptance of the updated terms. The "Last updated" date at the top of this page
				reflects the most recent revision.
			</p>
		</section>
	</div>

	<div class="mt-12 flex justify-center border-t border-decorative-subdued pt-8">
		<a
			href={resolve('/login')}
			class="inline-block rounded-full bg-essential-bright-accent px-6 py-3 font-medium text-essential-base transition hover:bg-text-bright-accent"
		>
			Get Started
		</a>
	</div>
</div>
