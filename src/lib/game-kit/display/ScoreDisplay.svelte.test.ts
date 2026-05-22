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
		get_font: vi.fn(() => 'sans'),
		get_font_size_multiplier: vi.fn(() => 1),
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

describe('ScoreDisplay font selection — driven by CRT, not CYBER (is_alt)', () => {
	it('derives should_use_alt_font from !crt.is_crt_enabled (font swaps with CRT, not CYBER)', () => {
		expect(SCORE_DISPLAY_SOURCE).toMatch(
			/let\s+should_use_alt_font\s*=\s*\$derived\(\s*!\s*crt\.is_crt_enabled\s*\)/,
		)
	})

	it('current_font passes should_use_alt_font into fonts.get_font (not is_alt)', () => {
		expect(SCORE_DISPLAY_SOURCE).toMatch(
			/let\s+current_font\s*=\s*\$derived\(\s*fonts\.get_font\(\s*should_use_alt_font\s*\)\s*\)/,
		)
	})

	it('font_size_multiplier passes should_use_alt_font into fonts.get_font_size_multiplier', () => {
		expect(SCORE_DISPLAY_SOURCE).toMatch(
			/let\s+font_size_multiplier\s*=\s*\$derived\(\s*fonts\.get_font_size_multiplier\(\s*should_use_alt_font\s*\)\s*\)/,
		)
	})

	it('imports crt from $lib/game-kit/crt.svelte', () => {
		expect(SCORE_DISPLAY_SOURCE).toMatch(
			/import\s*\{[^}]*\bcrt\b[^}]*\}\s*from\s*'\$lib\/game-kit\/crt\.svelte'/,
		)
	})

	it('keeps is_alt prop driving palette decisions (panel/label/value colors)', () => {
		expect(SCORE_DISPLAY_SOURCE).toMatch(/let\s+panel_color\s*=\s*\$derived\(\s*is_alt\s*\?/)
	})

	it('does not pass is_alt directly into fonts helpers', () => {
		expect(SCORE_DISPLAY_SOURCE).not.toMatch(/fonts\.get_font\(\s*is_alt\s*\)/)
		expect(SCORE_DISPLAY_SOURCE).not.toMatch(/fonts\.get_font_size_multiplier\(\s*is_alt\s*\)/)
	})
})
