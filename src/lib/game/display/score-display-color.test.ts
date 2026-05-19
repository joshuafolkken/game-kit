import { describe, expect, it } from 'vitest'
import { get_hi_value_color } from './score-display-color.js'
import {
	CYBER_NEW_HIGH_COLOR,
	HI_BASE_COLOR,
	RETRO_NEW_HIGH_COLOR,
} from './score-display-config.js'

describe('get_hi_value_color', () => {
	it('returns HI_BASE_COLOR when not a new high score (retro mode)', () => {
		expect(get_hi_value_color(false, false)).toBe(HI_BASE_COLOR)
	})

	it('returns HI_BASE_COLOR when not a new high score (cyber mode)', () => {
		expect(get_hi_value_color(true, false)).toBe(HI_BASE_COLOR)
	})

	it('returns RETRO_NEW_HIGH_COLOR for new high in retro mode (is_alt false)', () => {
		expect(get_hi_value_color(false, true)).toBe(RETRO_NEW_HIGH_COLOR)
	})

	it('returns CYBER_NEW_HIGH_COLOR for new high in cyber mode (is_alt true)', () => {
		expect(get_hi_value_color(true, true)).toBe(CYBER_NEW_HIGH_COLOR)
	})

	it('mode flag is ignored when is_new_high_score is false', () => {
		expect(get_hi_value_color(true, false)).toBe(get_hi_value_color(false, false))
	})

	it('mode flag selects a different color when is_new_high_score is true', () => {
		expect(get_hi_value_color(true, true)).not.toBe(get_hi_value_color(false, true))
	})
})
