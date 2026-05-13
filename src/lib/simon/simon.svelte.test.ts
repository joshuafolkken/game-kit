import { simon_audio } from '$lib/simon/audio'
import { create_score, score } from '$lib/simon/score.svelte'
import {
	FLASH_BURST_CYCLES,
	FLASH_BURST_OFF_MS,
	FLASH_BURST_ON_MS,
	FLASH_CASCADE_FWD_MS,
	FLASH_CASCADE_REV_MS,
	FLASH_FINALE_MS,
} from '$lib/simon/simon-flash'
import {
	create_simon,
	ERROR_BEEP_MS,
	OFF_RATIO,
	ON_RATIO,
	RESTART_DELAY_MS,
	simon,
	STEP_MS_1_5,
} from '$lib/simon/simon.svelte'
import type { ButtonColor } from '$lib/simon/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ALL_COLORS: ButtonColor[] = ['green', 'red', 'yellow', 'blue']
const TONE_MS = 200
const ON_MS = STEP_MS_1_5 * ON_RATIO
const OFF_MS = STEP_MS_1_5 * OFF_RATIO

function wrong_color(color: ButtonColor): ButtonColor {
	return ALL_COLORS.find((c) => c !== color) ?? 'red'
}

function seq_at(i: number): ButtonColor {
	const color = simon.sequence[i]
	if (!color) throw new Error(`sequence index ${String(i)} out of range`)
	return color
}

describe('simon FSM', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		simon.reset()
	})

	afterEach(() => {
		vi.clearAllTimers()
		vi.useRealTimers()
		vi.restoreAllMocks()
		simon.reset()
	})

	it('starts in idle phase with empty sequence and round 0', () => {
		expect(simon.phase).toBe('idle')
		expect(simon.sequence).toHaveLength(0)
		expect(simon.round).toBe(0)
		expect(simon.active_color).toBeNull()
		expect(simon.pressed_color).toBeNull()
	})

	it('start() transitions to showing, sets round 1, adds one sequence item', () => {
		simon.start()
		expect(simon.phase).toBe('showing')
		expect(simon.round).toBe(1)
		expect(simon.sequence).toHaveLength(1)
	})

	it('start() sets active_color to first sequence item immediately', () => {
		simon.start()
		expect(simon.active_color).toBe(seq_at(0))
	})

	it('showing phase transitions to player_input after timers complete', async () => {
		simon.start()
		await vi.runAllTimersAsync()
		expect(simon.phase).toBe('player_input')
		expect(simon.position).toBe(0)
		expect(simon.active_color).toBeNull()
	})

	it('active_color clears after on_ms and phase becomes player_input after off_ms', async () => {
		simon.start()
		expect(simon.active_color).toBe(seq_at(0))
		await vi.advanceTimersByTimeAsync(ON_MS)
		expect(simon.active_color).toBeNull()
		await vi.advanceTimersByTimeAsync(OFF_MS)
		expect(simon.phase).toBe('player_input')
	})

	it('final correct press + release advances to showing for the next round', async () => {
		simon.start()
		await vi.runAllTimersAsync()
		simon.press(seq_at(0))
		simon.release()
		expect(simon.phase).toBe('showing')
		expect(simon.round).toBe(1)
	})

	it('round does not advance while last button is still held', async () => {
		simon.start()
		await vi.runAllTimersAsync()
		const final_color = seq_at(0)
		simon.press(final_color)
		await vi.advanceTimersByTimeAsync(RESTART_DELAY_MS * 2)
		expect(simon.phase).toBe('player_input')
		expect(simon.round).toBe(1)
		expect(simon.pressed_color).toBe(final_color)
	})

	it('next round starts after 1 second delay following release of final button', async () => {
		simon.start()
		await vi.runAllTimersAsync()
		simon.press(seq_at(0))
		simon.release()
		expect(simon.phase).toBe('showing')
		await vi.advanceTimersByTimeAsync(RESTART_DELAY_MS)
		expect(simon.round).toBe(2)
		expect(simon.sequence).toHaveLength(2)
	})

	it('press is ignored while another button is being held', async () => {
		simon.start()
		await vi.runAllTimersAsync()
		simon.press(seq_at(0))
		const spy = vi.spyOn(simon_audio, 'start_tone')
		simon.press('green')
		simon.press('red')
		expect(spy).not.toHaveBeenCalled()
		expect(simon.phase).toBe('player_input')
	})

	it('reset() while a button is held returns to idle', async () => {
		simon.start()
		await vi.runAllTimersAsync()
		simon.press(seq_at(0))
		simon.reset()
		await vi.advanceTimersByTimeAsync(RESTART_DELAY_MS)
		expect(simon.phase).toBe('idle')
		expect(simon.round).toBe(0)
	})

	it('reset() cancels restart timer so next round does not start', async () => {
		simon.start()
		await vi.runAllTimersAsync()
		simon.press(seq_at(0))
		simon.release()
		simon.reset()
		await vi.advanceTimersByTimeAsync(RESTART_DELAY_MS)
		expect(simon.phase).toBe('idle')
		expect(simon.round).toBe(0)
	})

	it('correct intermediate press + release advances position without completing round', async () => {
		simon.start()
		await vi.runAllTimersAsync()
		simon.press(seq_at(0)) // complete round 1
		simon.release()
		await vi.runAllTimersAsync() // drain round 2 show
		const first_color = seq_at(0)
		simon.press(first_color) // first of two correct presses
		simon.release()
		expect(simon.position).toBe(1)
		expect(simon.phase).toBe('player_input')
		expect(simon.round).toBe(2)
	})

	it('wrong press + release triggers gameover', async () => {
		simon.start()
		await vi.runAllTimersAsync()
		simon.press(wrong_color(seq_at(0)))
		simon.release()
		expect(simon.phase).toBe('gameover')
	})

	it('wrong press + release plays error tone for ERROR_BEEP_MS', async () => {
		const spy = vi.spyOn(simon_audio, 'play_error_tone')
		simon.start()
		await vi.runAllTimersAsync()
		simon.press(wrong_color(seq_at(0)))
		simon.release()
		expect(spy).toHaveBeenCalledWith(ERROR_BEEP_MS, false)
	})

	it('press() is ignored when not in player_input phase', () => {
		simon.start() // phase = showing
		simon.press('green')
		expect(simon.phase).toBe('showing')
	})

	it('pressed_color is set on press and does not auto-clear', async () => {
		simon.start()
		await vi.runAllTimersAsync()
		const color = seq_at(0)
		simon.press(color)
		expect(simon.pressed_color).toBe(color)
		await vi.advanceTimersByTimeAsync(TONE_MS + 10)
		expect(simon.pressed_color).toBe(color)
	})

	it('release() clears pressed_color', async () => {
		simon.start()
		await vi.runAllTimersAsync()
		simon.press(seq_at(0))
		simon.release()
		expect(simon.pressed_color).toBeNull()
	})

	it('reset() returns all state to initial values', async () => {
		simon.start()
		await vi.runAllTimersAsync()
		simon.reset()
		expect(simon.phase).toBe('idle')
		expect(simon.sequence).toHaveLength(0)
		expect(simon.position).toBe(0)
		expect(simon.active_color).toBeNull()
		expect(simon.pressed_color).toBeNull()
		expect(simon.round).toBe(0)
	})

	it('reset() clears pressed_color immediately', async () => {
		simon.start()
		await vi.runAllTimersAsync()
		const wrong = wrong_color(seq_at(0))
		simon.press(wrong)
		expect(simon.pressed_color).toBe(wrong)
		simon.reset()
		expect(simon.pressed_color).toBeNull()
	})

	it('reset() cancels an in-progress sequence display', async () => {
		simon.start()
		simon.reset()
		await vi.runAllTimersAsync()
		expect(simon.phase).toBe('idle')
	})

	it('release while phase is showing does not schedule an extra next-round timer', async () => {
		simon.start()
		await vi.runAllTimersAsync()
		simon.press(seq_at(0)) // holding the final button (phase still player_input)
		simon.release() // completes round 1 → phase becomes showing
		simon.release() // should be ignored while showing
		await vi.advanceTimersByTimeAsync(RESTART_DELAY_MS)
		expect(simon.round).toBe(2)
		await vi.advanceTimersByTimeAsync(RESTART_DELAY_MS)
		expect(simon.round).toBe(2)
	})

	it('start() from gameover restarts the game', async () => {
		simon.start()
		await vi.runAllTimersAsync()
		simon.press(wrong_color(seq_at(0)))
		simon.release()
		expect(simon.phase).toBe('gameover')
		simon.start()
		expect(simon.phase).toBe('showing')
		expect(simon.round).toBe(1)
	})

	it('start() is ignored while showing', () => {
		simon.start()
		simon.start()
		expect(simon.round).toBe(1)
	})

	it('start() is ignored during player_input', async () => {
		simon.start()
		await vi.runAllTimersAsync()
		simon.start()
		expect(simon.phase).toBe('player_input')
	})

	it('press() starts tone for pressed color', async () => {
		const spy = vi.spyOn(simon_audio, 'start_tone')
		simon.start()
		await vi.runAllTimersAsync()
		const color = seq_at(0)
		simon.press(color)
		expect(spy).toHaveBeenCalledWith(color, false)
	})

	it('press() does not start tone when not in player_input phase', () => {
		simon.start() // phase = showing
		const spy = vi.spyOn(simon_audio, 'start_tone')
		simon.press('green')
		expect(spy).not.toHaveBeenCalled()
	})

	it('release() stops the tone', async () => {
		const spy = vi.spyOn(simon_audio, 'stop_tone')
		simon.start()
		await vi.runAllTimersAsync()
		simon.press(seq_at(0))
		simon.release()
		expect(spy).toHaveBeenCalled()
	})
})

describe('score integration', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		simon.reset()
	})

	afterEach(() => {
		vi.clearAllTimers()
		vi.useRealTimers()
		vi.restoreAllMocks()
		simon.reset()
	})

	it('current_score is 0 while the final button is held and increases after release', async () => {
		simon.start()
		await vi.runAllTimersAsync()
		simon.press(seq_at(0))
		expect(score.current_score).toBe(0)
		simon.release()
		expect(score.current_score).toBeGreaterThan(0)
	})

	it('current_score is 1000 when round 1 is cleared with ~0 elapsed time', async () => {
		simon.start()
		await vi.runAllTimersAsync()
		simon.press(seq_at(0))
		simon.release()
		expect(score.current_score).toBe(1_000)
	})

	it('current_score resets to 0 after simon.reset()', async () => {
		simon.start()
		await vi.runAllTimersAsync()
		simon.press(seq_at(0))
		simon.release()
		expect(score.current_score).toBeGreaterThan(0)
		simon.reset()
		expect(score.current_score).toBe(0)
	})

	it('current_score resets to 0 when a new game starts via simon.start()', async () => {
		simon.start()
		await vi.runAllTimersAsync()
		simon.press(seq_at(0))
		simon.release()
		expect(score.current_score).toBeGreaterThan(0)
		await vi.runAllTimersAsync()
		simon.press(wrong_color(seq_at(0)))
		simon.release()
		expect(simon.phase).toBe('gameover')
		simon.start()
		expect(score.current_score).toBe(0)
	})
})

describe('victory flash', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		simon.reset()
	})

	afterEach(() => {
		vi.clearAllTimers()
		vi.useRealTimers()
		vi.restoreAllMocks()
		simon.reset()
	})

	it('flash_colors is empty before any round completes', () => {
		simon.start()
		expect(simon.flash_colors).toHaveLength(0)
	})

	it('flash_colors contains all 4 colors immediately after release on round_complete', async () => {
		simon.start()
		await vi.runAllTimersAsync()
		simon.press(seq_at(0))
		simon.release()
		expect(simon.flash_colors).toHaveLength(4)
		expect(simon.flash_colors).toEqual(expect.arrayContaining(ALL_COLORS))
	})

	it('flash_intensity is greater than 1 immediately after release on round_complete', async () => {
		simon.start()
		await vi.runAllTimersAsync()
		simon.press(seq_at(0))
		simon.release()
		expect(simon.flash_intensity).toBeGreaterThan(1)
	})

	it('play_tone is called for all colors during burst stage', async () => {
		const spy = vi.spyOn(simon_audio, 'play_tone')
		simon.start()
		await vi.runAllTimersAsync()
		spy.mockClear()
		simon.press(seq_at(0))
		simon.release()
		const called_colors = spy.mock.calls.map((c) => c[0])
		expect(called_colors).toContain('green')
		expect(called_colors).toContain('red')
		expect(called_colors).toContain('yellow')
		expect(called_colors).toContain('blue')
	})

	it('flash_colors and flash_intensity reset after full flash duration', async () => {
		const flash_total_ms =
			FLASH_BURST_CYCLES * (FLASH_BURST_ON_MS + FLASH_BURST_OFF_MS) +
			ALL_COLORS.length * (FLASH_CASCADE_FWD_MS + FLASH_CASCADE_REV_MS) +
			FLASH_FINALE_MS
		simon.start()
		await vi.runAllTimersAsync()
		simon.press(seq_at(0))
		simon.release()
		await vi.advanceTimersByTimeAsync(flash_total_ms + 10)
		expect(simon.flash_colors).toHaveLength(0)
		expect(simon.flash_intensity).toBe(1)
	})

	it('reset() clears flash_colors and flash_intensity immediately', async () => {
		simon.start()
		await vi.runAllTimersAsync()
		simon.press(seq_at(0))
		simon.release()
		expect(simon.flash_colors).toHaveLength(4)
		simon.reset()
		expect(simon.flash_colors).toHaveLength(0)
		expect(simon.flash_intensity).toBe(1)
	})

	it('flash_colors and flash_intensity cleared when next round starts', async () => {
		simon.start()
		await vi.runAllTimersAsync()
		simon.press(seq_at(0))
		simon.release()
		expect(simon.flash_colors).toHaveLength(4)
		await vi.advanceTimersByTimeAsync(RESTART_DELAY_MS)
		expect(simon.flash_colors).toHaveLength(0)
		expect(simon.flash_intensity).toBe(1)
	})
})

describe('create_simon isolation', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.clearAllTimers()
		vi.useRealTimers()
		vi.restoreAllMocks()
	})

	it('two instances do not share phase state', () => {
		const score_a = create_score()
		const score_b = create_score()
		const a = create_simon(score_a)
		const b = create_simon(score_b)
		a.start()
		expect(a.phase).toBe('showing')
		expect(b.phase).toBe('idle')
		a.reset()
	})

	it('two instances do not share sequence state', () => {
		const score_a = create_score()
		const score_b = create_score()
		const a = create_simon(score_a)
		const b = create_simon(score_b)
		a.start()
		expect(a.sequence).toHaveLength(1)
		expect(b.sequence).toHaveLength(0)
		a.reset()
	})

	it('create_simon with custom colors only uses those colors in sequence', () => {
		const score_c = create_score()
		const custom_colors: ButtonColor[] = ['green', 'blue']
		const c = create_simon(score_c, { colors: custom_colors })
		c.start()
		for (let i = 0; i < 20; i++) {
			c.reset()
			c.start()
		}
		const used = new Set(c.sequence)
		for (const color of used) expect(custom_colors).toContain(color)
		c.reset()
	})
})
