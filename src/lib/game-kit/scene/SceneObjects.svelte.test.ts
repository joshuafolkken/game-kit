import type { ScoreData } from '$lib/game-kit/display/score-display-types'
import { createRawSnippet } from 'svelte'
import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-svelte'
import SceneObjects from './SceneObjects.svelte'
import SCENE_OBJECTS_SOURCE from './SceneObjects.svelte?raw'

vi.mock('@threlte/core', () => ({
	T: {},
	useThrelte: vi.fn(() => ({ camera: {} })),
	useTask: vi.fn(),
}))
vi.mock('@threlte/extras', () => ({
	interactivity: vi.fn(),
	Text: function Text() {},
}))
vi.mock('./Room.svelte', () => ({ default: function Room() {} }))
vi.mock('$lib/game-kit/player/Player.svelte', () => ({ default: function Player() {} }))
vi.mock('$lib/game-kit/display/ScoreDisplay.svelte', () => ({
	default: function ScoreDisplay() {},
}))
vi.mock('$lib/game-kit/switch/Switch.svelte', () => ({ default: function Switch() {} }))
vi.mock('./FloorCredits.svelte', () => ({ default: function FloorCredits() {} }))
vi.mock('$lib/game-kit/fullscreen.svelte', () => ({ fullscreen: { is_active: false } }))
vi.mock('$lib/game-kit/state.svelte', () => ({ game_state: { is_alt: false } }))
vi.mock('$lib/game-kit/input/pointer-compute.js', () => ({
	make_pointer_compute: vi.fn(() => vi.fn()),
}))
vi.mock('$lib/game-kit/scene/lighting', () => ({
	lighting: {
		get_ambient_intensity: vi.fn(() => 1),
		get_ambient_color: vi.fn(() => '#fff'),
		get_point_light_intensity: vi.fn(() => 1),
	},
}))
vi.mock('$lib/game-kit/fonts', () => ({
	fonts: {
		get_font: vi.fn(() => 'sans'),
		get_font_size_multiplier: vi.fn(() => 1),
	},
}))
vi.mock('$lib/game-kit/scene/room-config', () => ({ ROOM_W: 10, ROOM_D: 10, ROOM_H: 5 }))
vi.mock('$lib/game-kit/switch/switch-colors', () => ({
	CYBER_SWITCH_COLORS: {},
	FULLSCREEN_SWITCH_COLORS: {},
	FPS_SWITCH_COLORS: {},
	CRT_SWITCH_COLORS: {},
}))
vi.mock('$lib/game-kit/switch/alt-switch-input', () => ({
	alt_switch_input: { on_click: vi.fn() },
}))
vi.mock('$lib/game-kit/switch/crt-switch-input', () => ({
	crt_switch_input: { on_click: vi.fn() },
}))
vi.mock('$lib/game-kit/switch/fullscreen-switch-input', () => ({
	fullscreen_switch_input: { on_click: vi.fn() },
}))
vi.mock('$lib/game-kit/switch/fps-switch-input', () => ({
	fps_switch_input: { on_click: vi.fn() },
}))
vi.mock('$lib/game-kit/crt.svelte', () => ({
	crt: { is_crt_enabled: true, toggle: vi.fn() },
}))
vi.mock('$lib/game-kit/display/fps.svelte', () => ({
	fps: { is_fps_enabled: true, current_fps_text: '---', toggle: vi.fn() },
}))
vi.mock('$lib/game-kit/display/FpsDisplay.svelte', () => ({ default: function FpsDisplay() {} }))

const MOCK_CREDITS_START_Z = 10
const MOCK_CREDITS_END_Z = -10
const MOCK_SCORE_DATA: ScoreData = {
	high_score: 0,
	current_score: 0,
	is_new_high_score: false,
	high_score_round: 0,
	last_cleared_round: 0,
	format_score: String,
}

const MOCK_MESSAGES = {
	game_title: 'JOSHUA GAME',
	alt_switch_label: 'ALT',
	score_high_score: 'HI',
	score_round: 'RND',
	score_current: 'SCORE',
}

const MOCK_SCORE_DISPLAY_Z = -4.65

function make_props(game_board: ReturnType<typeof createRawSnippet>) {
	return {
		game_board,
		score_data: MOCK_SCORE_DATA,
		is_gameover: false,
		credits_text: 'Credits',
		credits_start_z: MOCK_CREDITS_START_Z,
		credits_end_z: MOCK_CREDITS_END_Z,
		messages: MOCK_MESSAGES,
		score_display_z: MOCK_SCORE_DISPLAY_Z,
	}
}

describe('SceneObjects', () => {
	it('renders without error with a game_board snippet', () => {
		const game_board = createRawSnippet(() => ({ render: () => '<span></span>' }))
		const { container } = render(SceneObjects, { props: make_props(game_board) })

		expect(container).toBeTruthy()
	})

	it('renders the game_board snippet content', () => {
		const game_board = createRawSnippet(() => ({
			render: () => '<span data-testid="board-slot"></span>',
		}))
		const { container } = render(SceneObjects, { props: make_props(game_board) })

		expect(container.querySelector('[data-testid="board-slot"]')).toBeTruthy()
	})

	it('renders with default props without error', () => {
		const game_board = createRawSnippet(() => ({ render: () => '<span></span>' }))
		const { container } = render(SceneObjects, { props: make_props(game_board) })

		expect(container).toBeTruthy()
	})
})

describe('SceneObjects font selection — driven by CRT, not CYBER (is_alt)', () => {
	it('derives should_use_alt_font from !crt.is_crt_enabled (font swaps with CRT, not CYBER)', () => {
		expect(SCENE_OBJECTS_SOURCE).toMatch(
			/(?:let|const)\s+should_use_alt_font\s*=\s*\$derived\(\s*!\s*crt\.is_crt_enabled\s*\)/u,
		)
	})

	it('current_font passes should_use_alt_font into fonts.get_font (not is_alt)', () => {
		expect(SCENE_OBJECTS_SOURCE).toMatch(
			/(?:let|const)\s+current_font\s*=\s*\$derived\(\s*fonts\.get_font\(\s*should_use_alt_font\s*\)\s*\)/u,
		)
	})

	it('current_font_size_multiplier passes should_use_alt_font into fonts.get_font_size_multiplier', () => {
		expect(SCENE_OBJECTS_SOURCE).toMatch(
			/(?:let|const)\s+current_font_size_multiplier\s*=\s*\$derived\(\s*fonts\.get_font_size_multiplier\(\s*should_use_alt_font\s*\)\s*\)/u,
		)
	})

	it('imports crt from $lib/game-kit/crt.svelte so the derived can read is_crt_enabled', () => {
		expect(SCENE_OBJECTS_SOURCE).toMatch(
			/import\s*\{[^}]*\bcrt\b[^}]*\}\s*from\s*'\$lib\/game-kit\/crt\.svelte'/u,
		)
	})

	it('does not pass is_alt directly into fonts helpers (font is no longer CYBER-driven)', () => {
		expect(SCENE_OBJECTS_SOURCE).not.toMatch(/fonts\.get_font\(\s*is_alt\s*\)/u)
		expect(SCENE_OBJECTS_SOURCE).not.toMatch(/fonts\.get_font_size_multiplier\(\s*is_alt\s*\)/u)
	})
})
