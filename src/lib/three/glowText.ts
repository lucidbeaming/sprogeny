import * as THREE from 'three';

interface GlowTextOptions {
	width: number;
	height: number;
	fontSize: number;
	color: string;
	glowBlur: number;
}

export function createGlowTextTexture(
	text: string,
	{ width, height, fontSize, color, glowBlur }: GlowTextOptions
): THREE.CanvasTexture {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d')!;
	canvas.width = width;
	canvas.height = height;

	ctx.clearRect(0, 0, width, height);

	ctx.shadowColor = color;
	ctx.shadowBlur = glowBlur;
	ctx.font = `bold ${fontSize}px monospace`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillStyle = color;
	ctx.fillText(text, width / 2, height / 2);

	ctx.shadowBlur = 0;
	ctx.fillStyle = color;
	ctx.fillText(text, width / 2, height / 2);

	const texture = new THREE.CanvasTexture(canvas);
	texture.needsUpdate = true;
	return texture;
}
