import * as THREE from 'three';
import { device } from '$lib/device.svelte';
import { untrack } from 'svelte';

export interface ThreeContext {
	renderer: THREE.WebGLRenderer;
	scene: THREE.Scene;
	camera: THREE.PerspectiveCamera;
	dispose: () => void;
	addResizeCallback: (cb: () => void) => void;
}

export function createThreeContext(canvas: HTMLCanvasElement): ThreeContext {
	// Snapshot device values to avoid reactive subscriptions in $effect callers
	const dpr = untrack(() => device.renderDpr);
	const antialias = untrack(() => device.enableAntialias);

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.5, 500);
	camera.position.set(0, 0, 30);
	camera.lookAt(0, 0, 0);

	const renderer = new THREE.WebGLRenderer({ canvas, antialias, alpha: true });
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setPixelRatio(dpr);

	const extraCallbacks: (() => void)[] = [];

	const handleResize = () => {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(window.innerWidth, window.innerHeight);
		for (const cb of extraCallbacks) cb();
	};
	window.addEventListener('resize', handleResize);

	return {
		renderer,
		scene,
		camera,
		addResizeCallback: (cb) => extraCallbacks.push(cb),
		dispose: () => {
			window.removeEventListener('resize', handleResize);
			renderer.dispose();
		}
	};
}
