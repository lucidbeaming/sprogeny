import * as THREE from 'three';

export class BlendPass {
	readonly scene: THREE.Scene;
	readonly camera: THREE.OrthographicCamera;
	readonly material: THREE.ShaderMaterial;
	readonly mesh: THREE.Mesh;
	readonly renderTargetA: THREE.WebGLRenderTarget;
	readonly renderTargetB: THREE.WebGLRenderTarget;

	constructor(width: number, height: number) {
		this.renderTargetA = new THREE.WebGLRenderTarget(width, height);
		this.renderTargetB = new THREE.WebGLRenderTarget(width, height);

		this.material = new THREE.ShaderMaterial({
			uniforms: {
				tA: { value: null },
				tB: { value: null },
				uBlend: { value: 0 }
			},
			vertexShader: /* glsl */ `
				varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = vec4(position, 1.0);
				}
			`,
			fragmentShader: /* glsl */ `
				uniform sampler2D tA;
				uniform sampler2D tB;
				uniform float uBlend;
				varying vec2 vUv;

				// Mix in linear light so mid-blend does not look muddy/dark vs either source alone
				void main() {
					vec4 colorA = texture2D(tA, vUv);
					vec4 colorB = texture2D(tB, vUv);
					vec3 a = pow(max(colorA.rgb, vec3(1e-5)), vec3(2.2));
					vec3 b = pow(max(colorB.rgb, vec3(1e-5)), vec3(2.2));
					vec3 mixed = mix(a, b, uBlend);
					gl_FragColor = vec4(pow(mixed, vec3(1.0 / 2.2)), mix(colorA.a, colorB.a, uBlend));
				}
			`,
			depthTest: false,
			depthWrite: false
		});

		this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
		this.scene = new THREE.Scene();
		this.scene.add(this.mesh);
		this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	}

	setSize(width: number, height: number) {
		this.renderTargetA.setSize(width, height);
		this.renderTargetB.setSize(width, height);
	}

	render(
		renderer: THREE.WebGLRenderer,
		mainScene: THREE.Scene,
		mainCamera: THREE.Camera,
		stageA: THREE.Group,
		stageB: THREE.Group,
		blendFactor: number
	) {
		// Double smoothstep: gentler onset/end so the incoming stage does not darken the image too soon
		const s = blendFactor * blendFactor * (3 - 2 * blendFactor);
		const t = s * s * (3 - 2 * s);

		stageA.visible = true;
		stageB.visible = false;
		renderer.setRenderTarget(this.renderTargetA);
		renderer.clear();
		renderer.render(mainScene, mainCamera);

		stageA.visible = false;
		stageB.visible = true;
		renderer.setRenderTarget(this.renderTargetB);
		renderer.clear();
		renderer.render(mainScene, mainCamera);

		this.material.uniforms.tA.value = this.renderTargetA.texture;
		this.material.uniforms.tB.value = this.renderTargetB.texture;
		this.material.uniforms.uBlend.value = t;
		renderer.setRenderTarget(null);
		renderer.clear();
		renderer.render(this.scene, this.camera);
	}

	dispose() {
		this.renderTargetA.dispose();
		this.renderTargetB.dispose();
		this.material.dispose();
		this.mesh.geometry.dispose();
	}
}
