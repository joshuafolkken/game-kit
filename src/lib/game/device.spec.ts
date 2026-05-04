import { describe, it, expect, afterEach, vi } from 'vitest';
import { create_device } from '$lib/game/device.svelte';

const TOUCH_PRIMARY_QUERY = '(hover: none) and (pointer: coarse)';

type ChangeListener = (e: { matches: boolean }) => void;

function make_mock_mql(initial: boolean): MediaQueryList & { _fire: (v: boolean) => void } {
	const listeners: ChangeListener[] = [];
	return {
		matches: initial,
		addEventListener(_: string, fn: EventListenerOrEventListenerObject): void {
			listeners.push(fn as unknown as ChangeListener);
		},
		removeEventListener(): void {},
		_fire(v: boolean): void {
			for (const fn of listeners) fn({ matches: v });
		}
	} as unknown as MediaQueryList & { _fire: (v: boolean) => void };
}

describe('device', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('is_touch_primary is true when media query matches', () => {
		vi.stubGlobal('matchMedia', () => make_mock_mql(true));
		const d = create_device();
		expect(d.is_touch_primary).toBe(true);
	});

	it('is_touch_primary is false when media query does not match', () => {
		vi.stubGlobal('matchMedia', () => make_mock_mql(false));
		const d = create_device();
		expect(d.is_touch_primary).toBe(false);
	});

	it('uses the touch primary media query', () => {
		let received = '';
		vi.stubGlobal('matchMedia', (q: string) => {
			received = q;
			return make_mock_mql(false);
		});
		create_device();
		expect(received).toBe(TOUCH_PRIMARY_QUERY);
	});

	it('updates is_touch_primary when media query changes to true', () => {
		const mql = make_mock_mql(false);
		vi.stubGlobal('matchMedia', () => mql);
		const d = create_device();
		expect(d.is_touch_primary).toBe(false);
		mql._fire(true);
		expect(d.is_touch_primary).toBe(true);
	});

	it('updates is_touch_primary when media query changes to false', () => {
		const mql = make_mock_mql(true);
		vi.stubGlobal('matchMedia', () => mql);
		const d = create_device();
		expect(d.is_touch_primary).toBe(true);
		mql._fire(false);
		expect(d.is_touch_primary).toBe(false);
	});

	it('defaults to false when matchMedia is unavailable', () => {
		vi.stubGlobal('matchMedia', undefined);
		const d = create_device();
		expect(d.is_touch_primary).toBe(false);
	});
});
