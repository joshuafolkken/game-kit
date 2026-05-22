import { describe, expect, it } from 'vitest'
import { compute_fit_scale } from './controls-fit'

const MIN_PADDING = 0.275
const NATURAL_SPAN = 2.24
const SIDES = 2

describe('compute_fit_scale', () => {
	it('returns 1 when natural span plus required padding fits in view width', () => {
		const wide_view_width = NATURAL_SPAN + SIDES * MIN_PADDING + 10
		expect(compute_fit_scale(wide_view_width, NATURAL_SPAN, MIN_PADDING)).toBe(1)
	})

	it('returns 1 exactly when view_width equals natural_span plus required padding', () => {
		const exact_view = NATURAL_SPAN + SIDES * MIN_PADDING
		expect(compute_fit_scale(exact_view, NATURAL_SPAN, MIN_PADDING)).toBeCloseTo(1, 10)
	})

	it('shrinks proportionally so resulting side padding equals min_side_padding when constrained', () => {
		const constrained_view = NATURAL_SPAN
		const scale = compute_fit_scale(constrained_view, NATURAL_SPAN, MIN_PADDING)
		const resulting_side_padding = (constrained_view - NATURAL_SPAN * scale) / SIDES
		expect(resulting_side_padding).toBeCloseTo(MIN_PADDING, 10)
	})

	it('returns 0 when view_width equals 2 × min_side_padding (no room for icons)', () => {
		const tight_view = SIDES * MIN_PADDING
		expect(compute_fit_scale(tight_view, NATURAL_SPAN, MIN_PADDING)).toBe(0)
	})

	it('returns 0 when view_width is less than 2 × min_side_padding', () => {
		const too_tight = SIDES * MIN_PADDING - 0.1
		expect(compute_fit_scale(too_tight, NATURAL_SPAN, MIN_PADDING)).toBe(0)
	})

	it('returns 1 when natural span is 0 (degenerate input) to avoid division by zero', () => {
		const any_view_width = 5
		expect(compute_fit_scale(any_view_width, 0, MIN_PADDING)).toBe(1)
	})

	it('returns 1 when natural span is negative (degenerate input)', () => {
		expect(compute_fit_scale(5, -1, MIN_PADDING)).toBe(1)
	})

	it('treats min_side_padding=0 as the no-padding case (icons can occupy full width)', () => {
		const exact_view = NATURAL_SPAN
		expect(compute_fit_scale(exact_view, NATURAL_SPAN, 0)).toBeCloseTo(1, 10)
	})

	it('always returns a scale where side padding is >= min_side_padding', () => {
		const view_widths_under_test = [1, 1.5, 2, 2.5, 3, 4, 10]
		for (const view_width of view_widths_under_test) {
			const scale = compute_fit_scale(view_width, NATURAL_SPAN, MIN_PADDING)
			const resulting_side_padding = (view_width - NATURAL_SPAN * scale) / SIDES
			const headroom = resulting_side_padding - MIN_PADDING
			expect(headroom).toBeGreaterThanOrEqual(-1e-10)
		}
	})
})
