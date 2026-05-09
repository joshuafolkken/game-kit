import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { simon_audio } from './audio'
import {
	cancel_flash,
	FLASH_BURST_CYCLES,
	FLASH_BURST_OFF_MS,
	FLASH_BURST_ON_MS,
	FLASH_CASCADE_FWD_MS,
	FLASH_CASCADE_REV_MS,
	FLASH_FINALE_MS,
	run_victory_flash,
	type FlashState,
	type FlashTimers,
} from './simon-flash'
import type { ButtonColor } from './types'

const COLORS: ButtonColor[] = ['green', 'red', 'yellow', 'blue']

function make_state(): FlashState {
	return { flash_colors: [], flash_intensity: 1 }
}

function make_timers(): FlashTimers {
	return { flash_gen: 0 }
}

describe('flash constants', () => {
	it('FLASH_BURST_ON_MS is 30', () => {
		expect(FLASH_BURST_ON_MS).toBe(30)
	})

	it('FLASH_BURST_OFF_MS is 20', () => {
		expect(FLASH_BURST_OFF_MS).toBe(20)
	})

	it('FLASH_BURST_CYCLES is 4', () => {
		expect(FLASH_BURST_CYCLES).toBe(4)
	})

	it('FLASH_CASCADE_FWD_MS is 65', () => {
		expect(FLASH_CASCADE_FWD_MS).toBe(65)
	})

	it('FLASH_CASCADE_REV_MS is 40', () => {
		expect(FLASH_CASCADE_REV_MS).toBe(40)
	})

	it('FLASH_FINALE_MS is 320', () => {
		expect(FLASH_FINALE_MS).toBe(320)
	})
})

describe('cancel_flash', () => {
	it('increments flash_gen', () => {
		const s = make_state()
		const t = make_timers()
		cancel_flash(s, t)
		expect(t.flash_gen).toBe(1)
	})

	it('clears flash_colors', () => {
		const s: FlashState = { flash_colors: ['green', 'red'], flash_intensity: 2.5 }
		const t = make_timers()
		cancel_flash(s, t)
		expect(s.flash_colors).toHaveLength(0)
	})

	it('resets flash_intensity to 1', () => {
		const s: FlashState = { flash_colors: ['green'], flash_intensity: 2.5 }
		const t = make_timers()
		cancel_flash(s, t)
		expect(s.flash_intensity).toBe(1)
	})

	it('increments flash_gen each call', () => {
		const s = make_state()
		const t = make_timers()
		cancel_flash(s, t)
		cancel_flash(s, t)
		expect(t.flash_gen).toBe(2)
	})
})

describe('run_victory_flash', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		vi.spyOn(simon_audio, 'play_tone').mockImplementation(() => {})
	})

	afterEach(() => {
		vi.clearAllTimers()
		vi.useRealTimers()
		vi.restoreAllMocks()
	})

	it('sets flash_colors to all colors at start of burst', async () => {
		const s = make_state()
		const t = make_timers()
		void run_victory_flash(s, t, COLORS, 0)
		await vi.advanceTimersByTimeAsync(0)
		expect(s.flash_colors).toEqual(expect.arrayContaining(COLORS))
	})

	it('sets flash_intensity above 1 during burst', async () => {
		const s = make_state()
		const t = make_timers()
		void run_victory_flash(s, t, COLORS, 0)
		await vi.advanceTimersByTimeAsync(0)
		expect(s.flash_intensity).toBeGreaterThan(1)
	})

	it('calls play_tone for each color during burst', async () => {
		const spy = vi.spyOn(simon_audio, 'play_tone').mockImplementation(() => {})
		const s = make_state()
		const t = make_timers()
		void run_victory_flash(s, t, COLORS, 0)
		await vi.advanceTimersByTimeAsync(FLASH_BURST_ON_MS)
		const called_colors = spy.mock.calls.map((c) => c[0])
		for (const color of COLORS) expect(called_colors).toContain(color)
	})

	it('aborts when flash_gen changes mid-run', async () => {
		const s = make_state()
		const t = make_timers()
		void run_victory_flash(s, t, COLORS, 0)
		await vi.advanceTimersByTimeAsync(0)
		cancel_flash(s, t)
		const calls_before = (vi.mocked(simon_audio.play_tone) as ReturnType<typeof vi.fn>).mock.calls
			.length
		await vi.runAllTimersAsync()
		const calls_after = (vi.mocked(simon_audio.play_tone) as ReturnType<typeof vi.fn>).mock.calls
			.length
		expect(calls_after).toBe(calls_before)
	})

	it('clears flash_colors after full run completes', async () => {
		const s = make_state()
		const t = make_timers()
		const flash_total_ms =
			FLASH_BURST_CYCLES * (FLASH_BURST_ON_MS + FLASH_BURST_OFF_MS) +
			COLORS.length * (FLASH_CASCADE_FWD_MS + FLASH_CASCADE_REV_MS) +
			FLASH_FINALE_MS
		void run_victory_flash(s, t, COLORS, 0)
		await vi.advanceTimersByTimeAsync(flash_total_ms + 10)
		expect(s.flash_colors).toHaveLength(0)
		expect(s.flash_intensity).toBe(1)
	})

	it('works with a custom color subset', async () => {
		const custom: ButtonColor[] = ['green', 'blue']
		const spy = vi.spyOn(simon_audio, 'play_tone').mockImplementation(() => {})
		const s = make_state()
		const t = make_timers()
		void run_victory_flash(s, t, custom, 0)
		await vi.advanceTimersByTimeAsync(FLASH_BURST_ON_MS)
		const called_colors = spy.mock.calls.map((c) => c[0])
		expect(called_colors).toContain('green')
		expect(called_colors).toContain('blue')
	})
})
