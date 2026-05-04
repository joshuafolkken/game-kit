import { describe, it, expect } from 'vitest';
import {
	SWITCH_ICON_TYPES,
	SWITCH_Y,
	FPS_SWITCH_Y,
	SWITCH_Z,
	LEFT_SWITCH_X,
	FULLSCREEN_SWITCH_X,
	BORDER_POS,
	PANEL_SIZE,
	PANEL_DEPTH,
	BORDER_THICKNESS,
	BORDER_DEPTH,
	CORNER_ARM_CENTER,
	CORNER_POS,
	CORNER_ARM,
	CYBER_RING_TUBULAR,
	HIT_AREA_Z,
	LABEL_FONT_SIZE,
	LABEL_Y_OFFSET,
	LABEL_Z,
	PANEL_HALF,
	PANEL_TEXT_Y,
	PANEL_TEXT_Z,
	PANEL_TEXT_FONT_SIZE,
	DEFAULT_SWITCH_GEOMETRY
} from './switch-config.js';

describe('SWITCH_ICON_TYPES', () => {
	it('includes cyber', () => {
		expect(SWITCH_ICON_TYPES).toContain('cyber');
	});

	it('includes fullscreen', () => {
		expect(SWITCH_ICON_TYPES).toContain('fullscreen');
	});

	it('includes fps', () => {
		expect(SWITCH_ICON_TYPES).toContain('fps');
	});

	it('has exactly three entries', () => {
		expect(SWITCH_ICON_TYPES).toHaveLength(3);
	});
});

describe('FPS_SWITCH_Y', () => {
	it('is above the default SWITCH_Y', () => {
		expect(FPS_SWITCH_Y).toBeGreaterThan(SWITCH_Y);
	});

	it('label clears the top of the CYBER button (no overlap)', () => {
		const fps_label_y = FPS_SWITCH_Y - LABEL_Y_OFFSET;
		const cyber_top_y = SWITCH_Y + PANEL_HALF;
		expect(fps_label_y).toBeGreaterThan(cyber_top_y);
	});
});

describe('PANEL_TEXT_Y', () => {
	it('is negative (positioned inside panel below bars)', () => {
		expect(PANEL_TEXT_Y).toBeLessThan(0);
	});

	it('is above the panel bottom edge', () => {
		expect(PANEL_TEXT_Y).toBeGreaterThan(-PANEL_HALF);
	});

	it('is below the bar base (in the empty space)', () => {
		expect(PANEL_TEXT_Y).toBeLessThan(0);
	});

	it('DEFAULT_SWITCH_GEOMETRY panel_text_y matches constant', () => {
		expect(DEFAULT_SWITCH_GEOMETRY.panel_text_y).toBeCloseTo(PANEL_TEXT_Y);
	});

	it('DEFAULT_SWITCH_GEOMETRY panel_text_font_size matches constant', () => {
		expect(DEFAULT_SWITCH_GEOMETRY.panel_text_font_size).toBe(PANEL_TEXT_FONT_SIZE);
	});

	it('panel_text_z matches label_z (floats at same depth as label)', () => {
		expect(PANEL_TEXT_Z).toBe(LABEL_Z);
	});
});

describe('LEFT_SWITCH_X / FULLSCREEN_SWITCH_X', () => {
	it('FULLSCREEN_SWITCH_X is greater than LEFT_SWITCH_X (no overlap)', () => {
		expect(FULLSCREEN_SWITCH_X).toBeGreaterThan(LEFT_SWITCH_X);
	});

	it('both positions are positive (right side of scene)', () => {
		expect(LEFT_SWITCH_X).toBeGreaterThan(0);
		expect(FULLSCREEN_SWITCH_X).toBeGreaterThan(0);
	});
});

describe('SWITCH_Z', () => {
	it('is negative (behind origin)', () => {
		expect(SWITCH_Z).toBeLessThan(0);
	});

	it('floats away from the back wall (greater than -5)', () => {
		expect(SWITCH_Z).toBeGreaterThan(-5);
	});

	it('is at 2x the score display wall distance (-4.30)', () => {
		// Back wall z=-5, score display z=-4.65 (BOARD_Z=-4.8 + FLOAT_Z_OFFSET=0.15)
		// Wall distance=0.35, 2x=0.70 => SWITCH_Z = -5 + 0.70 = -4.30
		expect(SWITCH_Z).toBeCloseTo(-4.3);
	});
});

describe('BORDER_POS', () => {
	it('equals half panel size minus half border thickness', () => {
		expect(BORDER_POS).toBeCloseTo(PANEL_SIZE / 2 - BORDER_THICKNESS / 2);
	});
});

describe('CORNER_ARM_CENTER', () => {
	it('equals corner position minus half arm length', () => {
		expect(CORNER_ARM_CENTER).toBeCloseTo(CORNER_POS - CORNER_ARM / 2);
	});
});

describe('CYBER_RING_TUBULAR', () => {
	it('is 4 for reduced geometry performance', () => {
		expect(CYBER_RING_TUBULAR).toBe(4);
	});
});

describe('HIT_AREA_Z', () => {
	it('is positive (in front of panel face)', () => {
		expect(HIT_AREA_Z).toBeGreaterThan(0);
	});
});

describe('DEFAULT_SWITCH_GEOMETRY', () => {
	it('switch_y matches SWITCH_Y constant', () => {
		expect(DEFAULT_SWITCH_GEOMETRY.switch_y).toBe(SWITCH_Y);
	});

	it('switch_z matches SWITCH_Z constant', () => {
		expect(DEFAULT_SWITCH_GEOMETRY.switch_z).toBe(SWITCH_Z);
	});

	it('panel_size matches PANEL_SIZE constant', () => {
		expect(DEFAULT_SWITCH_GEOMETRY.panel_size).toBe(PANEL_SIZE);
	});

	it('panel_depth matches PANEL_DEPTH constant', () => {
		expect(DEFAULT_SWITCH_GEOMETRY.panel_depth).toBe(PANEL_DEPTH);
	});

	it('border_thickness matches BORDER_THICKNESS constant', () => {
		expect(DEFAULT_SWITCH_GEOMETRY.border_thickness).toBe(BORDER_THICKNESS);
	});

	it('border_depth matches BORDER_DEPTH constant', () => {
		expect(DEFAULT_SWITCH_GEOMETRY.border_depth).toBe(BORDER_DEPTH);
	});

	it('label_font_size matches LABEL_FONT_SIZE constant', () => {
		expect(DEFAULT_SWITCH_GEOMETRY.label_font_size).toBe(LABEL_FONT_SIZE);
	});

	it('hit_area_z matches HIT_AREA_Z constant', () => {
		expect(DEFAULT_SWITCH_GEOMETRY.hit_area_z).toBe(HIT_AREA_Z);
	});

	it('has all required fields (no undefined values)', () => {
		for (const [key, value] of Object.entries(DEFAULT_SWITCH_GEOMETRY)) {
			expect(value, `${key} should not be undefined`).not.toBeUndefined();
		}
	});
});
