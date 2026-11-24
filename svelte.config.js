import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		csp: {
			mode: 'nonce',
			directives: {
				'default-src': ['self'],
				'script-src': ['self', 'https://lucidbeaming.net'],
				'style-src': ['self', 'unsafe-inline', 'https://fonts.googleapis.com'],
				'font-src': ['self', 'https://fonts.gstatic.com'],
				'img-src': [
					'self',
					'https://i.scdn.co',
					'https://mosaic.scdn.co',
					'https://image-cdn-ak.spotifycdn.com',
					'https://image-cdn-fa.spotifycdn.com',
					'data:'
				],
				'connect-src': ['self', 'https://api.spotify.com', 'https://lucidbeaming.net'],
				'frame-src': ['https://www.youtube.com'],
				'object-src': ['none'],
				'base-uri': ['self']
			}
		}
	}
};

export default config;
