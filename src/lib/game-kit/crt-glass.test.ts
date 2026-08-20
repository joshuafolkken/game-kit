import { describe, expect, it } from 'vitest'
import {
	CORNER_ALPHA,
	CORNER_STOP,
	crt_glass,
	GLASS_ALPHA,
	GLASS_CENTER_X,
	GLASS_CENTER_Y,
	VIGNETTE_ALPHA,
	VIGNETTE_START,
	type GlassRgb,
	type GlassUv,
} from './crt-glass'

const SIZE = { width: 1280, height: 800 }
const MID_GREY = 0.5
const GREY: GlassRgb = { r: MID_GREY, g: MID_GREY, b: MID_GREY }
const PRECISION = 4

function apply(uv: GlassUv): GlassRgb {
	return crt_glass.apply_glass_cues(GREY, uv, SIZE)
}

// Every expected value below is worked out from the CSS these cues replace, not read back from the
// implementation — that is what makes the suite a reproduction check rather than a snapshot. For a
// 1280x800 box the corner gradients have radius hypot(1280, 800) * 0.38 = 573.5 px and the vignette
// ramps from half the farthest-corner radius to all of it.
describe('crt_glass.apply_glass_cues', () => {
	it('leaves the screen centre completely untouched', () => {
		// Vignette is 0 below its start radius; the nearest corner is 754.6 px away, past the 573.5 px
		// corner radius; and the highlight ellipse's own falloff has run out by 1.18 of its radius.
		const out = apply({ x: 0.5, y: 0.5 })

		expect(out.r).toBeCloseTo(MID_GREY, PRECISION)
		expect(out.g).toBeCloseTo(MID_GREY, PRECISION)
		expect(out.b).toBeCloseTo(MID_GREY, PRECISION)
	})

	it('still applies nothing at 0.35 of the farthest-corner radius, below the vignette start', () => {
		// Pins the vignette's start radius: a point this far out would already be darkened if the
		// ramp began at the centre instead of half way.
		expect(apply({ x: 0.5, y: 0.75 }).r).toBeCloseTo(MID_GREY, PRECISION)
	})

	it('darkens every corner to 0.21 — full vignette then full corner alpha', () => {
		// 0.5 * (1 - 0.3) = 0.35 after the vignette, then 0.35 * (1 - 0.4) = 0.21 from the corner
		// gradient at its own centre. The other three corners are further than 573.5 px, and the
		// highlight does not reach.
		const CORNER_VALUE = 0.21

		for (const corner of [
			{ x: 0, y: 0 },
			{ x: 1, y: 0 },
			{ x: 0, y: 1 },
			{ x: 1, y: 1 },
		]) {
			expect(apply(corner).g).toBeCloseTo(CORNER_VALUE, PRECISION)
		}
	})

	it('puts the white highlight at the CSS ellipse centre, over the darkening beneath it', () => {
		// At (0.28, 0.22): vignette 0.00212, top-left corner 0.12146, highlight 0.06 white on top.
		// 0.5 -> 0.49894 -> 0.43833 -> 0.06 + 0.43833 * 0.94 = 0.47198.
		const HIGHLIGHT_VALUE = 0.47198
		const out = apply({ x: GLASS_CENTER_X, y: GLASS_CENTER_Y })

		expect(out.r).toBeCloseTo(HIGHLIGHT_VALUE, PRECISION)
	})

	it('is brighter at the highlight than at its horizontal mirror, where no highlight falls', () => {
		// The mirrored point has the same vignette and no corner within reach, so the difference is
		// the highlight itself — the cue that would vanish silently if the ellipse were centred.
		const at_highlight = apply({ x: GLASS_CENTER_X, y: GLASS_CENTER_Y })
		const mirrored = apply({ x: 1 - GLASS_CENTER_X, y: GLASS_CENTER_Y })

		expect(at_highlight.r).toBeGreaterThan(mirrored.r)
	})

	it('never pushes a channel outside [0, 1]', () => {
		const STEPS = 11
		const white: GlassRgb = { r: 1, g: 1, b: 1 }

		for (let index = 0; index <= STEPS; index++) {
			const position = index / STEPS
			const out = crt_glass.apply_glass_cues(white, { x: position, y: position }, SIZE)

			expect(Math.min(out.r, out.g, out.b)).toBeGreaterThanOrEqual(0)
			expect(Math.max(out.r, out.g, out.b)).toBeLessThanOrEqual(1)
		}
	})
})

// These pins came over from GameScene.svelte.test.ts with the cues themselves (#422). They record
// tuning decisions whose reasoning is not recoverable from the numbers, so they are worth keeping
// wherever the numbers live.
describe('crt-glass tuning constants', () => {
	it('uses alpha 0.4 for corner darkening, lightened from 0.55 for legibility', () => {
		// The scanline overlay was once bumped to alpha 1 — full-black stripes over half the screen —
		// which flooded the periphery. Corners dropped to 0.4 so the edges stay readable while the
		// curvature illusion still reads. Back to 0.55 is too dark; 0.25 loses the curvature.
		expect(CORNER_ALPHA).toBe(0.4)
	})

	it('uses alpha 0.3 for the centre vignette, lightened from 0.45 for the same reason', () => {
		expect(VIGNETTE_ALPHA).toBe(0.3)
	})

	it('starts the vignette half way to the farthest corner and ends the corners at 0.38', () => {
		// Both are fractions of a farthest-corner radius, matching the CSS gradient stops they came
		// from — not fractions of the box, which would put them in visibly different places.
		expect(VIGNETTE_START).toBe(0.5)
		expect(CORNER_STOP).toBe(0.38)
	})

	it('keeps the glass highlight subtle enough to read as glass rather than fog', () => {
		expect(GLASS_ALPHA).toBe(0.06)
	})

	it('keeps the highlight off-centre, in the upper-left quadrant', () => {
		expect(GLASS_CENTER_X).toBeLessThan(0.5)
		expect(GLASS_CENTER_Y).toBeLessThan(0.5)
	})
})
