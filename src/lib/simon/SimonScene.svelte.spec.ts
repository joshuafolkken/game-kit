import { make_credits_scroll_bounds } from '$lib/game/credits-config'
import { messages } from '$lib/messages/en'
import { score } from '$lib/simon/score.svelte'
import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-svelte'
import SimonScene from './SimonScene.svelte'

vi.mock('$lib/game/SceneObjects.svelte', () => ({ default: function SceneObjects() {} }))
vi.mock('$lib/simon/SimonBoard.svelte', () => ({ default: function SimonBoard() {} }))
vi.mock('$lib/simon/board-config', () => ({
	SCORE_DISPLAY_Z: -4.65,
}))
vi.mock('$lib/game/state.svelte', () => ({ game_state: { is_alt: false } }))
vi.mock('$lib/messages/en', () => ({
	messages: {
		game_title: 'SIMON',
		cyber_switch_label: 'CYBER',
		fullscreen_switch_label: 'FULLSCREEN',
		fps_switch_label: 'FPS',
		score_high_score: 'HI',
		score_round: 'RND',
		score_current: 'SCORE',
		simon_gameover: 'GAME OVER',
		simon_round: 'ROUND',
		simon_start: 'START',
	},
}))
vi.mock('$lib/simon/simon.svelte', () => ({
	simon: {
		active_color: null,
		pressed_color: null,
		phase: 'idle',
		round: 0,
		flash_colors: [],
		flash_intensity: 1,
	},
}))
vi.mock('$lib/simon/score.svelte', () => ({
	score: {
		high_score: 42,
		current_score: 7,
		is_new_high_score: true,
		high_score_round: 5,
		last_cleared_round: 3,
		format_score: String,
	},
}))
vi.mock('$lib/simon/credits', () => ({
	CREDITS_TEXT: 'Credits',
	CREDITS_LINE_COUNT: 1,
}))
vi.mock('$lib/game/credits-config', () => ({
	make_credits_scroll_bounds: vi.fn(() => ({ start_z: 10, end_z: -10 })),
}))
vi.mock('$lib/game/room-config', () => ({ ROOM_W: 10, ROOM_D: 10, ROOM_H: 5, HALF_D: 5 }))

describe('SimonScene', () => {
	it('renders without error', () => {
		const { container } = render(SimonScene)
		expect(container).toBeTruthy()
	})

	it('calls make_credits_scroll_bounds with CREDITS_LINE_COUNT and HALF_D', () => {
		render(SimonScene)
		expect(vi.mocked(make_credits_scroll_bounds)).toHaveBeenCalledWith(1, 5)
	})

	it('score module exposes all required score_data fields', () => {
		expect(score.high_score).toBe(42)
		expect(score.current_score).toBe(7)
		expect(score.is_new_high_score).toBe(true)
		expect(score.high_score_round).toBe(5)
		expect(score.last_cleared_round).toBe(3)
	})

	it('messages use score_high_score key (no score_label prefix)', () => {
		expect(messages.score_high_score).toBe('HI')
		expect(messages.score_round).toBe('RND')
		expect(messages.score_current).toBe('SCORE')
	})
})
