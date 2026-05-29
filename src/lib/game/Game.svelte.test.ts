import { game_audio } from '$lib/game/audio'
import {
	FLASH_BURST_CYCLES,
	FLASH_BURST_OFF_MS,
	FLASH_BURST_ON_MS,
	FLASH_CASCADE_FWD_MS,
	FLASH_CASCADE_REV_MS,
	FLASH_FINALE_MS,
} from '$lib/game/flash'
import {
	create_game,
	ERROR_BEEP_MS,
	game,
	OFF_RATIO,
	ON_RATIO,
	RESTART_DELAY_MS,
	STEP_MS_1_5,
} from '$lib/game/Game.svelte'
import { create_score, score } from '$lib/game/Score.svelte'
import type { ButtonColor } from '$lib/game/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ALL_COLORS: Array<ButtonColor> = ['green', 'red', 'yellow', 'blue']
const TONE_MS = 200
const ON_MS = STEP_MS_1_5 * ON_RATIO
const OFF_MS = STEP_MS_1_5 * OFF_RATIO

function wrong_color(color: ButtonColor): ButtonColor {
	return ALL_COLORS.find((col) => col !== color) ?? 'red'
}

function seq_at(index: number): ButtonColor {
	const color = game.sequence[index]
	if (!color) throw new Error(`sequence index ${String(index)} out of range`)

	return color
}

beforeEach(() => {
	vi.useFakeTimers()
	game.reset()
})

afterEach(() => {
	vi.clearAllTimers()
	vi.useRealTimers()
	vi.restoreAllMocks()
	game.reset()
})

describe('game FSM — start & sequence display', () => {
	it('starts in idle phase with empty sequence and round 0', () => {
		expect(game.phase).toBe('idle')
		expect(game.sequence).toHaveLength(0)
		expect(game.round).toBe(0)
		expect(game.active_color).toBeNull()
		expect(game.pressed_color).toBeNull()
	})

	it('start() transitions to showing, sets round 1, adds one sequence item', () => {
		game.start()
		expect(game.phase).toBe('showing')
		expect(game.round).toBe(1)
		expect(game.sequence).toHaveLength(1)
	})

	it('start() sets active_color to first sequence item immediately', () => {
		game.start()
		expect(game.active_color).toBe(seq_at(0))
	})

	it('showing phase transitions to player_input after timers complete', async () => {
		game.start()
		await vi.runAllTimersAsync()
		expect(game.phase).toBe('player_input')
		expect(game.position).toBe(0)
		expect(game.active_color).toBeNull()
	})

	it('active_color clears after on_ms and phase becomes player_input after off_ms', async () => {
		game.start()
		expect(game.active_color).toBe(seq_at(0))
		await vi.advanceTimersByTimeAsync(ON_MS)
		expect(game.active_color).toBeNull()
		await vi.advanceTimersByTimeAsync(OFF_MS)
		expect(game.phase).toBe('player_input')
	})
})

describe('game FSM — round progression', () => {
	it('final correct press + release advances to showing for the next round', async () => {
		game.start()
		await vi.runAllTimersAsync()
		game.press(seq_at(0))
		game.release()
		expect(game.phase).toBe('showing')
		expect(game.round).toBe(1)
	})

	it('round does not advance while last button is still held', async () => {
		game.start()
		await vi.runAllTimersAsync()
		const final_color = seq_at(0)

		game.press(final_color)
		await vi.advanceTimersByTimeAsync(RESTART_DELAY_MS * 2)
		expect(game.phase).toBe('player_input')
		expect(game.round).toBe(1)
		expect(game.pressed_color).toBe(final_color)
	})

	it('next round starts after 1 second delay following release of final button', async () => {
		game.start()
		await vi.runAllTimersAsync()
		game.press(seq_at(0))
		game.release()
		expect(game.phase).toBe('showing')
		await vi.advanceTimersByTimeAsync(RESTART_DELAY_MS)
		expect(game.round).toBe(2)
		expect(game.sequence).toHaveLength(2)
	})

	it('press is ignored while another button is being held', async () => {
		game.start()
		await vi.runAllTimersAsync()
		game.press(seq_at(0))
		const spy = vi.spyOn(game_audio, 'start_tone')

		game.press('green')
		game.press('red')
		expect(spy).not.toHaveBeenCalled()
		expect(game.phase).toBe('player_input')
	})

	it('reset() while a button is held returns to idle', async () => {
		game.start()
		await vi.runAllTimersAsync()
		game.press(seq_at(0))
		game.reset()
		await vi.advanceTimersByTimeAsync(RESTART_DELAY_MS)
		expect(game.phase).toBe('idle')
		expect(game.round).toBe(0)
	})

	it('reset() cancels restart timer so next round does not start', async () => {
		game.start()
		await vi.runAllTimersAsync()
		game.press(seq_at(0))
		game.release()
		game.reset()
		await vi.advanceTimersByTimeAsync(RESTART_DELAY_MS)
		expect(game.phase).toBe('idle')
		expect(game.round).toBe(0)
	})

	it('correct intermediate press + release advances position without completing round', async () => {
		game.start()
		await vi.runAllTimersAsync()
		game.press(seq_at(0)) // complete round 1
		game.release()
		await vi.runAllTimersAsync() // drain round 2 show
		const first_color = seq_at(0)

		game.press(first_color) // first of two correct presses
		game.release()
		expect(game.position).toBe(1)
		expect(game.phase).toBe('player_input')
		expect(game.round).toBe(2)
	})
})

describe('game FSM — error handling', () => {
	it('wrong press + release triggers gameover', async () => {
		game.start()
		await vi.runAllTimersAsync()
		game.press(wrong_color(seq_at(0)))
		game.release()
		expect(game.phase).toBe('gameover')
	})

	it('wrong press + release plays error tone for ERROR_BEEP_MS', async () => {
		const spy = vi.spyOn(game_audio, 'play_error_tone')

		game.start()
		await vi.runAllTimersAsync()
		game.press(wrong_color(seq_at(0)))
		game.release()
		expect(spy).toHaveBeenCalledWith(ERROR_BEEP_MS, false)
	})
})

describe('game FSM — press & release', () => {
	it('press() is ignored when not in player_input phase', () => {
		game.start() // phase = showing
		game.press('green')
		expect(game.phase).toBe('showing')
	})

	it('pressed_color is set on press and does not auto-clear', async () => {
		game.start()
		await vi.runAllTimersAsync()
		const color = seq_at(0)

		game.press(color)
		expect(game.pressed_color).toBe(color)
		await vi.advanceTimersByTimeAsync(TONE_MS + 10)
		expect(game.pressed_color).toBe(color)
	})

	it('release() clears pressed_color', async () => {
		game.start()
		await vi.runAllTimersAsync()
		game.press(seq_at(0))
		game.release()
		expect(game.pressed_color).toBeNull()
	})
})

describe('game FSM — reset & lifecycle', () => {
	it('reset() returns all state to initial values', async () => {
		game.start()
		await vi.runAllTimersAsync()
		game.reset()
		expect(game.phase).toBe('idle')
		expect(game.sequence).toHaveLength(0)
		expect(game.position).toBe(0)
		expect(game.active_color).toBeNull()
		expect(game.pressed_color).toBeNull()
		expect(game.round).toBe(0)
	})

	it('reset() clears pressed_color immediately', async () => {
		game.start()
		await vi.runAllTimersAsync()
		const wrong = wrong_color(seq_at(0))

		game.press(wrong)
		expect(game.pressed_color).toBe(wrong)
		game.reset()
		expect(game.pressed_color).toBeNull()
	})

	it('reset() cancels an in-progress sequence display', async () => {
		game.start()
		game.reset()
		await vi.runAllTimersAsync()
		expect(game.phase).toBe('idle')
	})

	it('release while phase is showing does not schedule an extra next-round timer', async () => {
		game.start()
		await vi.runAllTimersAsync()
		game.press(seq_at(0)) // holding the final button (phase still player_input)
		game.release() // completes round 1 → phase becomes showing
		game.release() // should be ignored while showing
		await vi.advanceTimersByTimeAsync(RESTART_DELAY_MS)
		expect(game.round).toBe(2)
		await vi.advanceTimersByTimeAsync(RESTART_DELAY_MS)
		expect(game.round).toBe(2)
	})

	it('start() from gameover restarts the game', async () => {
		game.start()
		await vi.runAllTimersAsync()
		game.press(wrong_color(seq_at(0)))
		game.release()
		expect(game.phase).toBe('gameover')
		game.start()
		expect(game.phase).toBe('showing')
		expect(game.round).toBe(1)
	})

	it('start() is ignored while showing', () => {
		game.start()
		game.start()
		expect(game.round).toBe(1)
	})

	it('start() is ignored during player_input', async () => {
		game.start()
		await vi.runAllTimersAsync()
		game.start()
		expect(game.phase).toBe('player_input')
	})
})

describe('game FSM — tone', () => {
	it('press() starts tone for pressed color', async () => {
		const spy = vi.spyOn(game_audio, 'start_tone')

		game.start()
		await vi.runAllTimersAsync()
		const color = seq_at(0)

		game.press(color)
		expect(spy).toHaveBeenCalledWith(color, false)
	})

	it('press() does not start tone when not in player_input phase', () => {
		game.start() // phase = showing
		const spy = vi.spyOn(game_audio, 'start_tone')

		game.press('green')
		expect(spy).not.toHaveBeenCalled()
	})

	it('release() stops the tone', async () => {
		const spy = vi.spyOn(game_audio, 'stop_tone')

		game.start()
		await vi.runAllTimersAsync()
		game.press(seq_at(0))
		game.release()
		expect(spy).toHaveBeenCalled()
	})
})

describe('score integration', () => {
	it('current_score is 0 while the final button is held and increases after release', async () => {
		game.start()
		await vi.runAllTimersAsync()
		game.press(seq_at(0))
		expect(score.current_score).toBe(0)
		game.release()
		expect(score.current_score).toBeGreaterThan(0)
	})

	it('current_score is 1000 when round 1 is cleared with ~0 elapsed time', async () => {
		game.start()
		await vi.runAllTimersAsync()
		game.press(seq_at(0))
		game.release()
		expect(score.current_score).toBe(1000)
	})

	it('current_score resets to 0 after game.reset()', async () => {
		game.start()
		await vi.runAllTimersAsync()
		game.press(seq_at(0))
		game.release()
		expect(score.current_score).toBeGreaterThan(0)
		game.reset()
		expect(score.current_score).toBe(0)
	})

	it('current_score resets to 0 when a new game starts via game.start()', async () => {
		game.start()
		await vi.runAllTimersAsync()
		game.press(seq_at(0))
		game.release()
		expect(score.current_score).toBeGreaterThan(0)
		await vi.runAllTimersAsync()
		game.press(wrong_color(seq_at(0)))
		game.release()
		expect(game.phase).toBe('gameover')
		game.start()
		expect(score.current_score).toBe(0)
	})
})

describe('victory flash', () => {
	it('flash_colors is empty before any round completes', () => {
		game.start()
		expect(game.flash_colors).toHaveLength(0)
	})

	it('flash_colors contains all 4 colors immediately after release on round_complete', async () => {
		game.start()
		await vi.runAllTimersAsync()
		game.press(seq_at(0))
		game.release()
		expect(game.flash_colors).toHaveLength(4)
		expect(game.flash_colors).toEqual(expect.arrayContaining(ALL_COLORS))
	})

	it('flash_intensity is greater than 1 immediately after release on round_complete', async () => {
		game.start()
		await vi.runAllTimersAsync()
		game.press(seq_at(0))
		game.release()
		expect(game.flash_intensity).toBeGreaterThan(1)
	})

	it('play_tone is called for all colors during burst stage', async () => {
		const spy = vi.spyOn(game_audio, 'play_tone')

		game.start()
		await vi.runAllTimersAsync()
		spy.mockClear()
		game.press(seq_at(0))
		game.release()
		const called_colors = spy.mock.calls.map((call) => call[0])

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

		game.start()
		await vi.runAllTimersAsync()
		game.press(seq_at(0))
		game.release()
		await vi.advanceTimersByTimeAsync(flash_total_ms + 10)
		expect(game.flash_colors).toHaveLength(0)
		expect(game.flash_intensity).toBe(1)
	})

	it('reset() clears flash_colors and flash_intensity immediately', async () => {
		game.start()
		await vi.runAllTimersAsync()
		game.press(seq_at(0))
		game.release()
		expect(game.flash_colors).toHaveLength(4)
		game.reset()
		expect(game.flash_colors).toHaveLength(0)
		expect(game.flash_intensity).toBe(1)
	})

	it('flash_colors and flash_intensity cleared when next round starts', async () => {
		game.start()
		await vi.runAllTimersAsync()
		game.press(seq_at(0))
		game.release()
		expect(game.flash_colors).toHaveLength(4)
		await vi.advanceTimersByTimeAsync(RESTART_DELAY_MS)
		expect(game.flash_colors).toHaveLength(0)
		expect(game.flash_intensity).toBe(1)
	})
})

describe('create_game isolation', () => {
	it('two instances do not share phase state', () => {
		const score_a = create_score()
		const score_b = create_score()
		const game_a = create_game(score_a)
		const game_b = create_game(score_b)

		game_a.start()
		expect(game_a.phase).toBe('showing')
		expect(game_b.phase).toBe('idle')
		game_a.reset()
	})

	it('two instances do not share sequence state', () => {
		const score_a = create_score()
		const score_b = create_score()
		const game_a = create_game(score_a)
		const game_b = create_game(score_b)

		game_a.start()
		expect(game_a.sequence).toHaveLength(1)
		expect(game_b.sequence).toHaveLength(0)
		game_a.reset()
	})

	it('create_game with custom colors only uses those colors in sequence', () => {
		const score_c = create_score()
		const custom_colors: Array<ButtonColor> = ['green', 'blue']
		const game_c = create_game(score_c, { colors: custom_colors })

		game_c.start()

		for (let index = 0; index < 20; index++) {
			game_c.reset()
			game_c.start()
		}

		const used = new Set(game_c.sequence)
		for (const color of used) expect(custom_colors).toContain(color)
		game_c.reset()
	})
})
