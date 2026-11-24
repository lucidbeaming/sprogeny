<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { createAuthClient } from 'better-auth/client';
	import PageHeader from '$lib/components/PageHeader.svelte';

	let done = $state(false);

	const authClient = createAuthClient();

	onMount(async () => {
		await authClient.signOut();
		done = true;
	});
</script>

<svelte:head>
	<title>Signed Out – Sprogeny</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center px-4">
	<div class="w-full max-w-sm text-center">
		{#if done}
			<PageHeader subtitle="You've been signed out" />
			<div class="mt-8 flex justify-center gap-4">
				<a
					href={resolve('/')}
					class="rounded-full bg-essential-bright-accent px-6 py-3 font-medium text-essential-base transition hover:bg-text-bright-accent"
				>
					Home
				</a>
				<a
					href={resolve('/login')}
					class="rounded-full border border-decorative-subdued px-6 py-3 font-medium text-text-base transition hover:bg-background-elevated-highlight"
				>
					Sign in again
				</a>
			</div>
		{:else}
			<p class="text-text-subdued">Signing out…</p>
		{/if}
	</div>
</div>
