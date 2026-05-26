import { describe, expect, it } from 'vitest'
import { compute_pixel_dpr } from './pixel-dpr'

const TARGET_SHORT = 360
const MIN_SHORT = 120
const MAX_DPR = 1
const FALLBACK = 1 / 3

describe('compute_pixel_dpr — SHORTER-based target with SHORTER-based floor', () => {
	it('hits target_short pixels on the shorter buffer edge when viewport is large enough', () => {
		const viewport_w = 1600
		const viewport_h = 900
		const dpr = compute_pixel_dpr(
			viewport_w,
			viewport_h,
			TARGET_SHORT,
			MIN_SHORT,
			MAX_DPR,
			FALLBACK,
		)
		const shorter = Math.min(viewport_w, viewport_h)
		const buffer_short = shorter * dpr

		expect(buffer_short).toBeCloseTo(TARGET_SHORT, 6)
	})

	it('caps DPR at max_dpr when target would require upscaling beyond max_dpr', () => {
		const small_short = TARGET_SHORT / 2
		const viewport_w = small_short
		const viewport_h = small_short * 2
		const dpr = compute_pixel_dpr(
			viewport_w,
			viewport_h,
			TARGET_SHORT,
			MIN_SHORT,
			MAX_DPR,
			FALLBACK,
		)

		expect(dpr).toBe(MAX_DPR)
	})

	it('overrides max_dpr cap to enforce min_short when viewport is very small', () => {
		const tiny_short = MIN_SHORT / 2
		const viewport_w = tiny_short
		const viewport_h = tiny_short * 2
		const dpr = compute_pixel_dpr(
			viewport_w,
			viewport_h,
			TARGET_SHORT,
			MIN_SHORT,
			MAX_DPR,
			FALLBACK,
		)

		expect(dpr).toBeGreaterThan(MAX_DPR)
		const buffer_short = Math.min(viewport_w, viewport_h) * dpr

		expect(buffer_short).toBeCloseTo(MIN_SHORT, 6)
	})

	it('keeps the shorter buffer edge >= min_short for every viewport tested', () => {
		const cases = [
			{ w: 1600, h: 900 },
			{ w: 800, h: 800 },
			{ w: 700, h: 1100 },
			{ w: 500, h: 1000 },
			{ w: 200, h: 400 },
			{ w: 80, h: 160 },
		]

		for (const { w, h } of cases) {
			const dpr = compute_pixel_dpr(w, h, TARGET_SHORT, MIN_SHORT, MAX_DPR, FALLBACK)
			const shorter_buffer = Math.min(w, h) * dpr

			expect(shorter_buffer).toBeGreaterThanOrEqual(MIN_SHORT - 1e-9)
		}
	})

	it('handles portrait orientation correctly (shorter = width)', () => {
		const viewport_w = 700
		const viewport_h = 1100
		const dpr = compute_pixel_dpr(
			viewport_w,
			viewport_h,
			TARGET_SHORT,
			MIN_SHORT,
			MAX_DPR,
			FALLBACK,
		)

		expect(dpr).toBeCloseTo(TARGET_SHORT / viewport_w, 10)
	})

	it('returns fallback when shorter dimension is 0 (mount-time safety)', () => {
		expect(compute_pixel_dpr(0, 100, TARGET_SHORT, MIN_SHORT, MAX_DPR, FALLBACK)).toBe(FALLBACK)
		expect(compute_pixel_dpr(100, 0, TARGET_SHORT, MIN_SHORT, MAX_DPR, FALLBACK)).toBe(FALLBACK)
		expect(compute_pixel_dpr(0, 0, TARGET_SHORT, MIN_SHORT, MAX_DPR, FALLBACK)).toBe(FALLBACK)
	})

	it('returns fallback when a viewport dimension is negative (degenerate input)', () => {
		expect(compute_pixel_dpr(-100, 800, TARGET_SHORT, MIN_SHORT, MAX_DPR, FALLBACK)).toBe(FALLBACK)
	})
})
