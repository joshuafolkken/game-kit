import { describe, it, expect } from 'vitest';
import { lighting } from './lighting';

describe('lighting', () => {
	it('get_ambient_intensity returns higher value in alt mode', () => {
		expect(lighting.get_ambient_intensity(true)).toBeGreaterThan(
			lighting.get_ambient_intensity(false)
		);
	});

	it('get_ambient_intensity returns consistent values', () => {
		expect(lighting.get_ambient_intensity(false)).toBe(lighting.get_ambient_intensity(false));
		expect(lighting.get_ambient_intensity(true)).toBe(lighting.get_ambient_intensity(true));
	});

	it('get_point_light_intensity returns higher value in alt mode', () => {
		expect(lighting.get_point_light_intensity(true)).toBeGreaterThan(
			lighting.get_point_light_intensity(false)
		);
	});

	it('get_point_light_intensity returns consistent values', () => {
		expect(lighting.get_point_light_intensity(false)).toBe(
			lighting.get_point_light_intensity(false)
		);
	});

	it('get_ambient_color returns white in normal mode', () => {
		expect(lighting.get_ambient_color(false)).toBe('#ffffff');
	});

	it('get_ambient_color returns non-white color in alt mode', () => {
		expect(lighting.get_ambient_color(true)).not.toBe('#ffffff');
	});

	it('get_ambient_color returns different colors in normal vs alt mode', () => {
		expect(lighting.get_ambient_color(false)).not.toBe(lighting.get_ambient_color(true));
	});
});
