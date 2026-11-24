import { ImageCarouselStage } from './stages/ImageCarouselStage';
import { createThreeContext } from './createContext';

export interface DebugState {
	scrollProgress: number;
	fps: number;
}

export class StageManager {
	private ctx;
	private stage: ImageCarouselStage | null = null;
	private animationId = 0;
	private scrollProgress = 0;
	private lastTime = 0;
	public onDebugUpdate: ((state: DebugState) => void) | null = null;
	public debugState: DebugState = {
		scrollProgress: 0,
		fps: 0
	};

	constructor(canvas: HTMLCanvasElement) {
		this.ctx = createThreeContext(canvas);
	}

	async start(): Promise<() => void> {
		const stage = new ImageCarouselStage();
		this.stage = stage;

		this.ctx.scene.add(stage.group);
		stage.setVisibility(true);

		await stage.init();

		this.lastTime = performance.now();
		this.animate();

		return () => {
			cancelAnimationFrame(this.animationId);
			stage.dispose();
			this.ctx.dispose();
		};
	}

	setScrollProgress(progress: number): void {
		this.scrollProgress = progress;
	}

	private animate = (): void => {
		this.animationId = requestAnimationFrame(this.animate);

		const now = performance.now();
		const deltaTime = (now - this.lastTime) / 1000;
		this.lastTime = now;

		const { renderer, scene, camera } = this.ctx;

		const ds = this.debugState;
		ds.scrollProgress = this.scrollProgress;
		ds.fps = deltaTime > 0 ? 1 / deltaTime : 0;

		this.stage?.update(this.scrollProgress, deltaTime, camera);

		renderer.setRenderTarget(null);
		renderer.render(scene, camera);

		this.onDebugUpdate?.(ds);
	};
}
