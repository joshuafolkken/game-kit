import { it, expect, describe } from 'vitest';
import {
	SCORE_TEXT_Z,
	DISPLAY_Y,
	PANEL_W,
	PANEL_H,
	PANEL_Z_OFFSET,
	PANEL_OPACITY,
	CYBER_PANEL_COLOR,
	CYBER_PANEL_EMISSIVE,
	CYBER_PANEL_EMISSIVE_INTENSITY,
	RETRO_PANEL_COLOR,
	RETRO_PANEL_EMISSIVE,
	RETRO_PANEL_EMISSIVE_INTENSITY,
	CYBER_LABEL_COLOR,
	CYBER_VALUE_COLOR,
	RETRO_LABEL_COLOR,
	RETRO_VALUE_COLOR,
	NEW_HIGH_SCORE_COLOR,
	LABEL_FONT_SIZE,
	VALUE_FONT_SIZE,
	ROUND_VALUE_FONT_SIZE,
	HI_LABEL_Y,
	HI_VALUE_Y,
	SCORE_LABEL_Y,
	SCORE_VALUE_Y,
	ROUND_X,
	ANIM_DURATION_MS
} from './score-display-config.js';
const FLASH_BURST_ON_MS = 30;
const FLASH_BURST_OFF_MS = 20;
const FLASH_BURST_CYCLES = 4;
const FLASH_CASCADE_FWD_MS = 65;
const FLASH_CASCADE_REV_MS = 40;

const BUTTON_COUNT = 4;

describe('SCORE_TEXT_Z', () => {
	it('floats text in front of the score panel (0.05)', () => {
		expect(SCORE_TEXT_Z).toBe(0.05);
	});

	it('is positive (in front of panel face)', () => {
		expect(SCORE_TEXT_Z).toBeGreaterThan(0);
	});
});

describe('layout geometry', () => {
	it('DISPLAY_Y places the panel above the floor', () => {
		expect(DISPLAY_Y).toBeGreaterThan(0);
	});

	it('PANEL_W is wider than PANEL_H (landscape orientation)', () => {
		expect(PANEL_W).toBeGreaterThan(PANEL_H);
	});

	it('PANEL_Z_OFFSET is negative (panel sits behind the text layer)', () => {
		expect(PANEL_Z_OFFSET).toBeLessThan(0);
	});

	it('PANEL_OPACITY is between 0 and 1', () => {
		expect(PANEL_OPACITY).toBeGreaterThan(0);
		expect(PANEL_OPACITY).toBeLessThan(1);
	});

	it('ROUND_X is positive (column offset to the right)', () => {
		expect(ROUND_X).toBeGreaterThan(0);
	});
});

describe('text layout', () => {
	it('HI_LABEL_Y is above HI_VALUE_Y (label above value)', () => {
		expect(HI_LABEL_Y).toBeGreaterThan(HI_VALUE_Y);
	});

	it('SCORE_LABEL_Y is above SCORE_VALUE_Y (label above value)', () => {
		expect(SCORE_LABEL_Y).toBeGreaterThan(SCORE_VALUE_Y);
	});

	it('HI section is above SCORE section', () => {
		expect(HI_VALUE_Y).toBeGreaterThan(SCORE_LABEL_Y);
	});

	it('LABEL_FONT_SIZE is smaller than VALUE_FONT_SIZE', () => {
		expect(LABEL_FONT_SIZE).toBeLessThan(VALUE_FONT_SIZE);
	});

	it('ROUND_VALUE_FONT_SIZE is smaller than VALUE_FONT_SIZE', () => {
		expect(ROUND_VALUE_FONT_SIZE).toBeLessThan(VALUE_FONT_SIZE);
	});
});

describe('colors', () => {
	it('cyber and retro panel colors are distinct', () => {
		expect(CYBER_PANEL_COLOR).not.toBe(RETRO_PANEL_COLOR);
	});

	it('cyber and retro label colors are distinct', () => {
		expect(CYBER_LABEL_COLOR).not.toBe(RETRO_LABEL_COLOR);
	});

	it('cyber and retro value colors are distinct', () => {
		expect(CYBER_VALUE_COLOR).not.toBe(RETRO_VALUE_COLOR);
	});

	it('NEW_HIGH_SCORE_COLOR is different from both value colors', () => {
		expect(NEW_HIGH_SCORE_COLOR).not.toBe(CYBER_VALUE_COLOR);
		expect(NEW_HIGH_SCORE_COLOR).not.toBe(RETRO_VALUE_COLOR);
	});

	it('cyber emissive intensity is greater than retro (cyber glows more)', () => {
		expect(CYBER_PANEL_EMISSIVE_INTENSITY).toBeGreaterThan(RETRO_PANEL_EMISSIVE_INTENSITY);
	});

	it('CYBER_PANEL_EMISSIVE is distinct from CYBER_PANEL_COLOR', () => {
		expect(CYBER_PANEL_EMISSIVE).not.toBe(CYBER_PANEL_COLOR);
	});

	it('RETRO_PANEL_EMISSIVE is distinct from RETRO_PANEL_COLOR', () => {
		expect(RETRO_PANEL_EMISSIVE).not.toBe(RETRO_PANEL_COLOR);
	});
});

describe('ANIM_DURATION_MS', () => {
	it('is positive', () => {
		expect(ANIM_DURATION_MS).toBeGreaterThan(0);
	});

	it('is at least 500ms (visible animation)', () => {
		expect(ANIM_DURATION_MS).toBeGreaterThanOrEqual(500);
	});

	it('ends at the victory flash finale start (count-up stops when the 4 lamps light up)', () => {
		const burst_total = FLASH_BURST_CYCLES * (FLASH_BURST_ON_MS + FLASH_BURST_OFF_MS);
		const cascade_total = BUTTON_COUNT * (FLASH_CASCADE_FWD_MS + FLASH_CASCADE_REV_MS);
		expect(ANIM_DURATION_MS).toBe(burst_total + cascade_total);
	});
});
