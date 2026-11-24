import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: { port: 9002, host: '127.0.0.1' },
	preview: { port: 9002, host: '127.0.0.1' }
});
