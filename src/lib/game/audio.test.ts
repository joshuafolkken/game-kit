import { afterEach, describe, expect, it, vi } from 'vitest'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- test mock factory; the Web Audio stub shape is an internal test detail
function make_mock_context() {
	const osc = {
		type: 'sine',
		connect: vi.fn(),
		frequency: { setValueAtTime: vi.fn() },
		start: vi.fn(),
		stop: vi.fn(),
	}
	const gain = {
		connect: vi.fn(),
		gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
	}
	// Object literal (not a class) so the Web Audio API method names — fixed external
	// contract — are exempt from the snake_case naming-convention rule applied to class members.
	const context = {
		state: 'running',
		destination: {},
		currentTime: 0,
		createOscillator() {
			return osc
		},
		createGain() {
			return gain
		},
	}
	const ctor = vi.fn().mockImplementation(function audio_context() {
		return context
	})

	return { ctor, osc, gain }
}

describe('game audio', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
		vi.resetModules()
	})

	it('start_tone is a no-op when no AudioContext is available', async () => {
		vi.resetModules()
		vi.stubGlobal('AudioContext', undefined)
		const { game_audio } = await import('./audio')

		expect(() => {
			game_audio.start_tone('green', false)
		}).not.toThrow()
	})

	it('start_tone starts an oscillator and stop_tone stops it', async () => {
		vi.resetModules()
		const { ctor, osc } = make_mock_context()

		vi.stubGlobal('AudioContext', ctor)
		const { game_audio } = await import('./audio')

		game_audio.start_tone('green', false)
		expect(osc.start).toHaveBeenCalledTimes(1)

		game_audio.stop_tone()
		expect(osc.stop).toHaveBeenCalledTimes(1)
	})

	it('start_tone stops the previous oscillator before starting a new one', async () => {
		vi.resetModules()
		const { ctor, osc } = make_mock_context()

		vi.stubGlobal('AudioContext', ctor)
		const { game_audio } = await import('./audio')

		game_audio.start_tone('green', false)
		game_audio.start_tone('red', true)
		expect(osc.stop).toHaveBeenCalledTimes(1)
		expect(osc.start).toHaveBeenCalledTimes(2)
	})

	it('play_tone schedules start and stop on the oscillator', async () => {
		vi.resetModules()
		const { ctor, osc } = make_mock_context()

		vi.stubGlobal('AudioContext', ctor)
		const { game_audio } = await import('./audio')

		game_audio.play_tone('red', 100, false)
		expect(osc.start).toHaveBeenCalledTimes(1)
		expect(osc.stop).toHaveBeenCalledTimes(1)
	})

	it('play_error_tone does not throw', async () => {
		vi.resetModules()
		const { ctor } = make_mock_context()

		vi.stubGlobal('AudioContext', ctor)
		const { game_audio } = await import('./audio')

		expect(() => {
			game_audio.play_error_tone(100, true)
		}).not.toThrow()
	})
})
