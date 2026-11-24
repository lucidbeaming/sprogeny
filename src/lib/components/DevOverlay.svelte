<script lang="ts">
	import type { DebugState } from '$lib/three/StageManager';
	import { carouselConfig } from '$lib/three/stages/carouselConfig';

	let { debugState }: { debugState: DebugState } = $props();

	let collapsed = $state(false);

	// Carousel
	let c_radius = $state(carouselConfig.R);
	let c_planeHeight = $state(carouselConfig.PLANE_HEIGHT);
	let c_rotSpeed = $state(carouselConfig.ROTATION_SPEED);
	let c_spread = $state(carouselConfig.SPREAD);
	let c_lineMaxDist = $state(carouselConfig.LINE_MAX_DIST);
	let c_lineChance = $state(carouselConfig.LINE_CHANCE);
	let c_lineLifetime = $state(carouselConfig.LINE_LIFETIME);
	let c_lineWaveAmp = $state(carouselConfig.LINE_WAVE_AMP);
	let c_lineWaveFreq = $state(carouselConfig.LINE_WAVE_FREQ);
	let c_lineArcBulge = $state(carouselConfig.LINE_ARC_BULGE);
	let c_lineThickness = $state(carouselConfig.LINE_THICKNESS);
	let c_lineGlow = $state(carouselConfig.LINE_GLOW);

	// Write back to mutable configs
	$effect(() => {
		carouselConfig.R = c_radius;
		carouselConfig.PLANE_HEIGHT = c_planeHeight;
		carouselConfig.ROTATION_SPEED = c_rotSpeed;
		carouselConfig.SPREAD = c_spread;
		carouselConfig.LINE_MAX_DIST = c_lineMaxDist;
		carouselConfig.LINE_CHANCE = c_lineChance;
		carouselConfig.LINE_LIFETIME = c_lineLifetime;
		carouselConfig.LINE_WAVE_AMP = c_lineWaveAmp;
		carouselConfig.LINE_WAVE_FREQ = c_lineWaveFreq;
		carouselConfig.LINE_ARC_BULGE = c_lineArcBulge;
		carouselConfig.LINE_THICKNESS = c_lineThickness;
		carouselConfig.LINE_GLOW = c_lineGlow;
	});

	let exportFeedback = $state('');
	let feedbackTimeout: ReturnType<typeof setTimeout> | undefined;
	$effect(() => () => clearTimeout(feedbackTimeout));

	function currentConfigPayload(): { name: string; config: unknown } {
		return { name: 'carouselConfig', config: { ...carouselConfig } };
	}

	async function exportConfig() {
		const { name, config } = currentConfigPayload();

		try {
			const res = await fetch('/api/dev/export-config', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, config })
			});
			const data = await res.json();
			clearTimeout(feedbackTimeout);
			if (res.ok) {
				exportFeedback = `Saved ${data.path}`;
			} else {
				exportFeedback = `Error: ${data.message ?? res.statusText}`;
			}
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
		<!-- Status panel -->
		<div class="section status">
			<div class="row">
				<span class="label">Scroll</span>
				<span class="value">{debugState.scrollProgress.toFixed(4)}</span>
				<div class="bar">
					<div class="bar-fill" style="width: {debugState.scrollProgress * 100}%"></div>
				</div>
			</div>
			<div class="row">
				<span class="label">FPS</span>
				<span class="value">{Math.round(debugState.fps)}</span>
			</div>
		</div>

		<!-- Slider panel -->
		<div class="sliders">
			<div class="slider-group">
				<label for="dev-radius">Radius <span>{c_radius.toFixed(1)}</span></label>
				<input id="dev-radius" type="range" min="3" max="30" step="0.5" bind:value={c_radius} />
			</div>
			<div class="slider-group">
				<label for="dev-planeHeight">Plane Height <span>{c_planeHeight.toFixed(1)}</span></label>
				<input
					id="dev-planeHeight"
					type="range"
					min="0.5"
					max="6"
					step="0.1"
					bind:value={c_planeHeight}
				/>
			</div>
			<div class="slider-group">
				<label for="dev-rotSpeed">Rotation Speed <span>{c_rotSpeed.toFixed(5)}</span></label>
				<input
					id="dev-rotSpeed"
					type="range"
					min="0"
					max="0.003"
					step="0.0001"
					bind:value={c_rotSpeed}
				/>
			</div>
			<div class="slider-group">
				<label for="dev-spread">Spread <span>{c_spread.toFixed(1)}</span></label>
				<input id="dev-spread" type="range" min="0" max="15" step="0.5" bind:value={c_spread} />
			</div>
			<div class="slider-group">
				<label for="dev-lineMaxDist">Line Max Dist <span>{c_lineMaxDist.toFixed(1)}</span></label>
				<input
					id="dev-lineMaxDist"
					type="range"
					min="1"
					max="20"
					step="0.5"
					bind:value={c_lineMaxDist}
				/>
			</div>
			<div class="slider-group">
				<label for="dev-lineChance">Line Chance <span>{c_lineChance.toFixed(3)}</span></label>
				<input
					id="dev-lineChance"
					type="range"
					min="0"
					max="0.2"
					step="0.005"
					bind:value={c_lineChance}
				/>
			</div>
			<div class="slider-group">
				<label for="dev-lineLifetime">Line Lifetime <span>{c_lineLifetime}</span></label>
				<input
					id="dev-lineLifetime"
					type="range"
					min="10"
					max="300"
					step="5"
					bind:value={c_lineLifetime}
				/>
			</div>
			<div class="slider-group">
				<label for="dev-lineWaveAmp">Wave Amp <span>{c_lineWaveAmp.toFixed(2)}</span></label>
				<input
					id="dev-lineWaveAmp"
					type="range"
					min="0"
					max="1"
					step="0.01"
					bind:value={c_lineWaveAmp}
				/>
			</div>
			<div class="slider-group">
				<label for="dev-lineWaveFreq">Wave Freq <span>{c_lineWaveFreq.toFixed(1)}</span></label>
				<input
					id="dev-lineWaveFreq"
					type="range"
					min="0"
					max="10"
					step="0.5"
					bind:value={c_lineWaveFreq}
				/>
			</div>
			<div class="slider-group">
				<label for="dev-lineArcBulge">Arc Bulge <span>{c_lineArcBulge.toFixed(2)}</span></label>
				<input
					id="dev-lineArcBulge"
					type="range"
					min="0"
					max="3"
					step="0.05"
					bind:value={c_lineArcBulge}
				/>
			</div>
			<div class="slider-group">
				<label for="dev-lineThickness"
					>Line Thickness <span>{c_lineThickness.toFixed(3)}</span></label
				>
				<input
					id="dev-lineThickness"
					type="range"
					min="0.005"
					max="0.2"
					step="0.005"
					bind:value={c_lineThickness}
				/>
			</div>
			<div class="slider-group">
				<label for="dev-lineGlow">Line Glow <span>{c_lineGlow.toFixed(2)}</span></label>
				<input id="dev-lineGlow" type="range" min="0" max="1" step="0.05" bind:value={c_lineGlow} />
			</div>

			<button class="export-btn" onclick={exportConfig}>
				{exportFeedback || 'Save Carousel Config'}
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

	.bar {
		flex: 1;
		height: 6px;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 3px;
		position: relative;
		overflow: hidden;
	}
	.bar-fill {
		position: absolute;
		left: 0;
		top: 0;
		height: 100%;
		background: rgba(68, 136, 255, 0.6);
		border-radius: 3px;
		transition: width 0.05s linear;
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
