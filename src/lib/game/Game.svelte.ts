import { game_state } from '$lib/game-kit/State.svelte'
import { game_audio } from './audio'
import { cancel_flash, run_victory_flash, type FlashState, type FlashTimers } from './flash'
import { score as default_score, type ScoreInstance } from './Score.svelte'
import type { ButtonColor, GamePhase } from './types'

export const STEP_MS_1_5 = 500
export const STEP_MS_6_13 = 400
export const STEP_MS_14_20 = 250
export const STEP_MS_21_PLUS = 150

const LENGTH_TIER_1_MAX = 5
const LENGTH_TIER_2_MAX = 13
const LENGTH_TIER_3_MAX = 20
export const ON_RATIO = 0.7
export const OFF_RATIO = 0.3
export const ERROR_BEEP_MS = 3000
export const RESTART_DELAY_MS = 1000

const DEFAULT_COLORS: ReadonlyArray<ButtonColor> = ['green', 'red', 'yellow', 'blue']
const FALLBACK_COLOR: ButtonColor = 'green'

type GameState = {
	phase: GamePhase
	sequence: Array<ButtonColor>
	position: number
	active_color: ButtonColor | null
	pressed_color: ButtonColor | null
	round: number
} & FlashState

type GameTimers = {
	show_gen: number
	restart_timer: ReturnType<typeof setTimeout> | null
	input_start_ms: number
} & FlashTimers

async function delay(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms))
}

function get_step_ms(length_: number): number {
	if (length_ <= LENGTH_TIER_1_MAX) return STEP_MS_1_5
	if (length_ <= LENGTH_TIER_2_MAX) return STEP_MS_6_13
	if (length_ <= LENGTH_TIER_3_MAX) return STEP_MS_14_20

	return STEP_MS_21_PLUS
}

function add_to_sequence(state: GameState, colors: ReadonlyArray<ButtonColor>): void {
	// eslint-disable-next-line sonarjs/pseudo-random -- game RNG; not security-sensitive
	const index = Math.floor(Math.random() * colors.length)

	state.sequence.push(colors[index] ?? FALLBACK_COLOR)
}

function cancel_restart_timer(t: GameTimers): void {
	if (t.restart_timer !== null) clearTimeout(t.restart_timer)
	t.restart_timer = null
}

async function run_show(state: GameState, t: GameTimers, gen: number): Promise<void> {
	const step_ms = get_step_ms(state.sequence.length)
	const on_ms = step_ms * ON_RATIO
	const off_ms = step_ms * OFF_RATIO

	for (const color of state.sequence) {
		if (gen !== t.show_gen) return
		state.active_color = color
		game_audio.play_tone(color, on_ms, game_state.is_alt)
		await delay(on_ms)
		if (gen !== t.show_gen) return
		state.active_color = null
		await delay(off_ms)
	}

	if (gen !== t.show_gen) return
	t.input_start_ms = Date.now()
	state.phase = 'player_input'
	state.position = 0
}

function start_next_round(
	state: GameState,
	t: GameTimers,
	colors: ReadonlyArray<ButtonColor>,
): void {
	t.restart_timer = null
	cancel_flash(state, t)
	state.round += 1
	add_to_sequence(state, colors)
	t.show_gen += 1
	void run_show(state, t, t.show_gen)
}

function schedule_next_round(
	state: GameState,
	t: GameTimers,
	colors: ReadonlyArray<ButtonColor>,
): void {
	cancel_restart_timer(t)
	cancel_flash(state, t)
	state.phase = 'showing'
	void run_victory_flash(state, t, colors, t.flash_gen)
	t.restart_timer = setTimeout(() => {
		start_next_round(state, t, colors)
	}, RESTART_DELAY_MS)
}

function handle_correct_release(
	state: GameState,
	t: GameTimers,
	score: ScoreInstance,
	colors: ReadonlyArray<ButtonColor>,
): void {
	state.position += 1
	if (state.position < state.sequence.length) return
	score.add_round_score(Date.now() - t.input_start_ms, state.sequence.length, state.round)
	state.phase = 'round_complete'
	schedule_next_round(state, t, colors)
}

function start_game(
	state: GameState,
	t: GameTimers,
	score: ScoreInstance,
	colors: ReadonlyArray<ButtonColor>,
): void {
	if (state.phase === 'showing' || state.phase === 'player_input') return
	cancel_restart_timer(t)
	score.reset()
	state.phase = 'showing'
	state.round = 1
	state.sequence = []
	add_to_sequence(state, colors)
	t.show_gen += 1
	void run_show(state, t, t.show_gen)
}

function release_game(
	state: GameState,
	t: GameTimers,
	score: ScoreInstance,
	colors: ReadonlyArray<ButtonColor>,
): void {
	game_audio.stop_tone()
	const color = state.pressed_color

	state.pressed_color = null
	if (state.phase !== 'player_input') return
	if (color === null) return

	if (color === state.sequence[state.position]) {
		handle_correct_release(state, t, score, colors)
	} else {
		game_audio.play_error_tone(ERROR_BEEP_MS, game_state.is_alt)
		state.phase = 'gameover'
	}
}

function press_game(state: GameState, color: ButtonColor): void {
	if (state.phase !== 'player_input') return
	if (state.pressed_color !== null) return
	state.pressed_color = color
	game_audio.start_tone(color, game_state.is_alt)
}

function reset_game(state: GameState, t: GameTimers, score: ScoreInstance): void {
	t.show_gen += 1
	game_audio.stop_tone()
	state.pressed_color = null
	cancel_restart_timer(t)
	cancel_flash(state, t)
	score.reset()
	state.phase = 'idle'
	state.sequence = []
	state.position = 0
	state.active_color = null
	t.input_start_ms = 0
	state.round = 0
}

interface GameApi {
	readonly phase: GameState['phase']
	readonly sequence: GameState['sequence']
	readonly position: GameState['position']
	readonly active_color: GameState['active_color']
	readonly pressed_color: GameState['pressed_color']
	readonly round: GameState['round']
	readonly flash_colors: GameState['flash_colors']
	readonly flash_intensity: GameState['flash_intensity']
	start: () => void
	press: (color: ButtonColor) => void
	release: () => void
	reset: () => void
}

function make_game_api(
	state: GameState,
	t: GameTimers,
	score: ScoreInstance,
	colors: ReadonlyArray<ButtonColor>,
): GameApi {
	return {
		get phase() {
			return state.phase
		},
		get sequence() {
			return state.sequence
		},
		get position() {
			return state.position
		},
		get active_color() {
			return state.active_color
		},
		get pressed_color() {
			return state.pressed_color
		},
		get round() {
			return state.round
		},
		get flash_colors() {
			return state.flash_colors
		},
		get flash_intensity() {
			return state.flash_intensity
		},
		start(): void {
			start_game(state, t, score, colors)
		},
		press(color: ButtonColor): void {
			press_game(state, color)
		},
		release(): void {
			release_game(state, t, score, colors)
		},
		reset(): void {
			reset_game(state, t, score)
		},
	}
}

interface GameConfig {
	colors?: ReadonlyArray<ButtonColor>
}

export function create_game(score: ScoreInstance, config: GameConfig = {}): GameApi {
	const colors = config.colors ?? DEFAULT_COLORS
	const state = $state<GameState>({
		phase: 'idle',
		sequence: [],
		position: 0,
		active_color: null,
		pressed_color: null,
		round: 0,
		flash_colors: [],
		flash_intensity: 1,
	})
	const t: GameTimers = { show_gen: 0, flash_gen: 0, restart_timer: null, input_start_ms: 0 }

	return make_game_api(state, t, score, colors)
}

export type GameInstance = ReturnType<typeof create_game>

export const game = create_game(default_score)
