import * as THREE from 'three';
import type { Stage } from './types';
import { carouselConfig } from './carouselConfig';
import { smoothstep } from '../easing';
import { device } from '$lib/device.svelte';
import { untrack } from 'svelte';

interface ActiveLine {
	meshes: THREE.Mesh[];
	age: number;
	maxAge: number;
	meshA: THREE.Mesh;
	meshB: THREE.Mesh;
	arcDir: THREE.Vector3;
	phase: number;
}

export class ImageCarouselStage implements Stage {
	readonly group: THREE.Group;
	private readonly imageGroup: THREE.Group;
	private readonly lineGroup: THREE.Group;
	private readonly loader: THREE.TextureLoader;
	private activeLines: ActiveLine[] = [];

	// Snapshot device flags at construction to avoid reactive subscriptions
	private readonly isMobile: boolean;
	private readonly isLowEnd: boolean;
	private readonly imageCount: number;
	private readonly radius: number;

	private readonly _posA = new THREE.Vector3();
	private readonly _posB = new THREE.Vector3();
	private readonly _perp = new THREE.Vector3();
	private readonly _tangent = new THREE.Vector3();
	private readonly _toCamera = new THREE.Vector3();
	private readonly _axis = new THREE.Vector3();
	private readonly _up = new THREE.Vector3();
	private readonly _arcDir = new THREE.Vector3();
	private readonly _mid = new THREE.Vector3();
	private readonly _cp = new THREE.Vector3();
	private _curveBuffer: number[] = [];

	constructor() {
		this.group = new THREE.Group();
		this.imageGroup = new THREE.Group();
		this.lineGroup = new THREE.Group();
		this.group.add(this.imageGroup);
		this.group.add(this.lineGroup);
		this.loader = new THREE.TextureLoader();
		this.isMobile = untrack(() => device.mobile);
		this.isLowEnd = untrack(() => device.lowEnd);
		this.imageCount = untrack(() => device.carouselImageCount);
		this.radius = this.isMobile ? 7 : carouselConfig.R;
	}

	async init(): Promise<void> {
		try {
			const count = this.imageCount;
			const res = await fetch(`/api/images?count=${count}`);
			const urls: string[] = await res.json();
			if (urls.length > 0) {
				// Create placeholder meshes immediately so the carousel starts animating,
				// then swap in the real texture as each image loads.
				urls.forEach((url, i) => this.createImagePlane(url, i, urls.length));
			}
		} catch (e) {
			console.warn('Failed to load splash images:', e);
		}
	}

	update(stageProgress: number, _deltaTime: number, camera: THREE.Camera): void {
		const easedProgress = smoothstep(stageProgress);
		const yOffset = easedProgress * 30;
		this.imageGroup.position.y = yOffset;
		this.lineGroup.position.y = yOffset;

		const speedMultiplier = 1 + easedProgress * 20;
		this.imageGroup.rotation.y += carouselConfig.ROTATION_SPEED * speedMultiplier;

		this.imageGroup.children.forEach((mesh) => {
			mesh.lookAt(camera.position);
			const t = mesh.userData.tilt;
			if (t) {
				(mesh as THREE.Mesh).rotateX(t.x);
				(mesh as THREE.Mesh).rotateY(t.y);
				(mesh as THREE.Mesh).rotateZ(t.z);
			}
		});

		this.updateLines(camera);
	}

	setVisibility(visible: boolean): void {
		this.group.visible = visible;
	}

	dispose(): void {
		for (const entry of this.activeLines) {
			this.disposeLineEntry(entry);
		}
		this.activeLines = [];

		this.imageGroup.children.forEach((child) => {
			const mesh = child as THREE.Mesh;
			mesh.geometry.dispose();
			const mat = mesh.material as THREE.MeshBasicMaterial;
			if (mat.map) mat.map.dispose();
			mat.dispose();
		});
		this.imageGroup.clear();
		this.lineGroup.clear();
	}

	private createImagePlane(url: string, index: number, total: number): void {
		const randomTilt = () =>
			((Math.random() * 2 - 1) * carouselConfig.MAX_TILT_DEG * Math.PI) / 180;

		const rand = () => (Math.random() * 2 - 1) * carouselConfig.SPREAD;
		const theta = (index / total) * Math.PI * 2;
		const thetaOffset = rand() * (Math.PI / 8);
		const thetaMain = theta + thetaOffset;
		const R = this.radius;
		const baseX = R * Math.cos(thetaMain) + rand();
		const baseY = rand();
		const baseZ = R * Math.sin(thetaMain) + rand();

		const applyRandomTilt = (mesh: THREE.Mesh) => {
			mesh.userData.tilt = {
				x: randomTilt(),
				y: randomTilt(),
				z: randomTilt()
			};
		};

		// Square placeholder — shown immediately while the texture loads
		const placeholderSize = carouselConfig.PLANE_HEIGHT;
		const placeholderGeo = new THREE.PlaneGeometry(placeholderSize, placeholderSize);
		const placeholderMat = new THREE.MeshBasicMaterial({
			color: 0x112244,
			transparent: true,
			opacity: 0.55,
			side: THREE.DoubleSide
		});
		const main = new THREE.Mesh(placeholderGeo, placeholderMat);
		main.position.set(baseX, baseY, baseZ);
		applyRandomTilt(main);
		this.imageGroup.add(main);

		const copies: THREE.Mesh[] = [];
		for (let i = 0; i < carouselConfig.COPY_COUNT; i++) {
			const copyGeo = new THREE.PlaneGeometry(placeholderSize, placeholderSize);
			const copyMat = new THREE.MeshBasicMaterial({
				color: 0x112244,
				transparent: true,
				opacity: 0.55,
				side: THREE.DoubleSide
			});
			const copy = new THREE.Mesh(copyGeo, copyMat);
			const offset = rand() * (Math.PI / 8);
			const thetaCopy = theta + offset;
			copy.position.set(R * Math.cos(thetaCopy) + rand(), rand(), R * Math.sin(thetaCopy) + rand());
			applyRandomTilt(copy);
			this.imageGroup.add(copy);
			copies.push(copy);
		}

		// Load the real texture and swap it in when ready
		this.loader.load(url, (texture) => {
			texture.colorSpace = THREE.SRGBColorSpace;
			const aspect = texture.image ? texture.image.width / texture.image.height : 1;
			const width = carouselConfig.PLANE_HEIGHT * aspect;
			const realGeo = new THREE.PlaneGeometry(width, carouselConfig.PLANE_HEIGHT);
			const realMat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });

			placeholderGeo.dispose();
			placeholderMat.dispose();
			main.geometry = realGeo;
			main.material = realMat;

			for (const copy of copies) {
				copy.geometry.dispose();
				(copy.material as THREE.MeshBasicMaterial).dispose();
				copy.geometry = new THREE.PlaneGeometry(width, carouselConfig.PLANE_HEIGHT);
				copy.material = realMat;
			}
		});
	}

	private createRibbonGeometry(segCount: number): THREE.BufferGeometry {
		const vertCount = (segCount + 1) * 2;
		const positions = new Float32Array(vertCount * 3);
		const indices: number[] = [];
		for (let i = 0; i < segCount; i++) {
			const a = i * 2,
				b = i * 2 + 1,
				c = (i + 1) * 2,
				d = (i + 1) * 2 + 1;
			indices.push(a, b, c, c, b, d);
		}
		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		geometry.setIndex(indices);
		return geometry;
	}

	private disposeLineEntry(entry: ActiveLine): void {
		for (const m of entry.meshes) {
			m.geometry.dispose();
			(m.material as THREE.Material).dispose();
			this.lineGroup.remove(m);
		}
	}

	private updateLines(camera: THREE.Camera): void {
		const meshes = this.imageGroup.children as THREE.Mesh[];
		const n = meshes.length;
		if (n < 2) return;

		const lineLoopCount = this.isMobile ? 15 : 50;
		for (let s = 0; s < lineLoopCount; s++) {
			const i = (Math.random() * n) | 0;
			let j = (Math.random() * (n - 1)) | 0;
			if (j >= i) j++;
			meshes[i].getWorldPosition(this._posA);
			meshes[j].getWorldPosition(this._posB);
			const dist = this._posA.distanceTo(this._posB);
			if (dist < carouselConfig.LINE_MAX_DIST && Math.random() < carouselConfig.LINE_CHANCE) {
				this._axis.subVectors(this._posB, this._posA).normalize();
				if (Math.abs(this._axis.y) < 0.9) this._up.set(0, 1, 0);
				else this._up.set(1, 0, 0);
				const arcDir = this._arcDir.crossVectors(this._axis, this._up).normalize().clone();

				const segs = this.isMobile ? 16 : carouselConfig.LINE_SEGMENTS;
				const layerCount = this.isLowEnd ? 1 : 2;
				const lineMeshes: THREE.Mesh[] = [];
				for (let layer = 0; layer < layerCount; layer++) {
					const isGlow = layer === 1;
					const geometry = this.createRibbonGeometry(segs);
					const material = new THREE.MeshBasicMaterial({
						color: carouselConfig.LINE_COLOR,
						transparent: true,
						opacity: 0,
						side: THREE.DoubleSide,
						blending: isGlow ? THREE.AdditiveBlending : THREE.NormalBlending,
						depthWrite: false
					});
					const ribbon = new THREE.Mesh(geometry, material);
					ribbon.userData.isGlow = isGlow;
					ribbon.frustumCulled = false;
					this.lineGroup.add(ribbon);
					lineMeshes.push(ribbon);
				}
				this.activeLines.push({
					meshes: lineMeshes,
					age: 0,
					maxAge: this.isMobile ? 50 : carouselConfig.LINE_LIFETIME,
					meshA: meshes[i],
					meshB: meshes[j],
					arcDir,
					phase: Math.random() * Math.PI * 2
				});
			}
		}

		const camPos = camera.position;

		for (let k = this.activeLines.length - 1; k >= 0; k--) {
			const entry = this.activeLines[k];
			entry.age++;
			if (entry.age >= entry.maxAge) {
				this.disposeLineEntry(entry);
				// Swap-and-pop removal
				this.activeLines[k] = this.activeLines[this.activeLines.length - 1];
				this.activeLines.pop();
				continue;
			}
			entry.meshA.getWorldPosition(this._posA);
			entry.meshB.getWorldPosition(this._posB);
			const dist = this._posA.distanceTo(this._posB);
			this._mid.addVectors(this._posA, this._posB).multiplyScalar(0.5);
			this._cp.copy(this._mid).addScaledVector(entry.arcDir, carouselConfig.LINE_ARC_BULGE * dist);
			const segs = this.isMobile ? 16 : carouselConfig.LINE_SEGMENTS;

			const curve = this._curveBuffer;
			curve.length = 0;
			for (let si = 0; si <= segs; si++) {
				const t = si / segs;
				const a = (1 - t) * (1 - t);
				const b = 2 * (1 - t) * t;
				const c = t * t;
				const bx = a * this._posA.x + b * this._cp.x + c * this._posB.x;
				const by = a * this._posA.y + b * this._cp.y + c * this._posB.y;
				const bz = a * this._posA.z + b * this._cp.z + c * this._posB.z;
				const envelope = Math.sin(Math.PI * t);
				const wave =
					Math.sin(
						t * carouselConfig.LINE_WAVE_FREQ * Math.PI * 2 +
							entry.phase +
							entry.age * carouselConfig.LINE_WAVE_SPEED
					) *
					carouselConfig.LINE_WAVE_AMP *
					envelope;
				curve.push(
					bx + entry.arcDir.x * wave,
					by + entry.arcDir.y * wave,
					bz + entry.arcDir.z * wave
				);
			}

			const lifeT = entry.age / entry.maxAge;
			let baseOpacity: number;
			if (lifeT < 0.2) baseOpacity = lifeT / 0.2;
			else if (lifeT < 0.6) baseOpacity = 1;
			else baseOpacity = 1 - (lifeT - 0.6) / 0.4;

			for (const m of entry.meshes) {
				const isGlow = m.userData.isGlow;
				const halfW =
					(isGlow ? carouselConfig.LINE_THICKNESS * 3 : carouselConfig.LINE_THICKNESS) * 0.5;
				const pos = (m.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;

				for (let si = 0; si <= segs; si++) {
					const ci = si * 3;
					const cx = curve[ci],
						cy = curve[ci + 1],
						cz = curve[ci + 2];

					if (si < segs) {
						this._tangent.set(curve[ci + 3] - cx, curve[ci + 4] - cy, curve[ci + 5] - cz);
					} else {
						this._tangent.set(cx - curve[ci - 3], cy - curve[ci - 2], cz - curve[ci - 1]);
					}
					this._tangent.normalize();

					this._toCamera.set(camPos.x - cx, camPos.y - cy, camPos.z - cz).normalize();
					this._perp.crossVectors(this._tangent, this._toCamera).normalize().multiplyScalar(halfW);

					const vi = si * 6;
					pos[vi] = cx + this._perp.x;
					pos[vi + 1] = cy + this._perp.y;
					pos[vi + 2] = cz + this._perp.z;
					pos[vi + 3] = cx - this._perp.x;
					pos[vi + 4] = cy - this._perp.y;
					pos[vi + 5] = cz - this._perp.z;
				}

				m.geometry.attributes.position.needsUpdate = true;
				(m.material as THREE.MeshBasicMaterial).opacity = isGlow
					? baseOpacity * carouselConfig.LINE_GLOW * 0.5
					: baseOpacity;
			}
		}
	}
}
