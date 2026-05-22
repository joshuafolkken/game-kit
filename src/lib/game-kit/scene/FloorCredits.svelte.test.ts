import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-svelte'
import FloorCredits from './FloorCredits.svelte'
import FLOOR_CREDITS_SOURCE from './FloorCredits.svelte?raw'

vi.mock('@threlte/core', () => ({ T: {}, useTask: vi.fn() }))
vi.mock('@threlte/extras', () => ({ Text: function Text() {} }))

const SAMPLE_CREDITS = 'CREDITS\n\nSponsor A\n\nSponsor B'
const START_Z = 10
const END_Z = -10

describe('FloorCredits', () => {
	it('renders without error in normal mode', () => {
		const { container } = render(FloorCredits, {
			props: {
				is_alt: false,
				credits: SAMPLE_CREDITS,
				scroll_start_z: START_Z,
				scroll_end_z: END_Z,
			},
		})
		expect(container).toBeTruthy()
	})

	it('renders without error in alt mode', () => {
		const { container } = render(FloorCredits, {
			props: {
				is_alt: true,
				credits: SAMPLE_CREDITS,
				scroll_start_z: START_Z,
				scroll_end_z: END_Z,
			},
		})
		expect(container).toBeTruthy()
	})

	it('accepts empty credits string', () => {
		const { container } = render(FloorCredits, {
			props: { is_alt: false, credits: '', scroll_start_z: START_Z, scroll_end_z: END_Z },
		})
		expect(container).toBeTruthy()
	})
})

describe('FloorCredits font selection — driven by CRT, not CYBER (is_alt)', () => {
	it('derives use_alt_font from !crt.is_crt_enabled', () => {
		expect(FLOOR_CREDITS_SOURCE).toMatch(
			/let\s+use_alt_font\s*=\s*\$derived\(\s*!\s*crt\.is_crt_enabled\s*\)/,
		)
	})

	it('current_font passes use_alt_font into fonts.get_font (not is_alt)', () => {
		expect(FLOOR_CREDITS_SOURCE).toMatch(
			/let\s+current_font\s*=\s*\$derived\(\s*fonts\.get_font\(\s*use_alt_font\s*\)\s*\)/,
		)
	})

	it('imports crt from $lib/game-kit/crt.svelte', () => {
		expect(FLOOR_CREDITS_SOURCE).toMatch(
			/import\s*\{[^}]*\bcrt\b[^}]*\}\s*from\s*'\$lib\/game-kit\/crt\.svelte'/,
		)
	})

	it('keeps is_alt prop driving the credits color (CYBER vs normal)', () => {
		expect(FLOOR_CREDITS_SOURCE).toMatch(/let\s+color\s*=\s*\$derived\(\s*is_alt\s*\?/)
	})

	it('does not pass is_alt directly into fonts helpers', () => {
		expect(FLOOR_CREDITS_SOURCE).not.toMatch(/fonts\.get_font\(\s*is_alt\s*\)/)
	})
})
