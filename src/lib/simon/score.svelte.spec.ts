import {
	compute_check,
	create_score,
	load_stored_data,
	score,
	type StorageKeys,
} from '$lib/simon/score.svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ROUND_1 = 1
const ROUND_5 = 5
const SEQ_1 = 1
const SEQ_5 = 5
const ELAPSED_0 = 0
const ELAPSED_5S = 5_000
const ELAPSED_10S = 10_000
const ELAPSED_100S = 100_000

const DEFAULT_KEYS: StorageKeys = {
	score: 'simon_high_score',
	round: 'simon_high_score_round',
	check: 'simon_high_score_check',
}

describe('score', () => {
	beforeEach(() => {
		score.reset()
	})

	describe('calculate_time_coefficient', () => {
		it('returns 1.0 for zero elapsed time', () => {
			expect(score.calculate_time_coefficient(ELAPSED_0, SEQ_1)).toBe(1)
		})

		it('decays by 0.1 per avg second per button', () => {
			const avg_s = ELAPSED_5S / 1000 / SEQ_5
			const expected = 1 - avg_s * 0.1
			expect(score.calculate_time_coefficient(ELAPSED_5S, SEQ_5)).toBeCloseTo(expected, 5)
		})

		it('returns MIN_TIME_COEFF (0.1) when avg seconds is very large', () => {
			expect(score.calculate_time_coefficient(ELAPSED_100S, SEQ_1)).toBe(0.1)
		})

		it('normalizes by sequence length so longer rounds are not unfairly penalized', () => {
			const coeff_short = score.calculate_time_coefficient(ELAPSED_5S, SEQ_1)
			const coeff_long = score.calculate_time_coefficient(ELAPSED_5S * SEQ_5, SEQ_5)
			expect(coeff_short).toBeCloseTo(coeff_long, 5)
		})
	})

	describe('calculate_round_score', () => {
		it('returns BASE_SCORE * round for zero elapsed time', () => {
			expect(score.calculate_round_score(ELAPSED_0, SEQ_1, ROUND_1)).toBe(1_000)
			expect(score.calculate_round_score(ELAPSED_0, SEQ_5, ROUND_5)).toBe(5_000)
		})

		it('scales with round number', () => {
			const r1 = score.calculate_round_score(ELAPSED_0, ROUND_1, ROUND_1)
			const r5 = score.calculate_round_score(ELAPSED_0, ROUND_5, ROUND_5)
			expect(r5).toBe(r1 * ROUND_5)
		})

		it('produces a lower score for slower responses', () => {
			const fast = score.calculate_round_score(ELAPSED_0, SEQ_1, ROUND_1)
			const slow = score.calculate_round_score(ELAPSED_10S, SEQ_1, ROUND_1)
			expect(slow).toBeLessThan(fast)
		})

		it('floors at 10% of BASE_SCORE * round for very slow responses', () => {
			const floor_score = score.calculate_round_score(ELAPSED_100S, SEQ_1, ROUND_5)
			expect(floor_score).toBe(500)
		})
	})

	describe('format_score', () => {
		it('formats numbers below 1000 without comma', () => {
			expect(score.format_score(999)).toBe('999')
		})

		it('formats numbers at 1000 with comma', () => {
			expect(score.format_score(1_000)).toBe('1,000')
		})

		it('formats large numbers with multiple commas', () => {
			expect(score.format_score(1_234_567)).toBe('1,234,567')
		})

		it('formats zero', () => {
			expect(score.format_score(0)).toBe('0')
		})
	})

	describe('add_round_score', () => {
		it('accumulates current_score after each round', () => {
			score.add_round_score(ELAPSED_0, SEQ_1, ROUND_1)
			expect(score.current_score).toBe(1_000)
			score.add_round_score(ELAPSED_0, SEQ_1, ROUND_1)
			expect(score.current_score).toBe(2_000)
		})

		it('updates high_score when current_score exceeds it', () => {
			const prev_high = score.high_score
			score.add_round_score(ELAPSED_0, SEQ_1, prev_high + 2)
			expect(score.high_score).toBeGreaterThan(prev_high)
			expect(score.high_score).toBe(score.current_score)
		})

		it('does not update high_score when current_score stays below it', () => {
			const prev_high = score.high_score
			score.add_round_score(ELAPSED_0, SEQ_1, prev_high + 2)
			const established = score.high_score
			score.reset()
			score.add_round_score(ELAPSED_100S, SEQ_1, ROUND_1)
			expect(score.high_score).toBe(established)
		})

		it('sets is_new_high_score to true when current_score exceeds high_score', () => {
			expect(score.is_new_high_score).toBe(false)
			const prev_high = score.high_score
			score.add_round_score(ELAPSED_0, SEQ_1, prev_high + 2)
			expect(score.is_new_high_score).toBe(true)
		})
	})

	describe('reset', () => {
		it('resets current_score to 0', () => {
			score.add_round_score(ELAPSED_0, SEQ_1, ROUND_1)
			score.reset()
			expect(score.current_score).toBe(0)
		})

		it('resets is_new_high_score to false', () => {
			const prev_high = score.high_score
			score.add_round_score(ELAPSED_0, SEQ_1, prev_high + 2)
			expect(score.is_new_high_score).toBe(true)
			score.reset()
			expect(score.is_new_high_score).toBe(false)
		})

		it('preserves high_score across reset', () => {
			const prev_high = score.high_score
			score.add_round_score(ELAPSED_0, SEQ_1, prev_high + 2)
			const new_high = score.high_score
			score.reset()
			expect(score.high_score).toBe(new_high)
		})
	})

	describe('last_cleared_round', () => {
		it('starts at 0', () => {
			expect(score.last_cleared_round).toBe(0)
		})

		it('is set to the round passed to add_round_score', () => {
			score.add_round_score(ELAPSED_0, SEQ_1, ROUND_5)
			expect(score.last_cleared_round).toBe(ROUND_5)
		})

		it('is reset to 0 by reset()', () => {
			score.add_round_score(ELAPSED_0, SEQ_1, ROUND_5)
			score.reset()
			expect(score.last_cleared_round).toBe(0)
		})
	})

	describe('high_score_round', () => {
		it('is updated to the round when a new high score is set', () => {
			const prev_high = score.high_score
			score.add_round_score(ELAPSED_0, SEQ_1, prev_high + 2)
			expect(score.high_score_round).toBe(prev_high + 2)
		})

		it('is preserved across reset', () => {
			const prev_high = score.high_score
			score.add_round_score(ELAPSED_0, SEQ_1, prev_high + 2)
			const expected_round = prev_high + 2
			score.reset()
			expect(score.high_score_round).toBe(expected_round)
		})

		it('is not updated when current score stays below high score', () => {
			const prev_high = score.high_score
			score.add_round_score(ELAPSED_0, SEQ_1, prev_high + 5)
			const saved_round = score.high_score_round
			score.reset()
			score.add_round_score(ELAPSED_100S, SEQ_1, ROUND_1)
			expect(score.high_score_round).toBe(saved_round)
		})
	})
})

describe('compute_check', () => {
	it('returns a non-zero value for (0, 0)', () => {
		expect(compute_check(0, 0)).not.toBe(0)
	})

	it('is deterministic — same inputs produce same output', () => {
		expect(compute_check(1_000, 3)).toBe(compute_check(1_000, 3))
	})

	it('produces different values when score differs', () => {
		expect(compute_check(1_000, 3)).not.toBe(compute_check(2_000, 3))
	})

	it('produces different values when round differs', () => {
		expect(compute_check(1_000, 3)).not.toBe(compute_check(1_000, 4))
	})
})

describe('load_stored_data', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('returns {score: 0, round: 0} when nothing is stored', () => {
		vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} })
		expect(load_stored_data(DEFAULT_KEYS)).toEqual({ score: 0, round: 0 })
	})

	it('returns correct values when data is valid', () => {
		const stored_score = 5_000
		const stored_round = 3
		const stored_check = compute_check(stored_score, stored_round)
		vi.stubGlobal('localStorage', {
			getItem: (key: string) => {
				if (key === DEFAULT_KEYS.score) return String(stored_score)
				if (key === DEFAULT_KEYS.round) return String(stored_round)
				if (key === DEFAULT_KEYS.check) return String(stored_check)
				return null
			},
			setItem: () => {},
		})
		expect(load_stored_data(DEFAULT_KEYS)).toEqual({ score: stored_score, round: stored_round })
	})

	it('returns {score: 0, round: 0} when check digit does not match (tampered)', () => {
		vi.stubGlobal('localStorage', {
			getItem: (key: string) => {
				if (key === DEFAULT_KEYS.score) return '5000'
				if (key === DEFAULT_KEYS.round) return '3'
				if (key === DEFAULT_KEYS.check) return '99999'
				return null
			},
			setItem: () => {},
		})
		expect(load_stored_data(DEFAULT_KEYS)).toEqual({ score: 0, round: 0 })
	})

	it('returns {score: 0, round: 0} when localStorage throws', () => {
		vi.stubGlobal('localStorage', {
			getItem: () => {
				throw new Error('unavailable')
			},
		})
		expect(load_stored_data(DEFAULT_KEYS)).toEqual({ score: 0, round: 0 })
	})

	it('uses keys from the provided StorageKeys object', () => {
		const custom_keys: StorageKeys = { score: 'test_s', round: 'test_r', check: 'test_c' }
		const stored_score = 1_000
		const stored_round = 1
		const stored_check = compute_check(stored_score, stored_round)
		vi.stubGlobal('localStorage', {
			getItem: (key: string) => {
				if (key === custom_keys.score) return String(stored_score)
				if (key === custom_keys.round) return String(stored_round)
				if (key === custom_keys.check) return String(stored_check)
				return null
			},
			setItem: () => {},
		})
		expect(load_stored_data(custom_keys)).toEqual({ score: stored_score, round: stored_round })
	})
})

describe('create_score isolation', () => {
	it('two instances do not share current_score state', () => {
		const a = create_score()
		const b = create_score()
		a.add_round_score(ELAPSED_0, SEQ_1, ROUND_1)
		expect(a.current_score).toBeGreaterThan(0)
		expect(b.current_score).toBe(0)
	})

	it('custom key prefix stores to different keys than default', () => {
		const custom = create_score('test')
		vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} })
		expect(custom.high_score).toBe(0)
		vi.unstubAllGlobals()
	})
})
