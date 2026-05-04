import { describe, it, expect } from 'vitest';
import { fonts } from './fonts';

describe('fonts', () => {
	it('get_font returns different fonts in normal vs alt mode', () => {
		expect(fonts.get_font(false)).not.toBe(fonts.get_font(true));
	});

	it('get_font returns a local font path in normal mode', () => {
		expect(fonts.get_font(false)).toMatch(/^\/fonts\//);
	});

	it('get_font returns a local font path in alt mode', () => {
		expect(fonts.get_font(true)).toMatch(/^\/fonts\//);
	});

	it('get_font returns consistent value for same input', () => {
		expect(fonts.get_font(false)).toBe(fonts.get_font(false));
		expect(fonts.get_font(true)).toBe(fonts.get_font(true));
	});

	it('get_font_size_multiplier returns 0.8 in normal mode', () => {
		expect(fonts.get_font_size_multiplier(false)).toBe(0.8);
	});

	it('get_font_size_multiplier returns 1 in alt mode', () => {
		expect(fonts.get_font_size_multiplier(true)).toBe(1);
	});

	it('get_font_size_multiplier returns higher value in alt mode', () => {
		expect(fonts.get_font_size_multiplier(true)).toBeGreaterThan(
			fonts.get_font_size_multiplier(false)
		);
	});

	it('get_font_family returns different families in normal vs alt mode', () => {
		expect(fonts.get_font_family(false)).not.toBe(fonts.get_font_family(true));
	});

	it('get_font_family returns consistent value for same input', () => {
		expect(fonts.get_font_family(false)).toBe(fonts.get_font_family(false));
		expect(fonts.get_font_family(true)).toBe(fonts.get_font_family(true));
	});
});
