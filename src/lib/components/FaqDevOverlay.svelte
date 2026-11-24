<script lang="ts">
	import type { ConstellationDebugState } from '$lib/three/ConstellationManager';
	import { constellationConfig } from '$lib/three/stages/constellationConfig';

	let { debugState }: { debugState: ConstellationDebugState } = $props();

	let collapsed = $state(false);

	let g_cloudBaseY = $state(constellationConfig.CLOUD_BASE_Y);
	let g_vertTravel = $state(constellationConfig.VERTICAL_TRAVEL);
	let g_scale = $state(constellationConfig.SCALE);
	let g_spinSpeed = $state(constellationConfig.BASE_SPIN_SPEED);
	let g_edgeMult = $state(constellationConfig.EDGE_SPEED_MULT);
	let g_breathSpeed = $state(constellationConfig.BREATHING_SPEED);
	let g_breathAmp = $state(constellationConfig.BREATHING_AMP);
	let g_lineOpacity = $state(constellationConfig.LINE_OPACITY_MULT);
	let g_labelH = $state(constellationConfig.LABEL_WORLD_H);
	let g_labelOpacity = $state(constellationConfig.LABEL_OPACITY);

	$effect(() => {
		constellationConfig.CLOUD_BASE_Y = g_cloudBaseY;
		constellationConfig.VERTICAL_TRAVEL = g_vertTravel;
		constellationConfig.SCALE = g_scale;
		constellationConfig.BASE_SPIN_SPEED = g_spinSpeed;
		constellationConfig.EDGE_SPEED_MULT = g_edgeMult;
		constellationConfig.BREATHING_SPEED = g_breathSpeed;
		constellationConfig.BREATHING_AMP = g_breathAmp;
		constellationConfig.LINE_OPACITY_MULT = g_lineOpacity;
		constellationConfig.LABEL_WORLD_H = g_labelH;
		constellationConfig.LABEL_OPACITY = g_labelOpacity;
	});

	let exportFeedback = $state('');
	let feedbackTimeout: ReturnType<typeof setTimeout> | undefined;
	$effect(() => () => clearTimeout(feedbackTimeout));

	async function exportConfig() {
		try {
			const res = await fetch('/api/dev/export-config', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'constellationConfig', config: { ...constellationConfig } })
			});
			const data = await res.json();
			clearTimeout(feedbackTimeout);
			exportFeedback = res.ok ? `Saved ${data.path}` : `Error: ${data.message ?? res.statusText}`;
		} catch (e) {
			clearTimeout(feedbackTimeout);
			exportFeedback = `Failed: ${e instanceof Error ? e.message : 'unknown error'}`;
		}
		feedbackTimeout = setTimeout(() => (exportFeedback = ''), 2500);
	}
</script>

<div class="panel" class:collapsed>
	<button class="toggle" onclick={() => (collapsed = !collapsed)}>
		{collapsed ? 'DEV' : 'x'}
	</button>

	{#if !collapsed}
		<div class="section status">
			<div class="row">
				<span class="label">Stage</span>
				<span class="value">{debugState.stageName}</span>
			</div>
			<div class="row">
				<span class="label">FPS</span>
				<span class="value">{Math.round(debugState.fps)}</span>
			</div>
		</div>

		<div class="sliders">
			<div class="slider-group">
				<label for="faq-cloudBaseY">Cloud Base Y <span>{g_cloudBaseY.toFixed(1)}</span></label>
				<input
					id="faq-cloudBaseY"
					type="range"
					min="-20"
					max="40"
					step="1"
					bind:value={g_cloudBaseY}
				/>
			</div>
			<div class="slider-group">
				<label for="faq-vertTravel">Vertical Travel <span>{g_vertTravel.toFixed(0)}</span></label>
				<input
					id="faq-vertTravel"
					type="range"
					min="10"
					max="100"
					step="2"
					bind:value={g_vertTravel}
				/>
			</div>
			<div class="slider-group">
				<label for="faq-scale">Scale <span>{g_scale.toFixed(2)}</span></label>
				<input id="faq-scale" type="range" min="0.3" max="4" step="0.05" bind:value={g_scale} />
			</div>
			<div class="slider-group">
				<label for="faq-spinSpeed">Spin Speed <span>{g_spinSpeed.toFixed(5)}</span></label>
				<input
					id="faq-spinSpeed"
					type="range"
					min="0"
					max="0.005"
					step="0.0001"
					bind:value={g_spinSpeed}
				/>
			</div>
			<div class="slider-group">
				<label for="faq-edgeMult">Edge Speed Mult <span>{g_edgeMult.toFixed(1)}</span></label>
				<input id="faq-edgeMult" type="range" min="0" max="20" step="0.5" bind:value={g_edgeMult} />
			</div>
			<div class="slider-group">
				<label for="faq-breathSpeed">Breathing Speed <span>{g_breathSpeed.toFixed(6)}</span></label>
				<input
					id="faq-breathSpeed"
					type="range"
					min="0"
					max="0.0005"
					step="0.00001"
					bind:value={g_breathSpeed}
				/>
			</div>
			<div class="slider-group">
				<label for="faq-breathAmp">Breathing Amp <span>{g_breathAmp.toFixed(2)}</span></label>
				<input
					id="faq-breathAmp"
					type="range"
					min="0"
					max="0.5"
					step="0.01"
					bind:value={g_breathAmp}
				/>
			</div>
			<div class="slider-group">
				<label for="faq-lineOpacity">Line Opacity <span>{g_lineOpacity.toFixed(2)}</span></label>
				<input
					id="faq-lineOpacity"
					type="range"
					min="0"
					max="2"
					step="0.05"
					bind:value={g_lineOpacity}
				/>
			</div>
			<div class="slider-group">
				<label for="faq-labelOpacity">Label Opacity <span>{g_labelOpacity.toFixed(2)}</span></label>
				<input
					id="faq-labelOpacity"
					type="range"
					min="0"
					max="1"
					step="0.05"
					bind:value={g_labelOpacity}
				/>
			</div>
			<div class="slider-group">
				<label for="faq-labelH">Label Height <span>{g_labelH.toFixed(2)}</span></label>
				<input id="faq-labelH" type="range" min="0.5" max="4" step="0.1" bind:value={g_labelH} />
			</div>

			<button class="export-btn" onclick={exportConfig}>
				{exportFeedback || 'Save Constellation Config'}
			</button>
		</div>
	{/if}
</div>

<style>
	.panel {
		position: fixed;
		top: 8px;
		right: 8px;
		z-index: 9999;
		width: 280px;
		max-height: calc(100vh - 16px);
		overflow-y: auto;
		background: rgba(0, 0, 0, 0.85);
		border: 1px solid rgba(68, 136, 255, 0.3);
		border-radius: 8px;
		font-family: 'SF Mono', 'Fira Code', monospace;
		font-size: 11px;
		color: rgba(255, 255, 255, 0.9);
		backdrop-filter: blur(8px);
		scrollbar-width: thin;
		scrollbar-color: rgba(68, 136, 255, 0.3) transparent;
	}
	.panel.collapsed {
		width: auto;
		max-height: none;
		overflow: visible;
		background: transparent;
		border: none;
		backdrop-filter: none;
	}
	.toggle {
		position: absolute;
		top: 4px;
		right: 4px;
		z-index: 1;
		width: 28px;
		height: 28px;
		border: 1px solid rgba(68, 136, 255, 0.4);
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.8);
		color: rgba(68, 136, 255, 0.8);
		font-size: 10px;
		font-weight: bold;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.toggle:hover {
		background: rgba(68, 136, 255, 0.15);
	}
	.section {
		padding: 10px 10px 6px;
	}
	.status {
		border-bottom: 1px solid rgba(68, 136, 255, 0.15);
	}
	.row {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 5px;
	}
	.label {
		color: rgba(68, 136, 255, 0.7);
		min-width: 52px;
		flex-shrink: 0;
	}
	.value {
		color: #fff;
		font-variant-numeric: tabular-nums;
	}
	.sliders {
		padding: 8px 10px;
	}
	.slider-group {
		margin-bottom: 6px;
	}
	.slider-group label {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2px;
		color: rgba(255, 255, 255, 0.6);
		font-size: 10px;
	}
	.slider-group label span {
		color: rgba(255, 255, 255, 0.9);
		font-variant-numeric: tabular-nums;
	}
	.slider-group input[type='range'] {
		width: 100%;
		height: 4px;
		-webkit-appearance: none;
		appearance: none;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 2px;
		outline: none;
	}
	.slider-group input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: rgba(68, 136, 255, 0.8);
		cursor: pointer;
		border: 1px solid rgba(68, 136, 255, 0.4);
	}
	.slider-group input[type='range']::-moz-range-thumb {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: rgba(68, 136, 255, 0.8);
		cursor: pointer;
		border: 1px solid rgba(68, 136, 255, 0.4);
	}
	.export-btn {
		width: 100%;
		margin-top: 6px;
		padding: 5px 0;
		border: 1px solid rgba(68, 136, 255, 0.3);
		border-radius: 4px;
		background: rgba(68, 136, 255, 0.1);
		color: rgba(68, 136, 255, 0.85);
		font-family: inherit;
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		cursor: pointer;
	}
	.export-btn:hover {
		background: rgba(68, 136, 255, 0.2);
		color: rgba(68, 136, 255, 1);
	}
</style>
