import { describe, expect, it } from 'vitest'
import {
	CREDITS_CYBER_COLOR,
	CREDITS_FONT_SIZE,
	CREDITS_GLOW_BLUR,
	CREDITS_GLOW_OPACITY,
	CREDITS_LINE_HEIGHT,
	CREDITS_NORMAL_COLOR,
	CREDITS_POSITION_Y,
	credits_scroll,
	CREDITS_SCROLL_SPEED,
	FLOOR_TEXT_ROTATION_X,
} from './credits-config'

const TEST_HALF_DEPTH = 5

describe('credits-config', () => {
	it('FLOOR_TEXT_ROTATION_X is -PI/2', () => {
		expect(FLOOR_TEXT_ROTATION_X).toBeCloseTo(-Math.PI / 2)
	})

	it('CREDITS_POSITION_Y is a small positive value above the floor', () => {
		expect(CREDITS_POSITION_Y).toBeGreaterThan(0)
		expect(CREDITS_POSITION_Y).toBeLessThan(0.1)
	})

	it('CREDITS_FONT_SIZE is a positive number', () => {
		expect(CREDITS_FONT_SIZE).toBeGreaterThan(0)
	})

	it('CREDITS_LINE_HEIGHT is greater than 1', () => {
		expect(CREDITS_LINE_HEIGHT).toBeGreaterThan(1)
	})

	it('CREDITS_NORMAL_COLOR is a valid hex color', () => {
		expect(CREDITS_NORMAL_COLOR).toMatch(/^#[0-9a-fA-F]{6}$/)
	})

	it('CREDITS_CYBER_COLOR is a valid hex color', () => {
		expect(CREDITS_CYBER_COLOR).toMatch(/^#[0-9a-fA-F]{6}$/)
	})

	it('CREDITS_NORMAL_COLOR and CREDITS_CYBER_COLOR are distinct', () => {
		expect(CREDITS_NORMAL_COLOR).not.toBe(CREDITS_CYBER_COLOR)
	})

	it('CREDITS_SCROLL_SPEED is a positive number', () => {
		expect(CREDITS_SCROLL_SPEED).toBeGreaterThan(0)
	})

	it('CREDITS_GLOW_BLUR is a non-empty string', () => {
		expect(typeof CREDITS_GLOW_BLUR).toBe('string')
		expect(CREDITS_GLOW_BLUR.length).toBeGreaterThan(0)
	})

	it('CREDITS_GLOW_OPACITY is between 0 and 1', () => {
		expect(CREDITS_GLOW_OPACITY).toBeGreaterThan(0)
		expect(CREDITS_GLOW_OPACITY).toBeLessThanOrEqual(1)
	})

	describe('make_credits_scroll_bounds', () => {
		it('start_z is positive', () => {
			const { start_z } = credits_scroll.make_credits_scroll_bounds(10, TEST_HALF_DEPTH)
			expect(start_z).toBeGreaterThan(0)
		})

		it('end_z is negative', () => {
			const { end_z } = credits_scroll.make_credits_scroll_bounds(10, TEST_HALF_DEPTH)
			expect(end_z).toBeLessThan(0)
		})

		it('start_z and end_z are symmetric around zero', () => {
			const { start_z, end_z } = credits_scroll.make_credits_scroll_bounds(10, TEST_HALF_DEPTH)
			expect(start_z).toBeCloseTo(-end_z)
		})

		it('start_z increases as line_count increases', () => {
			const small = credits_scroll.make_credits_scroll_bounds(10, TEST_HALF_DEPTH)
			const large = credits_scroll.make_credits_scroll_bounds(100, TEST_HALF_DEPTH)
			expect(large.start_z).toBeGreaterThan(small.start_z)
		})

		it('start_z increases as half_depth increases', () => {
			const shallow = credits_scroll.make_credits_scroll_bounds(10, 1)
			const deep = credits_scroll.make_credits_scroll_bounds(10, 10)
			expect(deep.start_z).toBeGreaterThan(shallow.start_z)
		})
	})

	describe('advance_scroll', () => {
		const FRAME_DELTA = 0.016
		const START_Z = 10
		const END_Z = -10

		it('moves z in the negative direction by speed times delta', () => {
			const initial_z = 5
			const result = credits_scroll.advance_scroll(
				initial_z,
				FRAME_DELTA,
				START_Z,
				END_Z,
				CREDITS_SCROLL_SPEED,
			)
			expect(result).toBeCloseTo(initial_z - CREDITS_SCROLL_SPEED * FRAME_DELTA)
		})

		it('resets to start_z when z drops below end_z', () => {
			const past_end = END_Z - 0.1
			expect(credits_scroll.advance_scroll(past_end, 0, START_Z, END_Z, CREDITS_SCROLL_SPEED)).toBe(
				START_Z,
			)
		})

		it('does not reset when z equals end_z exactly', () => {
			expect(credits_scroll.advance_scroll(END_Z, 0, START_Z, END_Z, CREDITS_SCROLL_SPEED)).toBe(
				END_Z,
			)
		})

		it('continues scrolling when z is above end_z', () => {
			const z = 0
			const result = credits_scroll.advance_scroll(z, 1, START_Z, END_Z, CREDITS_SCROLL_SPEED)
			expect(result).toBeLessThan(z)
			expect(result).not.toBe(START_Z)
		})

		it('uses the provided speed parameter', () => {
			const initial_z = 5
			const slow = credits_scroll.advance_scroll(initial_z, FRAME_DELTA, START_Z, END_Z, 0.1)
			const fast = credits_scroll.advance_scroll(initial_z, FRAME_DELTA, START_Z, END_Z, 1)
			expect(fast).toBeLessThan(slow)
		})
	})
})
