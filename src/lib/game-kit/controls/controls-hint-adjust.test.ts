import { describe, expect, it } from 'vitest'
import { controls_hint_adjust } from './controls-hint-adjust'

const DEFAULT_SCALE = 1
const DEFAULT_OFFSET = 0
const HINT_FONT_SIZE = 0.13
const LETTER_FONT_SIZE = 0.118

describe('controls_hint_adjust.scale_font_size', () => {
	it('returns the base size unchanged at the default scale of 1', () => {
		expect(controls_hint_adjust.scale_font_size(HINT_FONT_SIZE, DEFAULT_SCALE)).toBe(HINT_FONT_SIZE)
	})

	it('multiplies the base size by the scale for an upscaling font (waneccha ~1.46)', () => {
		const UPSCALE = 1.46

		expect(controls_hint_adjust.scale_font_size(HINT_FONT_SIZE, UPSCALE)).toBeCloseTo(
			HINT_FONT_SIZE * UPSCALE,
			10,
		)
	})

	it('shrinks the base size for a scale below 1', () => {
		const DOWNSCALE = 0.5

		expect(controls_hint_adjust.scale_font_size(HINT_FONT_SIZE, DOWNSCALE)).toBeCloseTo(0.065, 10)
	})

	it('scales any base size proportionally so hint and letters keep their relative sizes', () => {
		const SCALE = 2

		expect(controls_hint_adjust.scale_font_size(LETTER_FONT_SIZE, SCALE)).toBeCloseTo(
			LETTER_FONT_SIZE * SCALE,
			10,
		)
	})
})

describe('controls_hint_adjust.offset_position_y', () => {
	it('returns the base y unchanged at the default offset of 0', () => {
		const BASE_Y = 0.42

		expect(controls_hint_adjust.offset_position_y(BASE_Y, DEFAULT_OFFSET, HINT_FONT_SIZE)).toBe(
			BASE_Y,
		)
	})

	it('adds offset × fontSize (positive offset nudges up in three.js y-up space)', () => {
		const OFFSET = 0.1

		expect(controls_hint_adjust.offset_position_y(0, OFFSET, HINT_FONT_SIZE)).toBeCloseTo(
			OFFSET * HINT_FONT_SIZE,
			10,
		)
	})

	it('subtracts for a negative offset (shift down to re-center a top-heavy face)', () => {
		const OFFSET = -0.15
		const BASE_Y = 0.5

		expect(controls_hint_adjust.offset_position_y(BASE_Y, OFFSET, HINT_FONT_SIZE)).toBeCloseTo(
			BASE_Y + OFFSET * HINT_FONT_SIZE,
			10,
		)
	})

	it('scales the nudge with each fontSize so one em-offset re-centers hint and letters alike', () => {
		const OFFSET = -0.1
		const hint_nudge = controls_hint_adjust.offset_position_y(0, OFFSET, HINT_FONT_SIZE)
		const letter_nudge = controls_hint_adjust.offset_position_y(0, OFFSET, LETTER_FONT_SIZE)

		// The em-relative nudge is a constant fraction of each fontSize.
		expect(hint_nudge / HINT_FONT_SIZE).toBeCloseTo(letter_nudge / LETTER_FONT_SIZE, 10)
	})
})
