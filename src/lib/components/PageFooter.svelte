<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	let user = $derived(page.data.user);
</script>

<footer class="relative z-10 mt-auto flex items-center justify-center gap-4 pt-20 pb-3">
	<a href={resolve('/')} class="text-sm text-text-subdued transition hover:text-text-base">Home</a>
	<a href={resolve('/faq')} class="text-sm text-text-subdued transition hover:text-text-base">FAQ</a
	>
	{#if user}
		<a href={resolve('/logout')} class="text-sm text-text-subdued transition hover:text-text-base"
			>Logout</a
		>
	{:else}
		<a href={resolve('/login')} class="text-sm text-text-subdued transition hover:text-text-base"
			>Login</a
		>
	{/if}
	<a href={resolve('/terms')} class="text-sm text-text-subdued transition hover:text-text-base"
		>Terms of Use</a
	>
</footer>
