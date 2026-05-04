import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
	vi.unstubAllGlobals();
	vi.resetModules();
});

function make_audio_ctx_ctor(state: AudioContextState) {
	const resume = vi.fn().mockImplementation(() => Promise.resolve());
	return {
		ctor: class {
			readonly state = state;
			readonly resume = resume;
		},
		resume
	};
}

describe('game audio', () => {
	it('get_audio_context returns null before init', async () => {
		vi.resetModules();
		const { audio } = await import('./audio');

		expect(audio.get_audio_context()).toBeNull();
	});

	it('get_audio_context resumes suspended AudioContext', async () => {
		vi.resetModules();
		const { ctor, resume } = make_audio_ctx_ctor('suspended');
		vi.stubGlobal('AudioContext', ctor);

		const { audio } = await import('./audio');
		audio.init_audio();
		audio.get_audio_context();

		expect(resume).toHaveBeenCalledTimes(1);
	});

	it('get_audio_context does not call resume when running', async () => {
		vi.resetModules();
		const { ctor, resume } = make_audio_ctx_ctor('running');
		vi.stubGlobal('AudioContext', ctor);

		const { audio } = await import('./audio');
		audio.init_audio();
		audio.get_audio_context();

		expect(resume).not.toHaveBeenCalled();
	});

	it('init_audio is idempotent — multiple calls create only one AudioContext', async () => {
		vi.resetModules();
		let instance_count = 0;
		vi.stubGlobal(
			'AudioContext',
			class {
				readonly state: AudioContextState = 'running';
				constructor() {
					instance_count += 1;
				}
			}
		);

		const { audio } = await import('./audio');
		audio.init_audio();
		audio.init_audio();

		expect(instance_count).toBe(1);
	});
});
