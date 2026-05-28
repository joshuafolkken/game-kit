const BASE_SCORE = 1000
const MS_PER_SECOND = 1000
const TIME_COEFF_DECAY = 0.1
const MIN_TIME_COEFF = 0.1
const CHECK_SEED = 0x9e_37_79_b9
const SCORE_FORMATTER = new Intl.NumberFormat('en-US')

export const GAME_SCORE_KEY_PREFIX = 'game'
// Read-only fallback so high scores saved before the simon → game rename
// migrate into the new prefix instead of resetting to zero on first load.
const LEGACY_SCORE_KEY_PREFIX = 'simon'

export interface StorageKeys {
	score: string
	round: string
	check: string
}

function make_storage_keys(prefix: string): StorageKeys {
	return {
		score: `${prefix}_high_score`,
		round: `${prefix}_high_score_round`,
		check: `${prefix}_high_score_check`,
	}
}

interface RoundData {
	elapsed_ms: number
	sequence_length: number
	round: number
}

export function compute_check(value: number, round: number): number {
	// eslint-disable-next-line no-bitwise -- score-tamper-check hash; bitwise XOR and unsigned-shift are intentional
	return (Math.imul(value + 1, CHECK_SEED) ^ Math.imul(round + 1, CHECK_SEED >>> 1)) >>> 0
}

export function load_stored_data(keys: StorageKeys): { score: number; round: number } {
	try {
		const stored_score = Number(localStorage.getItem(keys.score))
		const stored_round = Number(localStorage.getItem(keys.round))
		const stored_check = Number(localStorage.getItem(keys.check))
		const is_valid_score = Number.isFinite(stored_score) && stored_score > 0
		const is_valid_round = Number.isFinite(stored_round) && stored_round >= 0
		const is_check_ok = compute_check(stored_score, stored_round) === stored_check
		if (!is_valid_score || !is_valid_round || !is_check_ok) return { score: 0, round: 0 }

		return { score: stored_score, round: stored_round }
	} catch {
		return { score: 0, round: 0 }
	}
}

function save_high_score(value: number, round: number, keys: StorageKeys): void {
	try {
		localStorage.setItem(keys.score, String(value))
		localStorage.setItem(keys.round, String(round))
		localStorage.setItem(keys.check, String(compute_check(value, round)))
	} catch {
		// storage not available in this environment
	}
}

export function calculate_time_coefficient(elapsed_ms: number, sequence_length: number): number {
	const avg_s = elapsed_ms / MS_PER_SECOND / sequence_length

	return Math.max(MIN_TIME_COEFF, 1 - avg_s * TIME_COEFF_DECAY)
}

export function calculate_round_score(
	elapsed_ms: number,
	sequence_length: number,
	round: number,
): number {
	return Math.round(BASE_SCORE * calculate_time_coefficient(elapsed_ms, sequence_length) * round)
}

export function format_score(value: number): string {
	return SCORE_FORMATTER.format(value)
}

interface ScoreState {
	current_score: number
	high_score: number
	high_score_round: number
	is_new_high_score: boolean
	last_cleared_round: number
}

function update_high_score(state: ScoreState, round: number, keys: StorageKeys): void {
	if (state.current_score <= state.high_score) return
	state.high_score = state.current_score
	state.high_score_round = round
	state.is_new_high_score = true
	save_high_score(state.high_score, round, keys)
}

function add_round_score_impl(state: ScoreState, data: RoundData, keys: StorageKeys): void {
	state.current_score += calculate_round_score(data.elapsed_ms, data.sequence_length, data.round)
	state.last_cleared_round = data.round
	update_high_score(state, data.round, keys)
}

function reset_score_impl(state: ScoreState): void {
	state.current_score = 0
	state.is_new_high_score = false
	state.last_cleared_round = 0
}

interface ScoreApi {
	readonly current_score: number
	readonly high_score: number
	readonly high_score_round: number
	readonly is_new_high_score: boolean
	readonly last_cleared_round: number
	add_round_score: (elapsed_ms: number, sequence_length: number, round: number) => void
	reset: () => void
	format_score: typeof format_score
	calculate_time_coefficient: typeof calculate_time_coefficient
	calculate_round_score: typeof calculate_round_score
}

function make_score_api(state: ScoreState, keys: StorageKeys): ScoreApi {
	return {
		get current_score(): number {
			return state.current_score
		},
		get high_score(): number {
			return state.high_score
		},
		get high_score_round(): number {
			return state.high_score_round
		},
		get is_new_high_score(): boolean {
			return state.is_new_high_score
		},
		get last_cleared_round(): number {
			return state.last_cleared_round
		},
		add_round_score(elapsed_ms: number, sequence_length: number, round: number): void {
			add_round_score_impl(state, { elapsed_ms, sequence_length, round }, keys)
		},
		reset(): void {
			reset_score_impl(state)
		},
		format_score,
		calculate_time_coefficient,
		calculate_round_score,
	}
}

function migrate_legacy_score(keys: StorageKeys): { score: number; round: number } {
	const legacy_keys = make_storage_keys(LEGACY_SCORE_KEY_PREFIX)
	const legacy = load_stored_data(legacy_keys)
	if (legacy.score === 0 && legacy.round === 0) return legacy
	save_high_score(legacy.score, legacy.round, keys)

	return legacy
}

export function create_score(key_prefix: string = GAME_SCORE_KEY_PREFIX): ScoreApi {
	const keys = make_storage_keys(key_prefix)
	let loaded = load_stored_data(keys)

	if (key_prefix === GAME_SCORE_KEY_PREFIX && loaded.score === 0 && loaded.round === 0) {
		loaded = migrate_legacy_score(keys)
	}

	const state = $state<ScoreState>({
		current_score: 0,
		high_score: loaded.score,
		high_score_round: loaded.round,
		is_new_high_score: false,
		last_cleared_round: 0,
	})

	return make_score_api(state, keys)
}

export type ScoreInstance = ReturnType<typeof create_score>

export const score = create_score()
