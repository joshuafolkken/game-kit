import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	loading,
	create_loading,
	MIN_DISPLAY_MS,
	OBSERVER_GLOBAL_KEY,
	type DefaultLoadingStep
} from '$lib/game/loading.svelte';

const STEP_MESSAGES: Record<DefaultLoadingStep, string> = {
	downloading: 'Downloading',
	initializing: 'Initializing',
	loading_assets: 'Loading assets',
	ready: 'Ready'
};

const HALF_MIN_DISPLAY_MS = MIN_DISPLAY_MS / 2;
const ONE_MS_BEFORE_HIDE = MIN_DISPLAY_MS - 1;
const FIVE_SECONDS_MS = 5000;
const INITIAL_PROGRESS = '0%';
const INITIAL_PROGRESS_VALUE = 0;
const READY_PROGRESS = '100%';
const READY_PROGRESS_VALUE = 100;

describe('OBSERVER_GLOBAL_KEY', () => {
	it("equals '__loading_observer' to match the key used in app.html's inline script", () => {
		expect(OBSERVER_GLOBAL_KEY).toBe('__loading_observer');
	});
});

describe('loading', () => {
	let observer_disconnect: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.useFakeTimers();
		loading.configure(STEP_MESSAGES);
		loading.reset();
		observer_disconnect = vi.fn();
		(globalThis as Record<string, unknown>)[OBSERVER_GLOBAL_KEY] = {
			disconnect: observer_disconnect
		};
	});

	afterEach(() => {
		vi.useRealTimers();
		loading.reset();
		(globalThis as Record<string, unknown>)[OBSERVER_GLOBAL_KEY] = undefined;
	});

	it('starts with the downloading step, label, and initial progress', () => {
		expect(loading.is_visible).toBe(true);
		expect(loading.current_step).toBe('downloading');
		expect(loading.status_text).toBe(STEP_MESSAGES.downloading);
		expect(loading.progress).toBe(INITIAL_PROGRESS);
		expect(loading.progress_value).toBe(INITIAL_PROGRESS_VALUE);
	});

	it('updates step and label when set_step("initializing") is called', () => {
		loading.set_step('initializing');
		expect(loading.current_step).toBe('initializing');
		expect(loading.status_text).toBe(STEP_MESSAGES.initializing);
	});

	it('updates step and label when set_step("loading_assets") is called', () => {
		loading.set_step('loading_assets');
		expect(loading.current_step).toBe('loading_assets');
		expect(loading.status_text).toBe(STEP_MESSAGES.loading_assets);
	});

	it('does not modify progress when set_step is called for non-ready steps', () => {
		loading.set_step('initializing');
		expect(loading.progress).toBe(INITIAL_PROGRESS);
		expect(loading.progress_value).toBe(INITIAL_PROGRESS_VALUE);
	});

	it('disconnects the active observer on reset', () => {
		loading.reset();
		expect(observer_disconnect).toHaveBeenCalledTimes(1);
	});

	it('snaps progress to ready value and disconnects the observer on mark_ready', () => {
		loading.set_step('ready');
		loading.mark_ready();
		expect(loading.current_step).toBe('ready');
		expect(loading.status_text).toBe(STEP_MESSAGES.ready);
		expect(loading.progress).toBe(READY_PROGRESS);
		expect(loading.progress_value).toBe(READY_PROGRESS_VALUE);
		expect(observer_disconnect).toHaveBeenCalledTimes(1);
	});

	it('keeps overlay visible synchronously after mark_ready', () => {
		loading.mark_ready();
		expect(loading.is_visible).toBe(true);
	});

	it('keeps overlay visible until the minimum display elapses', () => {
		loading.mark_ready();
		vi.advanceTimersByTime(ONE_MS_BEFORE_HIDE);
		expect(loading.is_visible).toBe(true);
	});

	it('hides overlay once the minimum display elapses', () => {
		loading.mark_ready();
		vi.advanceTimersByTime(MIN_DISPLAY_MS);
		expect(loading.is_visible).toBe(false);
	});

	it('does not double-schedule the hide timer or double-disconnect on repeat mark_ready calls', () => {
		loading.mark_ready();
		vi.advanceTimersByTime(HALF_MIN_DISPLAY_MS);
		loading.mark_ready();
		vi.advanceTimersByTime(HALF_MIN_DISPLAY_MS);
		expect(loading.is_visible).toBe(false);
		expect(observer_disconnect).toHaveBeenCalledTimes(1);
	});

	it('reset restores the initial step, label, progress, visibility, and clears any pending timer', () => {
		loading.set_step('ready');
		loading.mark_ready();
		vi.advanceTimersByTime(MIN_DISPLAY_MS);
		expect(loading.progress).toBe(READY_PROGRESS);

		loading.reset();
		expect(loading.is_visible).toBe(true);
		expect(loading.current_step).toBe('downloading');
		expect(loading.status_text).toBe(STEP_MESSAGES.downloading);
		expect(loading.progress).toBe(INITIAL_PROGRESS);
		expect(loading.progress_value).toBe(INITIAL_PROGRESS_VALUE);

		loading.set_step('ready');
		loading.mark_ready();
		loading.reset();
		vi.advanceTimersByTime(FIVE_SECONDS_MS);
		expect(loading.is_visible).toBe(true);
	});
});

describe('create_loading isolation', () => {
	it('two instances do not share is_visible state', () => {
		vi.useFakeTimers();
		const a = create_loading<DefaultLoadingStep>('downloading');
		const b = create_loading<DefaultLoadingStep>('downloading');
		a.mark_ready();
		vi.advanceTimersByTime(MIN_DISPLAY_MS);
		expect(a.is_visible).toBe(false);
		expect(b.is_visible).toBe(true);
		vi.useRealTimers();
	});

	it('two instances do not share current_step state', () => {
		const a = create_loading<DefaultLoadingStep>('downloading');
		const b = create_loading<DefaultLoadingStep>('downloading');
		a.configure({ downloading: 'd', initializing: 'i', loading_assets: 'l', ready: 'r' });
		b.configure({ downloading: 'd', initializing: 'i', loading_assets: 'l', ready: 'r' });
		a.set_step('initializing');
		expect(a.current_step).toBe('initializing');
		expect(b.current_step).toBe('downloading');
	});
});
