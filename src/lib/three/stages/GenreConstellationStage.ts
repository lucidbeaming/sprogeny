import * as THREE from 'three';
import type { Stage } from './types';
import {
	buildGenreGraph,
	getFamilyColor,
	type GenreNode,
	type GenreConnection
} from '../genreGraph';
import { constellationConfig } from './constellationConfig';
import { createGlowTextTexture } from '../glowText';
import { device } from '$lib/device.svelte';
import { untrack } from 'svelte';

/** Logical canvas size for label textures (actual pixels = this × texScale in createLabelSprite). */
const LABEL_CANVAS_W = 400;
const LABEL_CANVAS_H = 64;

export class GenreConstellationStage implements Stage {
	readonly group: THREE.Group;
	private readonly nodeGroup: THREE.Group;
	private readonly lineGroup: THREE.Group;
	private nodes: GenreNode[] = [];
	private connections: GenreConnection[] = [];
	private labelSprites: THREE.Sprite[] = [];
	private elapsedTime = 0;
	private readonly scale: number;
	private readonly baseY: number;

	constructor(private genres: string[]) {
		const isMobile = untrack(() => device.mobile);
		this.scale = isMobile ? 0.8 : constellationConfig.SCALE;
		this.baseY = isMobile ? 0 : constellationConfig.CLOUD_BASE_Y;
		this.group = new THREE.Group();
		this.nodeGroup = new THREE.Group();
		this.lineGroup = new THREE.Group();
		this.group.add(this.nodeGroup);
		this.group.add(this.lineGroup);
		this.group.position.y = this.baseY;
		// Match stageProgress === 0 before first update (linear −1 → −VERTICAL_TRAVEL on children)
		this.nodeGroup.position.y = -constellationConfig.VERTICAL_TRAVEL;
		this.lineGroup.position.y = -constellationConfig.VERTICAL_TRAVEL;
	}

	async init(): Promise<void> {
		if (this.genres.length === 0) return;

		const { nodes, connections } = buildGenreGraph(this.genres);
		this.nodes = nodes;
		this.connections = connections;

		for (const node of nodes) {
			const sprite = this.createLabelSprite(node.genre, getFamilyColor(node.genre));
			sprite.position.copy(node.position);
			// Match sprite quad aspect to texture aspect so labels are not stretched
			const labelAspect = LABEL_CANVAS_W / LABEL_CANVAS_H;
			sprite.scale.set(
				constellationConfig.LABEL_WORLD_H * labelAspect,
				constellationConfig.LABEL_WORLD_H,
				1
			);
			this.nodeGroup.add(sprite);
			this.labelSprites.push(sprite);
		}

		for (const conn of connections) {
			const from = nodes[conn.from].position;
			const to = nodes[conn.to].position;
			const points = [from, to];
			const geometry = new THREE.BufferGeometry().setFromPoints(points);
			const material = new THREE.LineBasicMaterial({
				color: constellationConfig.LINE_COLOR,
				transparent: true,
				opacity: conn.strength * constellationConfig.LINE_OPACITY_MULT,
				blending: THREE.AdditiveBlending
			});
			const line = new THREE.Line(geometry, material);
			this.lineGroup.add(line);
		}
	}

	update(stageProgress: number, deltaTime: number, _camera: THREE.Camera): void {
		this.elapsedTime += deltaTime;

		const t = Math.max(0, Math.min(1, stageProgress));
		const linearProgress = t * 2 - 1;
		const scrollY = linearProgress * constellationConfig.VERTICAL_TRAVEL;
		this.group.position.y = this.baseY;
		this.nodeGroup.position.y = scrollY;
		this.lineGroup.position.y = scrollY;

		const edgeDistance = Math.abs(linearProgress);
		const speedMultiplier = 1 + edgeDistance * constellationConfig.EDGE_SPEED_MULT;
		this.group.rotation.y += constellationConfig.BASE_SPIN_SPEED * speedMultiplier;
		this.group.rotation.x =
			Math.sin(this.elapsedTime * constellationConfig.BREATHING_SPEED * 1000) *
			constellationConfig.BREATHING_AMP;

		this.group.scale.setScalar(this.scale);

		const labelOpacity = constellationConfig.LABEL_OPACITY;
		for (const sprite of this.labelSprites) {
			(sprite.material as THREE.SpriteMaterial).opacity = labelOpacity;
		}
	}

	setVisibility(visible: boolean): void {
		this.group.visible = visible;
	}

	dispose(): void {
		this.nodeGroup.children.forEach((child) => {
			const sprite = child as THREE.Sprite;
			if (sprite.material.map) sprite.material.map.dispose();
			sprite.material.dispose();
		});
		this.lineGroup.children.forEach((child) => {
			const line = child as THREE.Line;
			line.geometry.dispose();
			(line.material as THREE.Material).dispose();
		});
		this.nodeGroup.clear();
		this.lineGroup.clear();
	}

	private createLabelSprite(text: string, color: number): THREE.Sprite {
		const texScale = untrack(() => device.textureScale);
		const fontPx = (24 * LABEL_CANVAS_H) / 128;
		const blurPx = (12 * LABEL_CANVAS_H) / 128;
		const hex = '#' + color.toString(16).padStart(6, '0');
		const opacity = constellationConfig.LABEL_OPACITY;

		const texture = createGlowTextTexture(text, {
			width: LABEL_CANVAS_W * texScale,
			height: LABEL_CANVAS_H * texScale,
			fontSize: fontPx * texScale,
			color: hex,
			glowBlur: blurPx * texScale
		});

		const material = new THREE.SpriteMaterial({
			map: texture,
			transparent: true,
			opacity,
			blending: THREE.AdditiveBlending,
			depthWrite: false
		});

		return new THREE.Sprite(material);
	}
}
