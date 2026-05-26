import { useTask } from '@threlte/core'
import type { ScoreData } from '$lib/game-kit/display/score-display-types'
import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-svelte'
import ScoreDisplay from './ScoreDisplay.svelte'
import SCORE_DISPLAY_SOURCE from './ScoreDisplay.svelte?raw'

vi.mock('@threlte/core', () => ({ T: {}, useTask: vi.fn() }))
vi.mock('@threlte/extras', () => ({ Text: {} }))
vi.mock('$lib/game-kit/fonts', () => ({
	fonts: {
		get_active_font: vi.fn(() => 'sans'),
		get_active_font_size_multiplier: vi.fn(() => 1),
	},
}))

function make_score_data(overrides: Partial<ScoreData> = {}): ScoreData {
	return {
		high_score: 1000,
		current_score: 500,
		is_new_high_score: false,
		high_score_round: 3,
		last_cleared_round: 2,
		format_score: String,
		...overrides,
	}
}

const LABEL_PROPS = { label_high_score: 'HI', label_round: 'RND', label_current: 'SCORE' }

describe('ScoreDisplay', () => {
	it('renders without error in normal mode', () => {
		const { container } = render(ScoreDisplay, {
			props: { score_data: make_score_data(), is_alt: false, position_z: -4.65, ...LABEL_PROPS },
		})
		expect(container).toBeTruthy()
	})

	it('renders without error in alt mode', () => {
		const { container } = render(ScoreDisplay, {
			props: { score_data: make_score_data(), is_alt: true, position_z: -4.65, ...LABEL_PROPS },
		})
		expect(container).toBeTruthy()
	})

	it('registers a tick callback via useTask', () => {
		vi.mocked(useTask).mockClear()
		render(ScoreDisplay, {
			props: { score_data: make_score_data(), is_alt: false, position_z: -4.65, ...LABEL_PROPS },
		})
		expect(vi.mocked(useTask)).toHaveBeenCalledOnce()
	})

	it('accepts is_new_high_score flag via score_data', () => {
		const { container } = render(ScoreDisplay, {
			props: {
				score_data: make_score_data({ is_new_high_score: true }),
				is_alt: false,
				position_z: -4.65,
				...LABEL_PROPS,
			},
		})
		expect(container).toBeTruthy()
	})

	it('accepts custom format_score function via score_data', () => {
		const format_score = vi.fn((v: number) => `${v} pts`)
		const { container } = render(ScoreDisplay, {
			props: {
				score_data: make_score_data({ format_score }),
				is_alt: false,
				position_z: -4.65,
				...LABEL_PROPS,
			},
		})
		expect(container).toBeTruthy()
	})
})

describe('ScoreDisplay font selection — driven by CRT-aware fonts helpers, not by is_alt (CYBER)', () => {
	it('current_font uses fonts.get_active_font() (no caller-supplied flag)', () => {
		expect(SCORE_DISPLAY_SOURCE).toMatch(
			/let\s+current_font\s*=\s*\$derived\(\s*fonts\.get_active_font\(\s*\)\s*\)/u,
		)
	})

	it('font_size_multiplier uses fonts.get_active_font_size_multiplier()', () => {
		expect(SCORE_DISPLAY_SOURCE).toMatch(
			/let\s+font_size_multiplier\s*=\s*\$derived\(\s*fonts\.get_active_font_size_multiplier\(\s*\)\s*\)/u,
		)
	})

	it('no longer derives a local should_use_alt_font (CRT awareness lives in fonts.ts)', () => {
		expect(SCORE_DISPLAY_SOURCE).not.toMatch(/\bshould_use_alt_font\b/u)
	})

	it('no longer imports crt directly (consumer is decoupled from CRT module)', () => {
		expect(SCORE_DISPLAY_SOURCE).not.toMatch(
			/import\s*\{[^}]*\bcrt\b[^}]*\}\s*from\s*'\$lib\/game-kit\/crt\.svelte'/u,
		)
		expect(SCORE_DISPLAY_SOURCE).not.toMatch(/\bcrt\.is_crt_enabled\b/u)
	})

	it('keeps is_alt prop driving palette decisions (panel/label/value colors)', () => {
		expect(SCORE_DISPLAY_SOURCE).toMatch(/let\s+panel_color\s*=\s*\$derived\(\s*is_alt\s*\?/u)
	})

	it('does not pass is_alt into any fonts helper (font axis is CRT, not CYBER)', () => {
		expect(SCORE_DISPLAY_SOURCE).not.toMatch(/fonts\.get_font\(\s*is_alt\s*\)/u)
		expect(SCORE_DISPLAY_SOURCE).not.toMatch(/fonts\.get_font_size_multiplier\(\s*is_alt\s*\)/u)
		expect(SCORE_DISPLAY_SOURCE).not.toMatch(/fonts\.get_active_font\(\s*is_alt\s*\)/u)
		expect(SCORE_DISPLAY_SOURCE).not.toMatch(
			/fonts\.get_active_font_size_multiplier\(\s*is_alt\s*\)/u,
		)
	})
})

describe('ScoreDisplay panel tilt — root group rotates by PANEL_TILT_X for a downward angle', () => {
	it('imports PANEL_TILT_X from score-display-config', () => {
		expect(SCORE_DISPLAY_SOURCE).toMatch(
			/import\s*\{[\s\S]*\bPANEL_TILT_X\b[\s\S]*\}\s*from\s*'\$lib\/game-kit\/display\/score-display-config'/u,
		)
	})

	it('root <T.Group> applies rotation.x={PANEL_TILT_X}', () => {
		expect(SCORE_DISPLAY_SOURCE).toMatch(/<T\.Group[^>]*\brotation\.x=\{PANEL_TILT_X\}[^>]*>/u)
	})
})
