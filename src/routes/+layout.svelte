<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import MatomoTracker from '$lib/components/MatomoTracker.svelte';
	import PageFooter from '$lib/components/PageFooter.svelte';
	import { device } from '$lib/device.svelte';
	import { page } from '$app/state';

	let { children } = $props();

	let isHomepage = $derived(page.url.pathname === '/');

	$effect(() => {
		device.init();
		return () => device.destroy();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		rel="preload"
		as="style"
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Kablammo:wght@400&family=PT+Sans+Narrow:wght@400;700&display=fallback"
	/>
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Kablammo:wght@400&family=PT+Sans+Narrow:wght@400;700&display=fallback"
		rel="stylesheet"
	/>
	<meta property="og:site_name" content="Sprogeny" />
</svelte:head>
<MatomoTracker />
<a
	href="#main-content"
	class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-essential-bright-accent focus:px-4 focus:py-2 focus:text-essential-base"
	>Skip to main content</a
>
<div class="flex min-h-dvh flex-col">
	{@render children()}
	{#if !isHomepage}
		<PageFooter />
	{/if}
</div>
