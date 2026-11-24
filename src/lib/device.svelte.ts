/**
 * Reactive device detection and capability sensing.
 * Uses Svelte 5 runes — import and read properties directly.
 *
 * Usage:
 *   import { device } from '$lib/device.svelte';
 *   if (device.mobile) { ... }
 *   if (device.reducedMotion) { ... }
 */

// --- Breakpoints (match Tailwind defaults) ---
const BP = { sm: 640, md: 768, lg: 1024, xl: 1280 } as const;

function mqMatch(query: string): boolean {
	if (typeof window === 'undefined') return false;
	return window.matchMedia(query).matches;
}

function mqListen(query: string, cb: (matches: boolean) => void): () => void {
	if (typeof window === 'undefined') return () => {};
	const mql = window.matchMedia(query);
	const handler = (e: MediaQueryListEvent) => cb(e.matches);
	mql.addEventListener('change', handler);
	return () => mql.removeEventListener('change', handler);
}

// --- Reactive state ---
let _mobile = $state(false);
let _tablet = $state(false);
let _desktop = $state(true);
let _touch = $state(false);
let _reducedMotion = $state(false);
let _highContrast = $state(false);
let _canHover = $state(true);
let _dpr = $state(1);
let _connectionType = $state<string>('unknown');
let _saveData = $state(false);
let _lowEnd = $state(false);

let initialized = false;
const cleanups: (() => void)[] = [];

function init() {
	if (initialized || typeof window === 'undefined') return;
	initialized = true;

	// Viewport breakpoints
	_mobile = mqMatch(`(max-width: ${BP.md - 1}px)`);
	_tablet = mqMatch(`(min-width: ${BP.md}px) and (max-width: ${BP.lg - 1}px)`);
	_desktop = mqMatch(`(min-width: ${BP.lg}px)`);

	cleanups.push(mqListen(`(max-width: ${BP.md - 1}px)`, (m) => (_mobile = m)));
	cleanups.push(
		mqListen(`(min-width: ${BP.md}px) and (max-width: ${BP.lg - 1}px)`, (m) => (_tablet = m))
	);
	cleanups.push(mqListen(`(min-width: ${BP.lg}px)`, (m) => (_desktop = m)));

	// Touch capability
	_touch = navigator.maxTouchPoints > 0 || mqMatch('(pointer: coarse)');
	_canHover = mqMatch('(hover: hover)');
	cleanups.push(mqListen('(hover: hover)', (m) => (_canHover = m)));

	// Accessibility preferences
	_reducedMotion = mqMatch('(prefers-reduced-motion: reduce)');
	cleanups.push(mqListen('(prefers-reduced-motion: reduce)', (m) => (_reducedMotion = m)));

	_highContrast = mqMatch('(prefers-contrast: more)');
	cleanups.push(mqListen('(prefers-contrast: more)', (m) => (_highContrast = m)));

	// Display
	_dpr = window.devicePixelRatio ?? 1;

	// Network (Navigator Network Information API)
	const nav = navigator as Navigator & {
		connection?: { effectiveType?: string; saveData?: boolean };
	};
	if (nav.connection) {
		_connectionType = nav.connection.effectiveType ?? 'unknown';
		_saveData = nav.connection.saveData ?? false;
	}

	// Low-end heuristic: mobile + slow connection or low memory or save-data
	const navMem = navigator as Navigator & { deviceMemory?: number };
	_lowEnd =
		_mobile &&
		(_saveData ||
			_connectionType === 'slow-2g' ||
			_connectionType === '2g' ||
			(navMem.deviceMemory != null && navMem.deviceMemory <= 4));
}

export const device = {
	/** Initialize listeners. Call once from a root component's $effect. */
	init,

	/** Cleanup all listeners. Call on destroy. */
	destroy() {
		for (const fn of cleanups) fn();
		cleanups.length = 0;
		initialized = false;
	},

	// --- Breakpoints ---
	get mobile() {
		return _mobile;
	},
	get tablet() {
		return _tablet;
	},
	get desktop() {
		return _desktop;
	},

	// --- Input ---
	get touch() {
		return _touch;
	},
	get canHover() {
		return _canHover;
	},

	// --- Accessibility ---
	get reducedMotion() {
		return _reducedMotion;
	},
	get highContrast() {
		return _highContrast;
	},

	// --- Display ---
	get dpr() {
		return _dpr;
	},

	// --- Network ---
	get connectionType() {
		return _connectionType;
	},
	get saveData() {
		return _saveData;
	},

	// --- Composite ---
	/** True on mobile with slow connection, low memory, or save-data. */
	get lowEnd() {
		return _lowEnd;
	},

	/** Suggested pixel ratio for Three.js (caps high-DPR on mobile). */
	get renderDpr() {
		if (_lowEnd) return 1;
		if (_mobile) return Math.min(_dpr, 1.5);
		if (_tablet) return Math.min(_dpr, 2);
		return _dpr;
	},

	/** Suggested image count for carousel stage. */
	get carouselImageCount() {
		if (_lowEnd || _saveData) return 25;
		if (_mobile) return 50;
		if (_tablet) return 75;
		return 100;
	},

	/** Suggested texture scale multiplier for glow labels. */
	get textureScale() {
		if (_lowEnd) return 1;
		if (_mobile) return 2;
		if (_tablet) return 3;
		return 5;
	},

	/** Whether to enable expensive post-processing (BlendPass). */
	get enablePostProcessing() {
		return !_lowEnd && !_reducedMotion;
	},

	/** Whether to enable antialiasing. */
	get enableAntialias() {
		return _desktop;
	},

	/** Breakpoint constants for reference. */
	breakpoints: BP
} as const;
