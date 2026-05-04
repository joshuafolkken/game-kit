import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
import SceneObjects from './SceneObjects.svelte';
import type { ScoreData } from '$lib/game/score-display-types';

vi.mock('@threlte/core', () => ({
	T: {},
	useThrelte: vi.fn(() => ({ camera: {} })),
	useTask: vi.fn()
}));
vi.mock('@threlte/extras', () => ({
	interactivity: vi.fn(),
	Text: function Text() {}
}));
vi.mock('./Room.svelte', () => ({ default: function Room() {} }));
vi.mock('./player/Player.svelte', () => ({ default: function Player() {} }));
vi.mock('./ScoreDisplay.svelte', () => ({ default: function ScoreDisplay() {} }));
vi.mock('./Switch.svelte', () => ({ default: function Switch() {} }));
vi.mock('./FloorCredits.svelte', () => ({ default: function FloorCredits() {} }));
vi.mock('$lib/game/fullscreen.svelte', () => ({ fullscreen: { is_active: false } }));
vi.mock('$lib/game/state.svelte', () => ({ game_state: { is_alt: false } }));
vi.mock('$lib/game/pointer-compute.js', () => ({
	make_pointer_compute: vi.fn(() => vi.fn())
}));
vi.mock('$lib/game/lighting', () => ({
	lighting: {
		get_ambient_intensity: vi.fn(() => 1),
		get_ambient_color: vi.fn(() => '#fff'),
		get_point_light_intensity: vi.fn(() => 1)
	}
}));
vi.mock('$lib/game/fonts', () => ({
	fonts: {
		get_font: vi.fn(() => 'sans'),
		get_font_size_multiplier: vi.fn(() => 1)
	}
}));
vi.mock('$lib/game/room-config', () => ({ ROOM_W: 10, ROOM_D: 10, ROOM_H: 5 }));
vi.mock('$lib/game/switch-colors', () => ({
	CYBER_SWITCH_COLORS: {},
	FULLSCREEN_SWITCH_COLORS: {},
	FPS_SWITCH_COLORS: {}
}));
vi.mock('$lib/game/alt-switch-input', () => ({
	alt_switch_input: { on_click: vi.fn() }
}));
vi.mock('$lib/game/fullscreen-switch-input', () => ({
	fullscreen_switch_input: { on_click: vi.fn() }
}));
vi.mock('$lib/game/fps-switch-input', () => ({
	fps_switch_input: { on_click: vi.fn() }
}));
vi.mock('$lib/game/fps.svelte', () => ({
	fps: { is_fps_enabled: true, current_fps_text: '---', toggle: vi.fn() }
}));
vi.mock('./FpsDisplay.svelte', () => ({ default: function FpsDisplay() {} }));

const MOCK_CREDITS_START_Z = 10;
const MOCK_CREDITS_END_Z = -10;
const MOCK_SCORE_DATA: ScoreData = {
	high_score: 0,
	current_score: 0,
	is_new_high_score: false,
	high_score_round: 0,
	last_cleared_round: 0,
	format_score: String
};

const MOCK_MESSAGES = {
	game_title: 'SIMON',
	alt_switch_label: 'ALT',
	fullscreen_switch_label: 'FULLSCREEN',
	fps_switch_label: 'FPS',
	score_high_score: 'HI',
	score_round: 'RND',
	score_current: 'SCORE'
};

const MOCK_SCORE_DISPLAY_Z = -4.65;

function make_props(game_board: ReturnType<typeof createRawSnippet>) {
	return {
		game_board,
		score_data: MOCK_SCORE_DATA,
		is_gameover: false,
		credits_text: 'Credits',
		credits_start_z: MOCK_CREDITS_START_Z,
		credits_end_z: MOCK_CREDITS_END_Z,
		messages: MOCK_MESSAGES,
		score_display_z: MOCK_SCORE_DISPLAY_Z
	};
}

describe('SceneObjects', () => {
	it('renders without error with a game_board snippet', () => {
		const game_board = createRawSnippet(() => ({ render: () => '<span></span>' }));
		const { container } = render(SceneObjects, { props: make_props(game_board) });
		expect(container).toBeTruthy();
	});

	it('renders the game_board snippet content', () => {
		const game_board = createRawSnippet(() => ({
			render: () => '<span data-testid="board-slot"></span>'
		}));
		const { container } = render(SceneObjects, { props: make_props(game_board) });
		expect(container.querySelector('[data-testid="board-slot"]')).toBeTruthy();
	});

	it('renders with default props without error', () => {
		const game_board = createRawSnippet(() => ({ render: () => '<span></span>' }));
		const { container } = render(SceneObjects, { props: make_props(game_board) });
		expect(container).toBeTruthy();
	});
});
