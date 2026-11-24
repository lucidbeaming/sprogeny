<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	const messages: Record<number, string> = {
		400: 'Bad request.',
		401: 'You need to sign in to view this page.',
		403: 'You don\u2019t have permission to view this page.',
		404: 'The page you\u2019re looking for doesn\u2019t exist.',
		500: 'Something went wrong on our end.',
		503: 'The service is temporarily unavailable. Please try again later.'
	};

	let status = $derived(page.status);
	let message = $derived(messages[status] ?? 'An unexpected error occurred.');
</script>

<svelte:head>
	<title>{status} | Sprogeny</title>
</svelte:head>

<main id="main-content" class="flex flex-1 flex-col items-center justify-center px-4 text-center">
	<p class="text-6xl font-bold text-text-subdued">{status}</p>
	<p class="mt-4 text-lg text-text-base">{message}</p>
	<a
		href={resolve('/')}
		class="mt-8 rounded-full bg-essential-bright-accent px-6 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
	>
		Go home
	</a>
</main>
