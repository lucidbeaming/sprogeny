import type * as THREE from 'three';

export interface Stage {
	readonly group: THREE.Group;
	init(): Promise<void>;
	update(stageProgress: number, deltaTime: number, camera: THREE.Camera): void;
	dispose(): void;
	setVisibility(visible: boolean): void;
}
