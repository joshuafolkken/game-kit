import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const MOCK_URL = 'mock-click.opus';

describe('switch_audio.play_switch_click', () => {
	let play_mock: ReturnType<typeof vi.fn>;
	let audio_ctor: ReturnType<typeof vi.fn>;
	let shared_instance: { currentTime: number; play: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		vi.resetModules();
		play_mock = vi.fn().mockResolvedValue(undefined);
		shared_instance = { currentTime: 0, play: play_mock };
		audio_ctor = vi.fn().mockImplementation(function () {
			return shared_instance;
		});
		vi.stubGlobal('Audio', audio_ctor);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('is a no-op before init is called', async () => {
		const { switch_audio } = await import('./switch-audio.js');
		switch_audio.play_switch_click();
		expect(play_mock).not.toHaveBeenCalled();
	});

	it('does not throw when Audio is unavailable', async () => {
		vi.stubGlobal('Audio', undefined);
		const { switch_audio } = await import('./switch-audio.js');
		switch_audio.init(MOCK_URL);
		expect(() => switch_audio.play_switch_click()).not.toThrow();
	});

	it('calls play on the audio element', async () => {
		const { switch_audio } = await import('./switch-audio.js');
		switch_audio.init(MOCK_URL);
		switch_audio.play_switch_click();
		expect(play_mock).toHaveBeenCalledTimes(1);
	});

	it('resets currentTime to 0 before playing', async () => {
		const { switch_audio } = await import('./switch-audio.js');
		switch_audio.init(MOCK_URL);
		switch_audio.play_switch_click();
		shared_instance.currentTime = 99;
		switch_audio.play_switch_click();
		expect(shared_instance.currentTime).toBe(0);
	});

	it('reuses the same Audio instance across calls', async () => {
		const { switch_audio } = await import('./switch-audio.js');
		switch_audio.init(MOCK_URL);
		switch_audio.play_switch_click();
		switch_audio.play_switch_click();
		expect(audio_ctor).toHaveBeenCalledTimes(1);
	});

	it('creates Audio with the correct URL', async () => {
		const { switch_audio } = await import('./switch-audio.js');
		switch_audio.init(MOCK_URL);
		switch_audio.play_switch_click();
		expect(audio_ctor).toHaveBeenCalledWith(MOCK_URL);
	});
});
