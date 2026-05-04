import { useTask } from '@threlte/core'
import type { ScoreData } from '$lib/game/score-display-types'
import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-svelte'
import ScoreDisplay from './ScoreDisplay.svelte'

vi.mock('@threlte/core', () => ({ T: {}, useTask: vi.fn() }))
vi.mock('@threlte/extras', () => ({ Text: {} }))
vi.mock('$lib/game/fonts', () => ({
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
