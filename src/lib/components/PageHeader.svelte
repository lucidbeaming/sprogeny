<script lang="ts">
	let { subtitle }: { subtitle: string } = $props();
</script>

<header class="mb-8 flex flex-col items-center gap-1 text-center">
	<h1 class="text-6xl md:text-8xl">Sprogeny</h1>
	<h2 class="py-6 text-3xl font-normal sm:text-2xl" style="font-family: var(--font-sans)">
		{subtitle}
	</h2>
</header>
