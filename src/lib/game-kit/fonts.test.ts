import { describe, expect, it } from 'vitest'
import { fonts } from './fonts'

describe('fonts', () => {
	it('get_font returns different fonts for retro (false) vs alt (true) selection', () => {
		expect(fonts.get_font(false)).not.toBe(fonts.get_font(true))
	})

	it('get_font returns a local font path for retro selection', () => {
		expect(fonts.get_font(false)).toMatch(/^\/fonts\//)
	})

	it('get_font returns a local font path for alt selection', () => {
		expect(fonts.get_font(true)).toMatch(/^\/fonts\//)
	})

	it('get_font returns the retro pixel font for should_use_alt_font=false', () => {
		expect(fonts.get_font(false)).toContain('PressStart2P')
	})

	it('get_font returns the alt (Orbitron) font for should_use_alt_font=true', () => {
		expect(fonts.get_font(true)).toContain('Orbitron')
	})

	it('get_font returns consistent value for same input', () => {
		expect(fonts.get_font(false)).toBe(fonts.get_font(false))
		expect(fonts.get_font(true)).toBe(fonts.get_font(true))
	})

	it('get_font_size_multiplier returns 0.8 for retro selection', () => {
		expect(fonts.get_font_size_multiplier(false)).toBe(0.8)
	})

	it('get_font_size_multiplier returns 1 for alt selection', () => {
		expect(fonts.get_font_size_multiplier(true)).toBe(1)
	})

	it('get_font_size_multiplier returns higher value for alt selection', () => {
		expect(fonts.get_font_size_multiplier(true)).toBeGreaterThan(
			fonts.get_font_size_multiplier(false),
		)
	})

	it('get_font_family returns different families for retro vs alt selection', () => {
		expect(fonts.get_font_family(false)).not.toBe(fonts.get_font_family(true))
	})

	it('get_font_family returns consistent value for same input', () => {
		expect(fonts.get_font_family(false)).toBe(fonts.get_font_family(false))
		expect(fonts.get_font_family(true)).toBe(fonts.get_font_family(true))
	})
})
