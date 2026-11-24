<script lang="ts">
	import { dev } from '$app/environment';
	import { StageManager, type DebugState } from '$lib/three/StageManager';

	let { scrollProgress = 0 }: { scrollProgress?: number } = $props();

	let canvas: HTMLCanvasElement;
	let debugState = $state<DebugState | null>(null);

	let DevOverlay: typeof import('./DevOverlay.svelte').default | null = $state(null);

	$effect(() => {
		const manager = new StageManager(canvas);
		let cleanup: (() => void) | undefined;

		if (dev) {
			import('./DevOverlay.svelte').then((m) => {
				DevOverlay = m.default;
			});
			manager.onDebugUpdate = (state) => {
				debugState = { ...state };
			};
		}

		manager.start().then((c) => {
			cleanup = c;
		});

		$effect(() => {
			manager.setScrollProgress(scrollProgress);
		});

		return () => {
			cleanup?.();
		};
	});
</script>

<canvas bind:this={canvas} class="absolute inset-0 h-full w-full bg-background-base"></canvas>

{#if dev && DevOverlay && debugState}
	<DevOverlay {debugState} />
{/if}
