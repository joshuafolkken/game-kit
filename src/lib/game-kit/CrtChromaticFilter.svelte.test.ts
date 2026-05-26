import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-svelte'
import CrtChromaticFilter from './CrtChromaticFilter.svelte'
import CRT_CHROMATIC_FILTER_SOURCE from './CrtChromaticFilter.svelte?raw'

describe('CrtChromaticFilter.svelte — SVG defs structure', () => {
	it('declares an SVG <filter id="crt-chromatic"> in the markup', () => {
		expect(CRT_CHROMATIC_FILTER_SOURCE).toMatch(/<filter\s+id="crt-chromatic"/u)
	})

	it('isolates R / G / B with three feColorMatrix nodes and offsets R + B (G unchanged)', () => {
		// Reason: chromatic aberration here is per-channel translation. Three matrices
		// (one per channel) and exactly two feOffset nodes (R outward, B opposite) is
		// the structural shape of the effect — one matrix or one offset would mean a
		// regression to a single-channel tint or to a uniform shift.
		const color_matrix_count = (CRT_CHROMATIC_FILTER_SOURCE.match(/<feColorMatrix\b/gu) ?? [])
			.length
		const offset_count = (CRT_CHROMATIC_FILTER_SOURCE.match(/<feOffset\b/gu) ?? []).length
		const REQUIRED_CHANNEL_MATRICES = 3
		const REQUIRED_OFFSETS = 2
		expect(color_matrix_count).toBe(REQUIRED_CHANNEL_MATRICES)
		expect(offset_count).toBe(REQUIRED_OFFSETS)
	})

	it('offsets R and B by opposite-sign equal-magnitude dx, both with dy="0" (horizontal split)', () => {
		// Reason: dx magnitude is a visual tuning value that gets iterated during
		// CRT polish (1 = subtle, 2-3 = X68000, 4+ = VHS / glitch). Pinning a specific
		// value locks the test to one aesthetic and forces a test edit every time we
		// retune. The structural property — R and B offset in opposite directions by
		// the same horizontal amount — is what actually defines the effect, so assert
		// that instead.
		const r_match = CRT_CHROMATIC_FILTER_SOURCE.match(
			/<feOffset[^>]*\sin="r_only"[^>]*\sdx="(-?\d+(?:\.\d+)?)"[^>]*\sdy="0"/u,
		)
		const b_match = CRT_CHROMATIC_FILTER_SOURCE.match(
			/<feOffset[^>]*\sin="b_only"[^>]*\sdx="(-?\d+(?:\.\d+)?)"[^>]*\sdy="0"/u,
		)
		expect(r_match).toBeTruthy()
		expect(b_match).toBeTruthy()
		const r_dx_str = r_match?.[1]
		const b_dx_str = b_match?.[1]
		expect(r_dx_str).toBeDefined()
		expect(b_dx_str).toBeDefined()
		if (r_dx_str === undefined || b_dx_str === undefined) return
		const r_dx = parseFloat(r_dx_str)
		const b_dx = parseFloat(b_dx_str)
		expect(r_dx).not.toBe(0)
		expect(r_dx).toBe(-b_dx)
	})

	it('composites the three channels back together with two arithmetic feComposite nodes', () => {
		// Reason: feComposite operator="arithmetic" with k2=1 k3=1 is additive blending —
		// the only mode that re-merges channel-isolated layers without losing information
		// (default `over` would let the top layer's transparent pixels punch holes).
		const composite_count = (
			CRT_CHROMATIC_FILTER_SOURCE.match(/<feComposite[^>]*operator="arithmetic"/gu) ?? []
		).length
		const REQUIRED_COMPOSITES = 2
		expect(composite_count).toBe(REQUIRED_COMPOSITES)
		expect(CRT_CHROMATIC_FILTER_SOURCE).toMatch(/k1="0"\s+k2="1"\s+k3="1"\s+k4="0"/u)
	})

	it('renders the SVG <filter id="crt-chromatic"> into the DOM when mounted standalone', () => {
		const { container } = render(CrtChromaticFilter)
		const filter = container.querySelector('#crt-chromatic')
		expect(filter).toBeTruthy()
		expect(filter?.tagName.toLowerCase()).toBe('filter')
	})
})
