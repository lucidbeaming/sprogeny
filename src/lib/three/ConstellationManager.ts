import { GenreConstellationStage } from './stages/GenreConstellationStage';
import { createThreeContext } from './createContext';
import { fetchGenres } from './fetchGenres';

export interface ConstellationDebugState {
	fps: number;
	stageName: string;
}

export class ConstellationManager {
	private ctx;
	private stage: GenreConstellationStage | null = null;
	private animationId = 0;
	private lastTime = 0;
	public onDebugUpdate: ((state: ConstellationDebugState) => void) | null = null;
	public debugState: ConstellationDebugState = {
		fps: 0,
		stageName: 'Genre Constellation'
	};

	constructor(canvas: HTMLCanvasElement) {
		this.ctx = createThreeContext(canvas);
	}

	async start(): Promise<() => void> {
		const genres = await fetchGenres();

		this.stage = new GenreConstellationStage(genres);
		this.ctx.scene.add(this.stage.group);
		this.stage.setVisibility(true);
		await this.stage.init();

		this.lastTime = performance.now();
		this.animate();

		return () => {
			cancelAnimationFrame(this.animationId);
			this.stage?.dispose();
			this.ctx.dispose();
		};
	}

	private animate = (): void => {
		this.animationId = requestAnimationFrame(this.animate);

		const now = performance.now();
		const deltaTime = (now - this.lastTime) / 1000;
		this.lastTime = now;

		this.debugState.fps = deltaTime > 0 ? 1 / deltaTime : 0;

		this.stage?.update(0.5, deltaTime, this.ctx.camera);

		this.ctx.renderer.setRenderTarget(null);
		this.ctx.renderer.render(this.ctx.scene, this.ctx.camera);

		this.onDebugUpdate?.(this.debugState);
	};
}
