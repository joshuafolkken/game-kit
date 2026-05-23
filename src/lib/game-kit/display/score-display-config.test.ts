import { BACKING_RADIUS, BOARD_Y } from '$lib/game/board-config.js'
import { describe, expect, it } from 'vitest'
import {
	ANIM_DURATION_MS,
	CYBER_LABEL_COLOR,
	CYBER_NEW_HIGH_COLOR,
	CYBER_PANEL_COLOR,
	CYBER_PANEL_EMISSIVE,
	CYBER_PANEL_EMISSIVE_INTENSITY,
	CYBER_VALUE_COLOR,
	DISPLAY_Y,
	HI_BASE_COLOR,
	HI_LABEL_Y,
	HI_VALUE_Y,
	LABEL_FONT_SIZE,
	PANEL_H,
	PANEL_OPACITY,
	PANEL_TILT_X,
	PANEL_W,
	PANEL_Z_OFFSET,
	RETRO_LABEL_COLOR,
	RETRO_NEW_HIGH_COLOR,
	RETRO_PANEL_COLOR,
	RETRO_PANEL_EMISSIVE,
	RETRO_PANEL_EMISSIVE_INTENSITY,
	RETRO_VALUE_COLOR,
	ROUND_VALUE_FONT_SIZE,
	ROUND_X,
	SCORE_LABEL_Y,
	SCORE_TEXT_Z,
	SCORE_VALUE_Y,
	VALUE_FONT_SIZE,
} from './score-display-config.js'

const FLASH_BURST_ON_MS = 30
const FLASH_BURST_OFF_MS = 20
const FLASH_BURST_CYCLES = 4
const FLASH_CASCADE_FWD_MS = 65
const FLASH_CASCADE_REV_MS = 40

const BUTTON_COUNT = 4

describe('SCORE_TEXT_Z', () => {
	it('floats text in front of the score panel (0.05)', () => {
		expect(SCORE_TEXT_Z).toBe(0.05)
	})

	it('is positive (in front of panel face)', () => {
		expect(SCORE_TEXT_Z).toBeGreaterThan(0)
	})
})

const EXPECTED_DISPLAY_Y = 2.38
// Edge-to-edge gap (scoreboard bottom edge → board top edge) intentionally
// compact so the scoreboard hovers just above the game board without overlapping.
// Expected value depends on PANEL_TILT_X (larger tilt → cos shrinks → larger gap).
const EXPECTED_EDGE_GAP = 0.044
const EDGE_GAP_TOLERANCE = 1e-2
const HALF_DIVISOR = 2
const HALF_PI = Math.PI / 2
const EXPECTED_PANEL_TILT_X = 0.4
const EXPECTED_HI_LABEL_Y = 0.18
const EXPECTED_SCORE_LABEL_Y = -0.09

describe('layout geometry', () => {
	it('DISPLAY_Y places the panel above the floor', () => {
		expect(DISPLAY_Y).toBeGreaterThan(0)
	})

	it('DISPLAY_Y is pinned to 2.38 (scoreboard sits compact above the board top)', () => {
		// Reason: DISPLAY_Y is the only signal that controls the scoreboard-to-board
		// vertical spacing; pinning the literal value catches silent drift that
		// would re-open the gap or push the scoreboard into the board (overlap).
		expect(DISPLAY_Y).toBe(EXPECTED_DISPLAY_Y)
	})

	it('scoreboard bottom edge sits ~0.044 above the board top edge (compact gap, no overlap)', () => {
		// Board top edge in world y: BOARD_Y + BACKING_RADIUS.
		// Scoreboard bottom edge accounts for the downward tilt rotating the panel
		// half-height around the panel center, so the projected y extent is
		// (PANEL_H / 2) * cos(PANEL_TILT_X).
		const board_top_y = BOARD_Y + BACKING_RADIUS
		const tilted_half_height = (PANEL_H / HALF_DIVISOR) * Math.cos(PANEL_TILT_X)
		const scoreboard_bottom_y = DISPLAY_Y - tilted_half_height
		const edge_gap = scoreboard_bottom_y - board_top_y
		expect(edge_gap).toBeGreaterThan(0)
		expect(Math.abs(edge_gap - EXPECTED_EDGE_GAP)).toBeLessThan(EDGE_GAP_TOLERANCE)
	})

	it('PANEL_TILT_X is pinned to 0.4 rad (downward tilt toward the player)', () => {
		// Reason: the tilt angle is the only signal for the downward angle of the
		// scoreboard face; pinning the literal prevents silent drift that would
		// flatten or invert the angle.
		expect(PANEL_TILT_X).toBe(EXPECTED_PANEL_TILT_X)
	})

	it('PANEL_TILT_X is a positive angle smaller than π/2 (tilts down, not flipped)', () => {
		expect(PANEL_TILT_X).toBeGreaterThan(0)
		expect(PANEL_TILT_X).toBeLessThan(HALF_PI)
	})

	it('PANEL_W is wider than PANEL_H (landscape orientation)', () => {
		expect(PANEL_W).toBeGreaterThan(PANEL_H)
	})

	it('PANEL_Z_OFFSET is negative (panel sits behind the text layer)', () => {
		expect(PANEL_Z_OFFSET).toBeLessThan(0)
	})

	it('PANEL_OPACITY is between 0 and 1', () => {
		expect(PANEL_OPACITY).toBeGreaterThan(0)
		expect(PANEL_OPACITY).toBeLessThan(1)
	})

	it('ROUND_X is positive (column offset to the right)', () => {
		expect(ROUND_X).toBeGreaterThan(0)
	})
})

describe('text layout', () => {
	it('HI_LABEL_Y is above HI_VALUE_Y (label above value)', () => {
		expect(HI_LABEL_Y).toBeGreaterThan(HI_VALUE_Y)
	})

	it('SCORE_LABEL_Y is above SCORE_VALUE_Y (label above value)', () => {
		expect(SCORE_LABEL_Y).toBeGreaterThan(SCORE_VALUE_Y)
	})

	it('HI section is above SCORE section', () => {
		expect(HI_VALUE_Y).toBeGreaterThan(SCORE_LABEL_Y)
	})

	it('HI_LABEL_Y is pinned to 0.18 — lowered slightly to sit closer to its value row', () => {
		// Reason: HI/RND labels were nudged down toward their value rows for a tighter
		// label-value pair. Pin the literal so future drift doesn't re-open the gap.
		expect(HI_LABEL_Y).toBe(EXPECTED_HI_LABEL_Y)
	})

	it('SCORE_LABEL_Y is pinned to -0.09 — lowered slightly to sit closer to its value row', () => {
		expect(SCORE_LABEL_Y).toBe(EXPECTED_SCORE_LABEL_Y)
	})

	it('LABEL_FONT_SIZE is smaller than VALUE_FONT_SIZE', () => {
		expect(LABEL_FONT_SIZE).toBeLessThan(VALUE_FONT_SIZE)
	})

	it('ROUND_VALUE_FONT_SIZE is smaller than VALUE_FONT_SIZE', () => {
		expect(ROUND_VALUE_FONT_SIZE).toBeLessThan(VALUE_FONT_SIZE)
	})

	it('LABEL_FONT_SIZE is pinned to 0.08 (bumped from 0.055 so retro-mode HI/RND/SCORE labels stay legible)', () => {
		// Reason: retro mode multiplies font sizes by 0.8, so a small literal change
		// silently makes the labels invisible. Pin the new size so future drift surfaces.
		expect(LABEL_FONT_SIZE).toBe(0.08)
	})

	it('VALUE_FONT_SIZE is pinned to 0.115 (slightly enlarged for readability)', () => {
		expect(VALUE_FONT_SIZE).toBe(0.115)
	})

	it('ROUND_VALUE_FONT_SIZE is pinned to 0.105 (slightly enlarged in tandem with VALUE_FONT_SIZE)', () => {
		expect(ROUND_VALUE_FONT_SIZE).toBe(0.105)
	})
})

describe('colors', () => {
	it('cyber and retro panel colors are distinct', () => {
		expect(CYBER_PANEL_COLOR).not.toBe(RETRO_PANEL_COLOR)
	})

	it('cyber and retro label colors are distinct', () => {
		expect(CYBER_LABEL_COLOR).not.toBe(RETRO_LABEL_COLOR)
	})

	it('cyber and retro value colors are distinct', () => {
		expect(CYBER_VALUE_COLOR).not.toBe(RETRO_VALUE_COLOR)
	})

	it('HI_BASE_COLOR is distinct from both mode value colors', () => {
		expect(HI_BASE_COLOR).not.toBe(CYBER_VALUE_COLOR)
		expect(HI_BASE_COLOR).not.toBe(RETRO_VALUE_COLOR)
	})

	it('CYBER_NEW_HIGH_COLOR is distinct from HI_BASE_COLOR and cyber value color', () => {
		expect(CYBER_NEW_HIGH_COLOR).not.toBe(HI_BASE_COLOR)
		expect(CYBER_NEW_HIGH_COLOR).not.toBe(CYBER_VALUE_COLOR)
	})

	it('RETRO_NEW_HIGH_COLOR is distinct from HI_BASE_COLOR and retro value color', () => {
		expect(RETRO_NEW_HIGH_COLOR).not.toBe(HI_BASE_COLOR)
		expect(RETRO_NEW_HIGH_COLOR).not.toBe(RETRO_VALUE_COLOR)
	})

	it('cyber and retro new-high colors are distinct from each other', () => {
		expect(CYBER_NEW_HIGH_COLOR).not.toBe(RETRO_NEW_HIGH_COLOR)
	})

	it('HI_BASE_COLOR is bright yellow (#ffff00)', () => {
		expect(HI_BASE_COLOR).toBe('#ffff00')
	})

	it('CYBER_NEW_HIGH_COLOR is a magenta-purple highlight', () => {
		expect(CYBER_NEW_HIGH_COLOR).toBe('#cc66ff')
	})

	it('RETRO_NEW_HIGH_COLOR is a vivid magenta highlight', () => {
		expect(RETRO_NEW_HIGH_COLOR).toBe('#ff44ff')
	})

	it('cyber emissive intensity is greater than retro (cyber glows more)', () => {
		expect(CYBER_PANEL_EMISSIVE_INTENSITY).toBeGreaterThan(RETRO_PANEL_EMISSIVE_INTENSITY)
	})

	it('CYBER_PANEL_EMISSIVE is distinct from CYBER_PANEL_COLOR', () => {
		expect(CYBER_PANEL_EMISSIVE).not.toBe(CYBER_PANEL_COLOR)
	})

	it('RETRO_PANEL_EMISSIVE is distinct from RETRO_PANEL_COLOR', () => {
		expect(RETRO_PANEL_EMISSIVE).not.toBe(RETRO_PANEL_COLOR)
	})
})

describe('ANIM_DURATION_MS', () => {
	it('is positive', () => {
		expect(ANIM_DURATION_MS).toBeGreaterThan(0)
	})

	it('is at least 500ms (visible animation)', () => {
		expect(ANIM_DURATION_MS).toBeGreaterThanOrEqual(500)
	})

	it('ends at the victory flash finale start (count-up stops when the 4 lamps light up)', () => {
		const burst_total = FLASH_BURST_CYCLES * (FLASH_BURST_ON_MS + FLASH_BURST_OFF_MS)
		const cascade_total = BUTTON_COUNT * (FLASH_CASCADE_FWD_MS + FLASH_CASCADE_REV_MS)
		expect(ANIM_DURATION_MS).toBe(burst_total + cascade_total)
	})
})
