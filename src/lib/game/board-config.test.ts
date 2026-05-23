import { describe, expect, it } from 'vitest'
import {
	BACKING_RADIUS,
	BOARD_LABEL_Z,
	BOARD_Y,
	BOARD_Z,
	SCORE_DISPLAY_Z,
	SCORE_DISPLAY_Z_OFFSET,
} from './board-config.js'

describe('BOARD_LABEL_Z', () => {
	it('floats text in front of the board backing (0.05)', () => {
		expect(BOARD_LABEL_Z).toBe(0.05)
	})

	it('is positive (in front of board face)', () => {
		expect(BOARD_LABEL_Z).toBeGreaterThan(0)
	})
})

describe('BOARD_Y', () => {
	it('is defined', () => {
		expect(BOARD_Y).toBeDefined()
	})
})

describe('BOARD_Z', () => {
	it('is negative (behind origin)', () => {
		expect(BOARD_Z).toBeLessThan(0)
	})
})

describe('SCORE_DISPLAY_Z_OFFSET', () => {
	it('is positive (score display floats in front of board)', () => {
		expect(SCORE_DISPLAY_Z_OFFSET).toBeGreaterThan(0)
	})

	it('is pinned to 0.4 (scoreboard pulled slightly forward toward the player)', () => {
		// Reason: SCORE_DISPLAY_Z_OFFSET is the only signal that controls how far in
		// front of the board the scoreboard sits; pinning the literal prevents silent
		// drift back toward the board face or excessive forward push that would
		// collide with other foreground elements.
		expect(SCORE_DISPLAY_Z_OFFSET).toBe(0.4)
	})
})

describe('BACKING_RADIUS', () => {
	it('is pinned to 0.85 (outer radius of the board backing plate)', () => {
		// Reason: scoreboard layout regression tests use BACKING_RADIUS to compute
		// the board top edge (BOARD_Y + BACKING_RADIUS). Pinning the literal here
		// keeps the source of truth aligned with those tests.
		expect(BACKING_RADIUS).toBe(0.85)
	})

	it('is positive', () => {
		expect(BACKING_RADIUS).toBeGreaterThan(0)
	})
})

describe('SCORE_DISPLAY_Z', () => {
	it('equals BOARD_Z + SCORE_DISPLAY_Z_OFFSET', () => {
		expect(SCORE_DISPLAY_Z).toBeCloseTo(BOARD_Z + SCORE_DISPLAY_Z_OFFSET)
	})

	it('is in front of BOARD_Z (closer to camera)', () => {
		expect(SCORE_DISPLAY_Z).toBeGreaterThan(BOARD_Z)
	})
})
