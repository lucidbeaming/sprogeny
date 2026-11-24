<script lang="ts">
	import { dev } from '$app/environment';
	import {
		ConstellationManager,
		type ConstellationDebugState
	} from '$lib/three/ConstellationManager';

	let canvas: HTMLCanvasElement;
	let debugState = $state<ConstellationDebugState | null>(null);

	let FaqDevOverlay: typeof import('./FaqDevOverlay.svelte').default | null = $state(null);

	$effect(() => {
		const manager = new ConstellationManager(canvas);
		let cleanup: (() => void) | undefined;

		if (dev) {
			import('./FaqDevOverlay.svelte').then((m) => {
				FaqDevOverlay = m.default;
			});
			manager.onDebugUpdate = (state) => {
				debugState = { ...state };
			};
		}

		manager.start().then((c) => {
			cleanup = c;
		});

		return () => {
			cleanup?.();
		};
	});
</script>

<canvas bind:this={canvas} class="fixed inset-0 h-full w-full"></canvas>

{#if dev && FaqDevOverlay && debugState}
	<FaqDevOverlay {debugState} />
{/if}
