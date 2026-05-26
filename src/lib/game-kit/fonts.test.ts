import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { crt } from './crt.svelte'
import { fonts } from './fonts'

const RETRO_MULTIPLIER = 0.8
const ALT_MULTIPLIER = 1

describe('fonts', () => {
	it('get_font returns different fonts for retro (false) vs alt (true) selection', () => {
		expect(fonts.get_font(false)).not.toBe(fonts.get_font(true))
	})

	it('get_font returns a local font path for retro selection', () => {
		expect(fonts.get_font(false)).toMatch(/^\/fonts\//u)
	})

	it('get_font returns a local font path for alt selection', () => {
		expect(fonts.get_font(true)).toMatch(/^\/fonts\//u)
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
		expect(fonts.get_font_size_multiplier(false)).toBe(RETRO_MULTIPLIER)
	})

	it('get_font_size_multiplier returns 1 for alt selection', () => {
		expect(fonts.get_font_size_multiplier(true)).toBe(ALT_MULTIPLIER)
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

describe('fonts CRT-aware helpers — driven by crt.is_crt_enabled, not by caller-supplied flag', () => {
	// crt is a singleton; ensure each test starts from the default enabled state
	// and restore it afterwards so other tests are not affected.
	beforeEach(() => {
		if (!crt.is_crt_enabled) crt.toggle()
	})

	afterEach(() => {
		if (!crt.is_crt_enabled) crt.toggle()
	})

	it('get_active_font returns the dot (PressStart2P) font when CRT is enabled', () => {
		expect(crt.is_crt_enabled).toBe(true)
		expect(fonts.get_active_font()).toContain('PressStart2P')
		expect(fonts.get_active_font()).toBe(fonts.get_font(false))
	})

	it('get_active_font returns the alt (Orbitron) font when CRT is disabled', () => {
		crt.toggle()
		expect(crt.is_crt_enabled).toBe(false)
		expect(fonts.get_active_font()).toContain('Orbitron')
		expect(fonts.get_active_font()).toBe(fonts.get_font(true))
	})

	it('get_active_font_size_multiplier returns 0.8 when CRT is enabled', () => {
		expect(crt.is_crt_enabled).toBe(true)
		expect(fonts.get_active_font_size_multiplier()).toBe(RETRO_MULTIPLIER)
	})

	it('get_active_font_size_multiplier returns 1 when CRT is disabled', () => {
		crt.toggle()
		expect(crt.is_crt_enabled).toBe(false)
		expect(fonts.get_active_font_size_multiplier()).toBe(ALT_MULTIPLIER)
	})

	it('get_active_font tracks CRT state across toggles (no stale capture)', () => {
		const initial = fonts.get_active_font()

		crt.toggle()
		const toggled = fonts.get_active_font()

		expect(toggled).not.toBe(initial)
	})
})
