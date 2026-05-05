import { game_state } from '$lib/game/state.svelte'
import { simon_audio } from './audio'
import { score as default_score, type ScoreInstance } from './score.svelte'
import { cancel_flash, run_victory_flash, type FlashState, type FlashTimers } from './simon-flash'
import type { ButtonColor, SimonPhase } from './types'

export const STEP_MS_1_5 = 500
export const STEP_MS_6_13 = 400
export const STEP_MS_14_20 = 250
export const STEP_MS_21_PLUS = 150
export const ON_RATIO = 0.7
export const OFF_RATIO = 0.3
export const ERROR_BEEP_MS = 3000
export const RESTART_DELAY_MS = 1000

const DEFAULT_COLORS: readonly ButtonColor[] = ['green', 'red', 'yellow', 'blue']
const FALLBACK_COLOR: ButtonColor = 'green'

type SimonState = {
	phase: SimonPhase
	sequence: ButtonColor[]
	position: number
	active_color: ButtonColor | null
	pressed_color: ButtonColor | null
	round: number
} & FlashState

type SimonTimers = {
	show_gen: number
	restart_timer: ReturnType<typeof setTimeout> | null
	input_start_ms: number
} & FlashTimers

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

function get_step_ms(len: number): number {
	if (len <= 5) return STEP_MS_1_5
	if (len <= 13) return STEP_MS_6_13
	if (len <= 20) return STEP_MS_14_20
	return STEP_MS_21_PLUS
}

function add_to_sequence(s: SimonState, colors: readonly ButtonColor[]): void {
	const index = Math.floor(Math.random() * colors.length) // NOSONAR — game RNG, not security-sensitive
	s.sequence.push(colors[index] ?? FALLBACK_COLOR)
}

function cancel_restart_timer(t: SimonTimers): void {
	if (t.restart_timer !== null) clearTimeout(t.restart_timer)
	t.restart_timer = null
}

async function run_show(s: SimonState, t: SimonTimers, gen: number): Promise<void> {
	const step_ms = get_step_ms(s.sequence.length)
	const on_ms = step_ms * ON_RATIO
	const off_ms = step_ms * OFF_RATIO
	for (const color of s.sequence) {
		if (gen !== t.show_gen) return
		s.active_color = color
		simon_audio.play_tone(color, on_ms, game_state.is_alt)
		await delay(on_ms)
		if (gen !== t.show_gen) return
		s.active_color = null
		await delay(off_ms)
	}
	if (gen !== t.show_gen) return
	t.input_start_ms = Date.now()
	s.phase = 'player_input'
	s.position = 0
}

function start_next_round(s: SimonState, t: SimonTimers, colors: readonly ButtonColor[]): void {
	t.restart_timer = null
	cancel_flash(s, t)
	s.round += 1
	add_to_sequence(s, colors)
	t.show_gen += 1
	void run_show(s, t, t.show_gen)
}

function schedule_next_round(s: SimonState, t: SimonTimers, colors: readonly ButtonColor[]): void {
	cancel_restart_timer(t)
	cancel_flash(s, t)
	s.phase = 'showing'
	void run_victory_flash(s, t, colors, t.flash_gen)
	t.restart_timer = setTimeout(() => start_next_round(s, t, colors), RESTART_DELAY_MS)
}

function handle_correct_release(
	s: SimonState,
	t: SimonTimers,
	score: ScoreInstance,
	colors: readonly ButtonColor[],
): void {
	s.position += 1
	if (s.position < s.sequence.length) return
	score.add_round_score(Date.now() - t.input_start_ms, s.sequence.length, s.round)
	s.phase = 'round_complete'
	schedule_next_round(s, t, colors)
}

function start_simon(
	s: SimonState,
	t: SimonTimers,
	score: ScoreInstance,
	colors: readonly ButtonColor[],
): void {
	if (s.phase === 'showing' || s.phase === 'player_input') return
	cancel_restart_timer(t)
	score.reset()
	s.phase = 'showing'
	s.round = 1
	s.sequence = []
	add_to_sequence(s, colors)
	t.show_gen += 1
	void run_show(s, t, t.show_gen)
}

function release_simon(
	s: SimonState,
	t: SimonTimers,
	score: ScoreInstance,
	colors: readonly ButtonColor[],
): void {
	simon_audio.stop_tone()
	const color = s.pressed_color
	s.pressed_color = null
	if (s.phase !== 'player_input') return
	if (color === null) return
	if (color === s.sequence[s.position]) {
		handle_correct_release(s, t, score, colors)
	} else {
		simon_audio.play_error_tone(ERROR_BEEP_MS, game_state.is_alt)
		s.phase = 'gameover'
	}
}

function press_simon(s: SimonState, color: ButtonColor): void {
	if (s.phase !== 'player_input') return
	if (s.pressed_color !== null) return
	s.pressed_color = color
	simon_audio.start_tone(color, game_state.is_alt)
}

function reset_simon(s: SimonState, t: SimonTimers, score: ScoreInstance): void {
	t.show_gen += 1
	simon_audio.stop_tone()
	s.pressed_color = null
	cancel_restart_timer(t)
	cancel_flash(s, t)
	score.reset()
	s.phase = 'idle'
	s.sequence = []
	s.position = 0
	s.active_color = null
	t.input_start_ms = 0
	s.round = 0
}

function make_simon_api(
	s: SimonState,
	t: SimonTimers,
	score: ScoreInstance,
	colors: readonly ButtonColor[],
) {
	return {
		get phase() {
			return s.phase
		},
		get sequence() {
			return s.sequence
		},
		get position() {
			return s.position
		},
		get active_color() {
			return s.active_color
		},
		get pressed_color() {
			return s.pressed_color
		},
		get round() {
			return s.round
		},
		get flash_colors() {
			return s.flash_colors
		},
		get flash_intensity() {
			return s.flash_intensity
		},
		start: (): void => start_simon(s, t, score, colors),
		press: (color: ButtonColor): void => press_simon(s, color),
		release: (): void => release_simon(s, t, score, colors),
		reset: (): void => reset_simon(s, t, score),
	}
}

type SimonConfig = { colors?: readonly ButtonColor[] }

export function create_simon(score: ScoreInstance, config: SimonConfig = {}) {
	const colors = config.colors ?? DEFAULT_COLORS
	const s = $state<SimonState>({
		phase: 'idle',
		sequence: [],
		position: 0,
		active_color: null,
		pressed_color: null,
		round: 0,
		flash_colors: [],
		flash_intensity: 1,
	})
	const t: SimonTimers = { show_gen: 0, flash_gen: 0, restart_timer: null, input_start_ms: 0 }
	return make_simon_api(s, t, score, colors)
}

export type SimonInstance = ReturnType<typeof create_simon>

export const simon = create_simon(default_score)
