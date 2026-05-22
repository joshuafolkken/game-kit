import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-svelte'
import TEMPLATE_SIMON_BOARD_SOURCE from '../../../templates/src/lib/simon/SimonBoard.svelte?raw'
import SimonBoard from './SimonBoard.svelte'
import SIMON_BOARD_SOURCE from './SimonBoard.svelte?raw'
import type { SimonBoardData } from './types'

vi.mock('@threlte/core', () => ({ T: {}, useTask: vi.fn() }))
vi.mock('@threlte/extras', () => ({ Text: function Text() {} }))

function make_simon_data(overrides: Partial<SimonBoardData> = {}): SimonBoardData {
	return {
		active_color: null,
		pressed_color: null,
		phase: 'idle',
		round: 0,
		flash_colors: [],
		flash_intensity: 1,
		...overrides,
	}
}

const BOARD_TEXT_PROPS = {
	is_alt: false,
	text_gameover: 'GAME OVER',
	text_round: 'ROUND',
	text_start: 'START',
}

describe('SimonBoard', () => {
	it('renders without error in idle state', () => {
		const { container } = render(SimonBoard, {
			props: { simon_data: make_simon_data(), ...BOARD_TEXT_PROPS },
		})
		expect(container).toBeTruthy()
	})

	it('renders without error when a color is active', () => {
		const { container } = render(SimonBoard, {
			props: { simon_data: make_simon_data({ active_color: 'green' }), ...BOARD_TEXT_PROPS },
		})
		expect(container).toBeTruthy()
	})

	it('renders without error in gameover phase', () => {
		const { container } = render(SimonBoard, {
			props: { simon_data: make_simon_data({ phase: 'gameover' }), ...BOARD_TEXT_PROPS },
		})
		expect(container).toBeTruthy()
	})

	it('renders without error when round is in progress', () => {
		const { container } = render(SimonBoard, {
			props: { simon_data: make_simon_data({ phase: 'showing', round: 3 }), ...BOARD_TEXT_PROPS },
		})
		expect(container).toBeTruthy()
	})

	it('renders without error with flash colors', () => {
		const { container } = render(SimonBoard, {
			props: {
				simon_data: make_simon_data({ flash_colors: ['red', 'blue'] }),
				...BOARD_TEXT_PROPS,
			},
		})
		expect(container).toBeTruthy()
	})
})

describe('SimonBoard font selection — driven by CRT, not CYBER (is_alt)', () => {
	it('derives should_use_alt_font from !crt.is_crt_enabled', () => {
		expect(SIMON_BOARD_SOURCE).toMatch(
			/let\s+should_use_alt_font\s*=\s*\$derived\(\s*!\s*crt\.is_crt_enabled\s*\)/,
		)
	})

	it('current_font and current_font_size use should_use_alt_font (not is_alt)', () => {
		expect(SIMON_BOARD_SOURCE).toMatch(
			/let\s+current_font\s*=\s*\$derived\(\s*fonts\.get_font\(\s*should_use_alt_font\s*\)\s*\)/,
		)
		expect(SIMON_BOARD_SOURCE).toMatch(
			/fonts\.get_font_size_multiplier\(\s*should_use_alt_font\s*\)/,
		)
	})

	it('imports crt from $lib/game-kit/crt.svelte', () => {
		expect(SIMON_BOARD_SOURCE).toMatch(
			/import\s*\{[^}]*\bcrt\b[^}]*\}\s*from\s*'\$lib\/game-kit\/crt\.svelte'/,
		)
	})

	it('keeps is_alt prop driving button palette (lit/dim color helpers)', () => {
		expect(SIMON_BOARD_SOURCE).toMatch(/return\s+is_alt\s*\?\s*btn\.cyber_lit_color/)
		expect(SIMON_BOARD_SOURCE).toMatch(/return\s+is_alt\s*\?\s*btn\.cyber_dim_color/)
	})

	it('does not pass is_alt directly into fonts helpers', () => {
		expect(SIMON_BOARD_SOURCE).not.toMatch(/fonts\.get_font\(\s*is_alt\s*\)/)
		expect(SIMON_BOARD_SOURCE).not.toMatch(/fonts\.get_font_size_multiplier\(\s*is_alt\s*\)/)
	})
})

describe('templates SimonBoard mirrors the CRT-driven font behavior', () => {
	it('derives should_use_alt_font from !crt.is_crt_enabled', () => {
		expect(TEMPLATE_SIMON_BOARD_SOURCE).toMatch(
			/let\s+should_use_alt_font\s*=\s*\$derived\(\s*!\s*crt\.is_crt_enabled\s*\)/,
		)
	})

	it('imports crt from @joshuafolkken/game-kit', () => {
		expect(TEMPLATE_SIMON_BOARD_SOURCE).toMatch(
			/import\s*\{[^}]*\bcrt\b[^}]*\}\s*from\s*'@joshuafolkken\/game-kit'/,
		)
	})

	it('does not pass is_alt directly into fonts helpers', () => {
		expect(TEMPLATE_SIMON_BOARD_SOURCE).not.toMatch(/fonts\.get_font\(\s*is_alt\s*\)/)
		expect(TEMPLATE_SIMON_BOARD_SOURCE).not.toMatch(
			/fonts\.get_font_size_multiplier\(\s*is_alt\s*\)/,
		)
	})
})
