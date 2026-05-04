import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fps_switch_input } from './fps-switch-input.js';
import { fps } from './fps.svelte.js';
import { session } from './session.svelte.js';
import { switch_audio } from '$lib/game/switch-audio';

describe('fps_switch_input', () => {
	beforeEach(() => {
		session.reset_session();
		if (fps.is_fps_enabled) fps.toggle();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('does not toggle fps when session is not started', () => {
		fps_switch_input.on_click();
		expect(fps.is_fps_enabled).toBe(false);
	});

	it('toggles fps once session has started', () => {
		session.start_session();
		fps_switch_input.on_click();
		expect(fps.is_fps_enabled).toBe(true);
	});

	it('toggles fps twice when clicked twice after session started', () => {
		session.start_session();
		fps_switch_input.on_click();
		fps_switch_input.on_click();
		expect(fps.is_fps_enabled).toBe(false);
	});

	it('plays switch click sound when session is started', () => {
		session.start_session();
		const spy = vi.spyOn(switch_audio, 'play_switch_click').mockImplementation(() => {});
		fps_switch_input.on_click();
		expect(spy).toHaveBeenCalledTimes(1);
	});

	it('does not play switch click sound when session is not started', () => {
		const spy = vi.spyOn(switch_audio, 'play_switch_click').mockImplementation(() => {});
		fps_switch_input.on_click();
		expect(spy).not.toHaveBeenCalled();
	});
});
