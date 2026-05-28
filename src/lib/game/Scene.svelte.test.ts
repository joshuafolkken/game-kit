import { make_credits_scroll_bounds } from '$lib/game-kit/scene/credits-config'
import { messages } from '$lib/game/messages'
import { score } from '$lib/game/Score.svelte'
import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-svelte'
import Scene from './Scene.svelte'

vi.mock('$lib/game-kit/scene/SceneObjects.svelte', () => ({
	default: function SceneObjects() {
		/* no-op */
	},
}))
vi.mock('$lib/game/Board.svelte', () => ({
	default: function Board() {
		/* no-op */
	},
}))
vi.mock('$lib/game/board-config', () => ({
	SCORE_DISPLAY_Z: -4.65,
}))
vi.mock('$lib/game-kit/State.svelte', () => ({ game_state: { is_alt: false } }))
vi.mock('$lib/game/messages', () => ({
	messages: {
		game_title: 'JOSHUA GAME',
		cyber_switch_label: 'CYBER',
		score_high_score: 'HI',
		score_round: 'RND',
		score_current: 'SCORE',
		game_gameover: 'GAME OVER',
		game_round: 'ROUND',
		game_start: 'START',
	},
}))
vi.mock('$lib/game/Game.svelte', () => ({
	game: {
		active_color: null,
		pressed_color: null,
		phase: 'idle',
		round: 0,
		flash_colors: [],
		flash_intensity: 1,
	},
}))
vi.mock('$lib/game/Score.svelte', () => ({
	score: {
		high_score: 42,
		current_score: 7,
		is_new_high_score: true,
		high_score_round: 5,
		last_cleared_round: 3,
		format_score: String,
	},
}))
vi.mock('$lib/game/credits', () => ({
	CREDITS_TEXT: 'Credits',
	CREDITS_LINE_COUNT: 1,
}))
vi.mock('$lib/game-kit/scene/credits-config', () => ({
	make_credits_scroll_bounds: vi.fn(() => ({ start_z: 10, end_z: -10 })),
}))
vi.mock('$lib/game-kit/scene/room-config', () => ({ ROOM_W: 10, ROOM_D: 10, ROOM_H: 5, HALF_D: 5 }))

describe('Scene', () => {
	it('renders without error', () => {
		const { container } = render(Scene)

		expect(container).toBeTruthy()
	})

	it('calls make_credits_scroll_bounds with CREDITS_LINE_COUNT and HALF_D', () => {
		render(Scene)
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
