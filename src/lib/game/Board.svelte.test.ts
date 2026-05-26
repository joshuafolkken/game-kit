import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-svelte'
import TEMPLATE_BOARD_SOURCE from '../../../templates/src/lib/game/Board.svelte?raw'
import Board from './Board.svelte'
import BOARD_SOURCE from './Board.svelte?raw'
import type { GameBoardData } from './types'

vi.mock('@threlte/core', () => ({ T: {}, useTask: vi.fn() }))
vi.mock('@threlte/extras', () => ({ Text: function Text() {} }))

function make_game_data(overrides: Partial<GameBoardData> = {}): GameBoardData {
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
	text_start: 'START',
}

describe('Board', () => {
	it('renders without error in idle state', () => {
		const { container } = render(Board, {
			props: { game_data: make_game_data(), ...BOARD_TEXT_PROPS },
		})

		expect(container).toBeTruthy()
	})

	it('renders without error when a color is active', () => {
		const { container } = render(Board, {
			props: { game_data: make_game_data({ active_color: 'green' }), ...BOARD_TEXT_PROPS },
		})

		expect(container).toBeTruthy()
	})

	it('renders without error in gameover phase', () => {
		const { container } = render(Board, {
			props: { game_data: make_game_data({ phase: 'gameover' }), ...BOARD_TEXT_PROPS },
		})

		expect(container).toBeTruthy()
	})

	it('renders without error when round is in progress', () => {
		const { container } = render(Board, {
			props: { game_data: make_game_data({ phase: 'showing', round: 3 }), ...BOARD_TEXT_PROPS },
		})

		expect(container).toBeTruthy()
	})

	it('renders without error with flash colors', () => {
		const { container } = render(Board, {
			props: {
				game_data: make_game_data({ flash_colors: ['red', 'blue'] }),
				...BOARD_TEXT_PROPS,
			},
		})

		expect(container).toBeTruthy()
	})
})

describe('Board font selection — driven by CRT, not CYBER (is_alt)', () => {
	it('derives should_use_alt_font from !crt.is_crt_enabled', () => {
		expect(BOARD_SOURCE).toMatch(
			/(?:let|const)\s+should_use_alt_font\s*=\s*\$derived\(\s*!\s*crt\.is_crt_enabled\s*\)/u,
		)
	})

	it('current_font and current_font_size use should_use_alt_font (not is_alt)', () => {
		expect(BOARD_SOURCE).toMatch(
			/(?:let|const)\s+current_font\s*=\s*\$derived\(\s*fonts\.get_font\(\s*should_use_alt_font\s*\)\s*\)/u,
		)
		expect(BOARD_SOURCE).toMatch(/fonts\.get_font_size_multiplier\(\s*should_use_alt_font\s*\)/u)
	})

	it('imports crt from $lib/game-kit/crt.svelte', () => {
		expect(BOARD_SOURCE).toMatch(
			/import\s*\{[^}]*\bcrt\b[^}]*\}\s*from\s*'\$lib\/game-kit\/crt\.svelte'/u,
		)
	})

	it('keeps is_alt prop driving button palette (lit/dim color helpers)', () => {
		expect(BOARD_SOURCE).toMatch(/return\s+is_alt\s*\?\s*btn\.cyber_lit_color/u)
		expect(BOARD_SOURCE).toMatch(/return\s+is_alt\s*\?\s*btn\.cyber_dim_color/u)
	})

	it('does not pass is_alt directly into fonts helpers', () => {
		expect(BOARD_SOURCE).not.toMatch(/fonts\.get_font\(\s*is_alt\s*\)/u)
		expect(BOARD_SOURCE).not.toMatch(/fonts\.get_font_size_multiplier\(\s*is_alt\s*\)/u)
	})
})

describe('Board center label — START, ROUND digit, and 2-line GAME OVER', () => {
	it('FONT_SIZE is pinned to 0.13 — bumped for a larger single-line START label', () => {
		// Reason: FONT_SIZE drives the START / idle label only; pin the literal value
		// so the requested size bump is not silently undone.
		expect(BOARD_SOURCE).toMatch(/const\s+FONT_SIZE\s*=\s*0\.13\b/u)
	})

	it('MULTILINE_FONT_SIZE is pinned to 0.16 — per-line size used by the 2-line GAME OVER label', () => {
		// Reason: GAME OVER is the only 2-line center label; pin the per-line size so
		// the relative hierarchy with START (single-line) is preserved.
		expect(BOARD_SOURCE).toMatch(/const\s+MULTILINE_FONT_SIZE\s*=\s*0\.16\b/u)
	})

	it('ROUND_DIGIT_FONT_SIZE is pinned to 0.2 — size for the digit-only ROUND display', () => {
		// Reason: during a round the center shows just the round number, which is the
		// focal info during play; pin the literal so it stays at the chosen prominence.
		expect(BOARD_SOURCE).toMatch(/const\s+ROUND_DIGIT_FONT_SIZE\s*=\s*0\.2\b/u)
	})

	it('MULTILINE_LINE_HEIGHT is pinned to 1.4 — gives GAME / OVER a little breathing room', () => {
		expect(BOARD_SOURCE).toMatch(/const\s+MULTILINE_LINE_HEIGHT\s*=\s*1\.4\b/u)
	})

	it('center font sizes follow the intended hierarchy: ROUND_DIGIT > MULTILINE > FONT_SIZE', () => {
		const fz = BOARD_SOURCE.match(/const\s+FONT_SIZE\s*=\s*(-?\d+(?:\.\d+)?)/u)
		const ml = BOARD_SOURCE.match(/const\s+MULTILINE_FONT_SIZE\s*=\s*(-?\d+(?:\.\d+)?)/u)
		const rd = BOARD_SOURCE.match(/const\s+ROUND_DIGIT_FONT_SIZE\s*=\s*(-?\d+(?:\.\d+)?)/u)

		expect(fz).not.toBeNull()
		expect(ml).not.toBeNull()
		expect(rd).not.toBeNull()
		expect(Number(ml?.[1])).toBeGreaterThan(Number(fz?.[1]))
		expect(Number(rd?.[1])).toBeGreaterThan(Number(ml?.[1]))
	})

	it('GAME OVER text is split into two lines by replacing its space with a newline', () => {
		expect(BOARD_SOURCE).toMatch(/text_gameover\.replace\(\s*['"`] ['"`]\s*,\s*['"`]\\n['"`]\s*\)/u)
	})

	it('ROUND state renders only the round number (no label prefix, no newline)', () => {
		expect(BOARD_SOURCE).toMatch(/return\s+String\(\s*game_data\.round\s*\)/u)
		// Sanity: the old "label\nnumber" template should be gone.
		expect(BOARD_SOURCE).not.toMatch(/`\$\{text_round\}\\n\$\{game_data\.round\}`/u)
	})

	it('is_multiline_center is true only for the gameover phase (round display is single-line)', () => {
		expect(BOARD_SOURCE).toMatch(
			/is_multiline_center\s*=\s*\$derived\(\s*game_data\.phase\s*===\s*['"]gameover['"]\s*\)/u,
		)
	})

	it('center base font size has a 3-way selection (gameover → MULTILINE, round>0 → ROUND_DIGIT, else → FONT_SIZE)', () => {
		expect(BOARD_SOURCE).toMatch(
			/function\s+get_center_base_font_size\(\)\s*:\s*number\s*\{[\s\S]*MULTILINE_FONT_SIZE[\s\S]*ROUND_DIGIT_FONT_SIZE[\s\S]*FONT_SIZE[\s\S]*\}/u,
		)
		expect(BOARD_SOURCE).toMatch(
			/center_base_font_size\s*=\s*\$derived\(\s*get_center_base_font_size\(\)\s*\)/u,
		)
	})

	it('Text component receives lineHeight={current_line_height} so GAME OVER gets extra spacing', () => {
		expect(BOARD_SOURCE).toMatch(/<Text[\s\S]*lineHeight=\{current_line_height\}[\s\S]*\/>/u)
		// Whitespace-normalized substring check avoids the long chain of `\s*` separators
		// (SonarCloud rule typescript:S5852 flags such patterns as ReDoS candidates).
		const normalized = BOARD_SOURCE.replaceAll(/\s+/gu, ' ')

		expect(normalized).toContain(
			'current_line_height = $derived( is_multiline_center ? MULTILINE_LINE_HEIGHT : SINGLE_LINE_HEIGHT',
		)
	})
})

describe('templates Board mirrors the CRT-driven font behavior', () => {
	it('derives should_use_alt_font from !crt.is_crt_enabled', () => {
		expect(TEMPLATE_BOARD_SOURCE).toMatch(
			/(?:let|const)\s+should_use_alt_font\s*=\s*\$derived\(\s*!\s*crt\.is_crt_enabled\s*\)/u,
		)
	})

	it('imports crt from @joshuafolkken/game-kit', () => {
		expect(TEMPLATE_BOARD_SOURCE).toMatch(
			/import\s*\{[^}]*\bcrt\b[^}]*\}\s*from\s*'@joshuafolkken\/game-kit'/u,
		)
	})

	it('does not pass is_alt directly into fonts helpers', () => {
		expect(TEMPLATE_BOARD_SOURCE).not.toMatch(/fonts\.get_font\(\s*is_alt\s*\)/u)
		expect(TEMPLATE_BOARD_SOURCE).not.toMatch(/fonts\.get_font_size_multiplier\(\s*is_alt\s*\)/u)
	})
})
