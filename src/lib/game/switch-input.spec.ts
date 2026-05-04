import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { create_switch_input } from './switch-input';
import { session } from './session.svelte';
import { switch_audio } from '$lib/game/switch-audio';

describe('create_switch_input', () => {
	let action: ReturnType<typeof vi.fn<() => void>>;

	beforeEach(() => {
		session.reset_session();
		action = vi.fn<() => void>();
		vi.spyOn(switch_audio, 'play_switch_click').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('does not call action when session is not started', () => {
		const sw = create_switch_input({ action });
		sw.on_click();
		expect(action).not.toHaveBeenCalled();
	});

	it('calls action once session has started', () => {
		const sw = create_switch_input({ action });
		session.start_session();
		sw.on_click();
		expect(action).toHaveBeenCalledTimes(1);
	});

	it('calls action on each click after session started', () => {
		const sw = create_switch_input({ action });
		session.start_session();
		sw.on_click();
		sw.on_click();
		expect(action).toHaveBeenCalledTimes(2);
	});

	it('plays switch click sound when session is started', () => {
		const sw = create_switch_input({ action });
		session.start_session();
		sw.on_click();
		expect(switch_audio.play_switch_click).toHaveBeenCalledTimes(1);
	});

	it('does not play sound when session is not started', () => {
		const sw = create_switch_input({ action });
		sw.on_click();
		expect(switch_audio.play_switch_click).not.toHaveBeenCalled();
	});

	it('does not call action when guard returns false', () => {
		const sw = create_switch_input({ action, guard: () => false });
		session.start_session();
		sw.on_click();
		expect(action).not.toHaveBeenCalled();
	});

	it('does not play sound when guard returns false', () => {
		const sw = create_switch_input({ action, guard: () => false });
		session.start_session();
		sw.on_click();
		expect(switch_audio.play_switch_click).not.toHaveBeenCalled();
	});

	it('calls action when guard returns true', () => {
		const sw = create_switch_input({ action, guard: () => true });
		session.start_session();
		sw.on_click();
		expect(action).toHaveBeenCalledTimes(1);
	});

	it('calls action when no guard is provided', () => {
		const sw = create_switch_input({ action });
		session.start_session();
		sw.on_click();
		expect(action).toHaveBeenCalledTimes(1);
	});
});
