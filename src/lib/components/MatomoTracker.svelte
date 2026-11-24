<script lang="ts">
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { tick, onMount } from 'svelte';

	let previousPageUrl: string | undefined = undefined;

	onMount(() => {
		if (window._paq) return;
		window._paq = [];
		window._paq.push(['disableCookies']);
		window._paq.push(['setTrackerUrl', 'https://lucidbeaming.net/m/matomo.php']);
		window._paq.push(['setSiteId', '10']);
		const script = document.createElement('script');
		script.async = true;
		script.src = 'https://lucidbeaming.net/m/matomo.js';
		document.head.appendChild(script);
		return () => script.remove();
	});

	$effect(() => {
		const pathname = page.url.pathname;
		const hash = page.url.hash ?? '';
		const currentUrl = pathname + hash;

		if (!browser) return;
		if (!window._paq) return;
		if (previousPageUrl !== undefined && currentUrl === previousPageUrl) return;

		async function pushParamsAndTrack() {
			await tick();
			const referrer = previousPageUrl ?? document.referrer ?? '';
			window._paq!.push(['setReferrerUrl', referrer]);
			window._paq!.push(['setCustomUrl', currentUrl]);
			window._paq!.push(['setDocumentTitle', document.title]);
			window._paq!.push(['trackPageView']);
			previousPageUrl = currentUrl;
		}

		pushParamsAndTrack();
	});
</script>
