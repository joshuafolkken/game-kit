import { describe, expect, it } from 'vitest'
import { crt_resize, type CrtSizeSignature } from './crt-resize'

const BASE: CrtSizeSignature = {
	width: 1440,
	height: 900,
	dpr: 1,
	lo_dpr: 0.3,
	buffer_width: 1440,
	buffer_height: 900,
}

function signature(overrides: Partial<CrtSizeSignature>): CrtSizeSignature {
	return { ...BASE, ...overrides }
}

describe('crt_resize.create_size_gate', () => {
	it('reports a change on the first call, with the low-res pixel ratio treated as new', () => {
		const gate = crt_resize.create_size_gate()

		expect(gate.resolve_change(BASE)).toEqual({ is_lo_dpr_changed: true })
	})

	it('reports no change while the signature stays the same across frames', () => {
		const gate = crt_resize.create_size_gate()

		gate.resolve_change(BASE)

		expect(gate.resolve_change(BASE)).toBeUndefined()
		expect(gate.resolve_change(signature({}))).toBeUndefined()
	})

	it('reports a change when the viewport resizes, without re-applying the pixel ratio', () => {
		const gate = crt_resize.create_size_gate()

		gate.resolve_change(BASE)

		expect(gate.resolve_change(signature({ width: 1441 }))).toEqual({ is_lo_dpr_changed: false })
		expect(gate.resolve_change(signature({ width: 1441, height: 901 }))).toEqual({
			is_lo_dpr_changed: false,
		})
	})

	// A device pixel ratio change still re-opens the gate — stage 2 reads the drawing buffer into
	// its uniforms — but it no longer carries a flag of its own, because no composer re-scales (#421).
	it('flags the low-res pixel ratio only when it moved, and still re-opens on a dpr change', () => {
		const gate = crt_resize.create_size_gate()

		gate.resolve_change(BASE)

		expect(gate.resolve_change(signature({ dpr: 2 }))).toEqual({ is_lo_dpr_changed: false })
		expect(gate.resolve_change(signature({ dpr: 2, lo_dpr: 0.5 }))).toEqual({
			is_lo_dpr_changed: true,
		})
	})

	it('reports a change when only the drawing buffer moved, leaving the ratio untouched', () => {
		const gate = crt_resize.create_size_gate()

		gate.resolve_change(BASE)

		expect(gate.resolve_change(signature({ buffer_width: 2880, buffer_height: 1800 }))).toEqual({
			is_lo_dpr_changed: false,
		})
	})

	it('compares against the last applied signature only, so a returning size re-applies', () => {
		const gate = crt_resize.create_size_gate()

		gate.resolve_change(BASE)
		gate.resolve_change(signature({ width: 800 }))

		expect(gate.resolve_change(BASE)).toBeDefined()
	})

	it('keeps gates independent of each other', () => {
		const first = crt_resize.create_size_gate()
		const second = crt_resize.create_size_gate()

		first.resolve_change(BASE)

		expect(second.resolve_change(BASE)).toBeDefined()
	})
})

describe('crt_resize.compute_lo_size', () => {
	it('scales the viewport by the low-resolution ratio and floors both dimensions', () => {
		expect(crt_resize.compute_lo_size(1440, 900, 0.3)).toEqual({ width: 432, height: 270 })
		expect(crt_resize.compute_lo_size(1441, 901, 0.3)).toEqual({ width: 432, height: 270 })
	})

	it('clamps both dimensions to at least 1 on a zero or tiny viewport', () => {
		expect(crt_resize.compute_lo_size(0, 0, 0.3)).toEqual({ width: 1, height: 1 })
		expect(crt_resize.compute_lo_size(2, 2, 0.3)).toEqual({ width: 1, height: 1 })
	})

	it('is an identity at a ratio of 1', () => {
		expect(crt_resize.compute_lo_size(390, 844, 1)).toEqual({ width: 390, height: 844 })
	})
})
