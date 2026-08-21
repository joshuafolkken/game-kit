import { describe, expect, it } from 'vitest'
import { camera_fov } from './camera-fov'

const BASE_FOV = 75
const HALF_DIVISOR = 2
const DEG_PER_RAD = 180 / Math.PI

// Horizontal FOV (degrees) for a given vertical FOV and aspect, per the Three.js frustum:
// hfov = 2 * atan(tan(vfov / 2) * aspect).
function horizontal_fov_deg(vertical_fov_deg: number, aspect: number): number {
	const vertical_half_tan = Math.tan(vertical_fov_deg / HALF_DIVISOR / DEG_PER_RAD)

	return Math.atan(vertical_half_tan * aspect) * HALF_DIVISOR * DEG_PER_RAD
}

describe('camera_fov.compute_vertical_fov', () => {
	it('returns the base FOV unchanged in landscape (aspect > 1)', () => {
		const WIDE_ASPECT = 16 / 9

		expect(camera_fov.compute_vertical_fov(BASE_FOV, WIDE_ASPECT)).toBe(BASE_FOV)
	})

	it('returns the base FOV unchanged at the square boundary (aspect = 1)', () => {
		expect(camera_fov.compute_vertical_fov(BASE_FOV, 1)).toBe(BASE_FOV)
	})

	it('widens the vertical FOV on portrait (aspect < 1)', () => {
		const PORTRAIT_ASPECT = 390 / 844

		expect(camera_fov.compute_vertical_fov(BASE_FOV, PORTRAIT_ASPECT)).toBeGreaterThan(BASE_FOV)
	})

	it('preserves the landscape horizontal FOV on a portrait viewport', () => {
		const PORTRAIT_ASPECT = 3 / 4
		// The design horizontal FOV equals the base FOV at aspect = 1 (hfov = vfov there).
		const design_horizontal_fov = horizontal_fov_deg(BASE_FOV, 1)
		const vertical_fov = camera_fov.compute_vertical_fov(BASE_FOV, PORTRAIT_ASPECT)

		expect(horizontal_fov_deg(vertical_fov, PORTRAIT_ASPECT)).toBeCloseTo(design_horizontal_fov, 6)
	})

	it('clamps the widened vertical FOV to the safe maximum for extreme portraits', () => {
		const EXTREME_ASPECT = 0.1

		expect(camera_fov.compute_vertical_fov(BASE_FOV, EXTREME_ASPECT)).toBe(
			camera_fov.MAX_VERTICAL_FOV_DEG,
		)
	})

	it('stays finite (never NaN) for a degenerate zero-width aspect', () => {
		const result = camera_fov.compute_vertical_fov(BASE_FOV, 0)

		expect(Number.isFinite(result)).toBe(true)
		expect(result).toBe(camera_fov.MAX_VERTICAL_FOV_DEG)
	})

	it('returns the base FOV for a NaN aspect (0x0 canvas at initial mount)', () => {
		expect(camera_fov.compute_vertical_fov(BASE_FOV, NaN)).toBe(BASE_FOV)
	})
})

// The controls-plane view height at the base FOV, as ControlsScene measures it.
const CONTROLS_PLANE_HEIGHT = 2.45
const PRECISION = 6

describe('camera_fov.compute_view_width_at_plane', () => {
	it('exposes the base FOV so no consumer has to repeat the literal', () => {
		expect(camera_fov.BASE_FOV_DEG).toBe(BASE_FOV)
	})

	it('is height * aspect in landscape, exactly as a fixed vertical FOV would give', () => {
		const WIDE_ASPECT = 16 / 9

		expect(camera_fov.compute_view_width_at_plane(CONTROLS_PLANE_HEIGHT, WIDE_ASPECT)).toBeCloseTo(
			CONTROLS_PLANE_HEIGHT * WIDE_ASPECT,
			PRECISION,
		)
	})

	it('is unchanged at the square boundary, where the portrait rule starts', () => {
		expect(camera_fov.compute_view_width_at_plane(CONTROLS_PLANE_HEIGHT, 1)).toBeCloseTo(
			CONTROLS_PLANE_HEIGHT,
			PRECISION,
		)
	})

	// This is the property game-kit#412 turned on: holding the horizontal FOV constant means the
	// view width at any plane stops moving once the viewport goes portrait. Reporting
	// height * aspect here instead under-reported it by the aspect ratio.
	it('holds the width constant across portrait aspects above the FOV cap', () => {
		const SQUARE_WIDTH = camera_fov.compute_view_width_at_plane(CONTROLS_PLANE_HEIGHT, 1)

		for (const aspect of [0.9, 0.75, 0.6, 0.5, 0.45]) {
			expect(camera_fov.compute_view_width_at_plane(CONTROLS_PLANE_HEIGHT, aspect)).toBeCloseTo(
				SQUARE_WIDTH,
				PRECISION,
			)
		}
	})

	it('starts shrinking again once the vertical FOV hits its cap', () => {
		// Past the cap the vertical FOV can no longer widen, so the horizontal FOV — and with it the
		// width — falls with the aspect again. Without this the panel would be sized for a view
		// wider than the camera actually shows on an extremely tall viewport.
		const SQUARE_WIDTH = camera_fov.compute_view_width_at_plane(CONTROLS_PLANE_HEIGHT, 1)
		const CAPPED = camera_fov.compute_view_width_at_plane(CONTROLS_PLANE_HEIGHT, 0.3)
		const NARROWER = camera_fov.compute_view_width_at_plane(CONTROLS_PLANE_HEIGHT, 0.2)

		expect(CAPPED).toBeLessThan(SQUARE_WIDTH)
		expect(NARROWER).toBeLessThan(CAPPED)
	})

	it('never reports a wider view than the camera shows at the capped FOV', () => {
		const NARROW_ASPECT = 0.25
		const capped_half_tan = Math.tan(camera_fov.MAX_VERTICAL_FOV_DEG / HALF_DIVISOR / DEG_PER_RAD)
		const base_half_tan = Math.tan(BASE_FOV / HALF_DIVISOR / DEG_PER_RAD)

		expect(
			camera_fov.compute_view_width_at_plane(CONTROLS_PLANE_HEIGHT, NARROW_ASPECT),
		).toBeCloseTo(
			(CONTROLS_PLANE_HEIGHT * capped_half_tan * NARROW_ASPECT) / base_half_tan,
			PRECISION,
		)
	})
})
