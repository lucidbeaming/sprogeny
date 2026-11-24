import { extractPlaylistId } from './playlistId';
import { samplePlaylistUrls } from './samplePlaylistUrls';

export interface SamplePlaylist {
	id: string;
	name: string;
	tracksCount: number;
	imageUrl?: string;
}

const playlistMeta: Record<string, { name: string; imageUrl: string }> = {
	'7ssAcEJLulZzDzhm4eEQ7w': {
		name: 'amazonian cumbia pachanga sunday afternoon',
		imageUrl:
			'https://mosaic.scdn.co/300/ab67616d00001e020c67a6c51735aa139dc32bdbab67616d00001e029f0d845c6a8ec63ff5e25d29ab67616d00001e02a033fd2693cadeac02fe928eab67616d00001e02bdf20ea8d41d203007adbd86'
	},
	'17mWcfQQer9zBCYhSSIxPw': {
		name: 'morna cape verdean folk monday early morning (2)',
		imageUrl:
			'https://mosaic.scdn.co/300/ab67616d00001e02821c92f86dd09e8788c9d6d1ab67616d00001e02a37e739f85b6f0f701eaeca3ab67616d00001e02ae62c06b3d3944604292dc82ab67616d00001e02ec84ff48d9090ce41fcdc95b'
	},
	'5zerVhQHWMcFKpBzdmU9NK': {
		name: 'Best Tracks of 2025 - New Bands for Old Heads',
		imageUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67706c0000d72c81e1521eb292b0c740f91229'
	},
	'4fvKQl2ZCEUY8cnSCp1NCx': {
		name: 'Fiouu🌼🧚🏻‍♂️',
		imageUrl:
			'https://mosaic.scdn.co/300/ab67616d00001e021e81bff9807a9e629fce5adeab67616d00001e0260863211a34118f09d8f6434ab67616d00001e02beaa47fb1ab50122897c4e8dab67616d00001e02c7972702cff224328b39f8a6'
	},
	'28pi8Ls7Suydu2Cmu3YVW7': {
		name: 'Rangefinder West Texas Forever',
		imageUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67706c0000da8418a87cefd8449b8565632360'
	},
	'3saestcwEvvPdHbbuCKU8V': {
		name: 'Matin chill',
		imageUrl:
			'https://mosaic.scdn.co/300/ab67616d00001e0202d8f7f0d9244585dd90c7d1ab67616d00001e02169b9bf114b853c8b3c8fb78ab67616d00001e02f9d5f297a65f0b2a90ac7fd6ab67616d00001e02fe5213edd4f8550a8030efcf'
	},
	'3N8Bbhkl6zoHJpXRnkqvk6': {
		name: 'Citadel Art Studio',
		imageUrl:
			'https://mosaic.scdn.co/300/ab67616d00001e0214ab989bd67d77d4e7c45fd7ab67616d00001e021ee19a911bfa64e0d48a2594ab67616d00001e02bac0dd2271d49e193392b9e0ab67616d00001e02f518fef5c486a5f38eb64ee8'
	}
};

export const samplePlaylists: SamplePlaylist[] = samplePlaylistUrls.map((url) => {
	const id = extractPlaylistId(url)!;
	const meta = playlistMeta[id];
	return {
		id,
		name: meta?.name ?? `Sample Playlist ${id.slice(0, 8)}`,
		tracksCount: 30 + Math.floor(Math.random() * 120),
		imageUrl: meta?.imageUrl
	};
});

/** Mock tracks used when simulating playlist generation in dev mode. */
export const mockTracks: { id: string; name: string; artist: string }[] = [
	{ id: 'mock01', name: 'Midnight Train', artist: 'The Wanderers' },
	{ id: 'mock02', name: 'Electric Sunset', artist: 'Nova Dream' },
	{ id: 'mock03', name: 'Broken Compass', artist: 'Atlas Rose' },
	{ id: 'mock04', name: 'Velvet Thunder', artist: 'The Satellites' },
	{ id: 'mock05', name: 'Painted Sky', artist: 'Luna Harbor' },
	{ id: 'mock06', name: 'Willow Creek', artist: 'Iron Petals' },
	{ id: 'mock07', name: 'Firefly Lantern', artist: 'Echo Valley' },
	{ id: 'mock08', name: 'Copper Moon', artist: 'Sage & Stone' },
	{ id: 'mock09', name: 'Paper Kites', artist: 'The Driftwood' },
	{ id: 'mock10', name: 'Silver Lining', artist: 'Morning Tide' },
	{ id: 'mock11', name: 'Canyon Echoes', artist: 'Red Mesa' },
	{ id: 'mock12', name: 'Ghost of Summer', artist: 'The Parlours' },
	{ id: 'mock13', name: 'Honey & Smoke', artist: 'Birch Lane' },
	{ id: 'mock14', name: 'Northern Lights', artist: 'Glacial Drift' },
	{ id: 'mock15', name: 'Rust and Gold', artist: 'The Foundry' },
	{ id: 'mock16', name: 'Ocean Floor', artist: 'Deep Current' },
	{ id: 'mock17', name: 'Tangerine Haze', artist: 'Solar Flare' },
	{ id: 'mock18', name: 'Whiskey Sunrise', artist: 'Dusty Roads' },
	{ id: 'mock19', name: 'Satellite Heart', artist: 'Orbit' },
	{ id: 'mock20', name: 'Blackbird Hour', artist: 'Hollow Pine' },
	{ id: 'mock21', name: 'Cinnamon Breeze', artist: 'The Lanterns' },
	{ id: 'mock22', name: 'Neon Cathedral', artist: 'Voltage Saints' },
	{ id: 'mock23', name: 'Driftwood Blues', artist: 'Harbor Light' },
	{ id: 'mock24', name: 'Amber Waves', artist: 'Prairie Ghost' },
	{ id: 'mock25', name: 'Thunderstone', artist: 'Iron Veil' },
	{ id: 'mock26', name: 'Violet Storm', artist: 'The Cascades' },
	{ id: 'mock27', name: 'Lost Highway', artist: 'Desert Hymn' },
	{ id: 'mock28', name: 'Saltwater Gospel', artist: 'Tidal Grace' },
	{ id: 'mock29', name: 'Foxglove', artist: 'Meadow Lark' },
	{ id: 'mock30', name: 'Iron Garden', artist: 'Rust & Bloom' }
];
