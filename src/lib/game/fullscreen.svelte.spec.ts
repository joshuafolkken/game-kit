import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fullscreen, create_fullscreen } from '$lib/game/fullscreen.svelte';

describe('fullscreen', () => {
	let cleanup: () => void;
	let el: HTMLElement;

	beforeEach(() => {
		cleanup = fullscreen.setup_listeners();
		el = document.createElement('div');
		document.body.appendChild(el);
	});

	afterEach(() => {
		cleanup();
		el.remove();
		vi.restoreAllMocks();
	});

	it('starts not in fullscreen', () => {
		expect(fullscreen.is_active).toBe(false);
		expect(fullscreen.is_pseudo_fullscreen).toBe(false);
		expect(fullscreen.is_native_fullscreen).toBe(false);
	});

	it('uses native requestFullscreen when available', async () => {
		const spy = vi.spyOn(el, 'requestFullscreen').mockResolvedValue();
		await fullscreen.request(el);
		expect(spy).toHaveBeenCalledTimes(1);
		expect(fullscreen.is_pseudo_fullscreen).toBe(false);
	});

	it('falls back to pseudo fullscreen when native API is unavailable', async () => {
		Object.defineProperty(el, 'requestFullscreen', { value: undefined, configurable: true });
		Object.defineProperty(el, 'webkitRequestFullscreen', { value: undefined, configurable: true });
		await fullscreen.request(el);
		expect(fullscreen.is_pseudo_fullscreen).toBe(true);
		expect(fullscreen.is_active).toBe(true);
	});

	it('falls back to pseudo fullscreen when native API rejects', async () => {
		vi.spyOn(el, 'requestFullscreen').mockRejectedValue(new Error('no user gesture'));
		await fullscreen.request(el);
		expect(fullscreen.is_pseudo_fullscreen).toBe(true);
	});

	it('skips re-requesting when already in pseudo fullscreen', async () => {
		Object.defineProperty(el, 'requestFullscreen', { value: undefined, configurable: true });
		Object.defineProperty(el, 'webkitRequestFullscreen', { value: undefined, configurable: true });
		await fullscreen.request(el);
		expect(fullscreen.is_pseudo_fullscreen).toBe(true);

		const spy = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(el, 'requestFullscreen', { value: spy, configurable: true });
		await fullscreen.request(el);
		expect(spy).not.toHaveBeenCalled();
	});

	it('exit clears pseudo fullscreen', async () => {
		Object.defineProperty(el, 'requestFullscreen', { value: undefined, configurable: true });
		Object.defineProperty(el, 'webkitRequestFullscreen', { value: undefined, configurable: true });
		await fullscreen.request(el);
		expect(fullscreen.is_pseudo_fullscreen).toBe(true);
		await fullscreen.exit();
		expect(fullscreen.is_pseudo_fullscreen).toBe(false);
		expect(fullscreen.is_active).toBe(false);
	});

	it('initializes is_native_fullscreen from current document state on setup', () => {
		cleanup();
		const fake_element = document.createElement('section');
		const original_descriptor = Object.getOwnPropertyDescriptor(
			Document.prototype,
			'fullscreenElement'
		);
		Object.defineProperty(document, 'fullscreenElement', {
			get: () => fake_element,
			configurable: true
		});
		try {
			cleanup = fullscreen.setup_listeners();
			expect(fullscreen.is_native_fullscreen).toBe(true);
		} finally {
			if (original_descriptor) {
				Object.defineProperty(document, 'fullscreenElement', original_descriptor);
			} else {
				Reflect.deleteProperty(document, 'fullscreenElement');
			}
		}
	});

	it('falls back to webkitRequestFullscreen when standard API is missing', async () => {
		Object.defineProperty(el, 'requestFullscreen', { value: undefined, configurable: true });
		const webkit_spy = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(el, 'webkitRequestFullscreen', {
			value: webkit_spy,
			configurable: true
		});
		await fullscreen.request(el);
		expect(webkit_spy).toHaveBeenCalledTimes(1);
		expect(fullscreen.is_pseudo_fullscreen).toBe(false);
	});
});

describe('create_fullscreen isolation', () => {
	it('two instances do not share is_pseudo_fullscreen state', async () => {
		const a = create_fullscreen();
		const b = create_fullscreen();
		const el = document.createElement('div');
		Object.defineProperty(el, 'requestFullscreen', { value: undefined, configurable: true });
		Object.defineProperty(el, 'webkitRequestFullscreen', { value: undefined, configurable: true });
		await a.request(el);
		expect(a.is_pseudo_fullscreen).toBe(true);
		expect(b.is_pseudo_fullscreen).toBe(false);
	});
});
