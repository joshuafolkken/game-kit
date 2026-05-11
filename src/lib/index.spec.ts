import {
	alt_switch_input,
	audio,
	base_messages,
	camera_shake,
	credits_scroll,
	CYBER_SWITCH_COLORS,
	DEFAULT_SWITCH_GEOMETRY,
	device,
	fonts,
	fps,
	FPS_SWITCH_COLORS,
	fps_switch_input,
	fullscreen,
	FULLSCREEN_SWITCH_COLORS,
	fullscreen_switch_input,
	game_state,
	HALF_D,
	HALF_W,
	input,
	lighting,
	loading,
	MIN_DISPLAY_MS,
	OBSERVER_GLOBAL_KEY,
	OVERLAY_ELEMENT_ID,
	player_bounds,
	player_jump,
	player_speed,
	player_step,
	player_velocity,
	pointer_button,
	ROOM_D,
	ROOM_H,
	ROOM_W,
	session,
	switch_audio,
	SWITCH_ICON_TYPES,
} from '$lib/index'
import { describe, expect, it } from 'vitest'

describe('library index exports', () => {
	it('exports state singletons', () => {
		expect(session).toBeDefined()
		expect(game_state).toBeDefined()
		expect(input).toBeDefined()
		expect(loading).toBeDefined()
		expect(fullscreen).toBeDefined()
		expect(fps).toBeDefined()
		expect(device).toBeDefined()
	})

	it('exports switch inputs', () => {
		expect(alt_switch_input).toBeDefined()
		expect(fps_switch_input).toBeDefined()
		expect(fullscreen_switch_input).toBeDefined()
	})

	it('exports utilities', () => {
		expect(audio).toBeDefined()
		expect(switch_audio).toBeDefined()
		expect(fonts).toBeDefined()
		expect(lighting).toBeDefined()
	})

	it('exports player modules', () => {
		expect(camera_shake).toBeDefined()
		expect(player_bounds).toBeDefined()
		expect(player_jump).toBeDefined()
		expect(player_speed).toBeDefined()
		expect(player_step).toBeDefined()
		expect(player_velocity).toBeDefined()
	})

	it('exports credits_scroll with make_credits_scroll_bounds and advance_scroll', () => {
		expect(typeof credits_scroll.make_credits_scroll_bounds).toBe('function')
		expect(typeof credits_scroll.advance_scroll).toBe('function')
	})

	it('exports switch colors and config', () => {
		expect(CYBER_SWITCH_COLORS).toBeDefined()
		expect(FPS_SWITCH_COLORS).toBeDefined()
		expect(FULLSCREEN_SWITCH_COLORS).toBeDefined()
		expect(SWITCH_ICON_TYPES).toEqual(['cyber', 'fullscreen', 'fps'])
		expect(DEFAULT_SWITCH_GEOMETRY).toBeDefined()
	})

	it('exports base_messages with required keys', () => {
		expect(base_messages.press_start).toBe('PRESS START')
		expect(base_messages.score_high_score).toBe('HI')
		expect(base_messages.score_current).toBe('SCORE')
	})

	it('exports loading constants', () => {
		expect(typeof MIN_DISPLAY_MS).toBe('number')
		expect(typeof OVERLAY_ELEMENT_ID).toBe('string')
		expect(typeof OBSERVER_GLOBAL_KEY).toBe('string')
	})

	it('exports room config constants with correct values', () => {
		expect(ROOM_W).toBe(10)
		expect(ROOM_D).toBe(10)
		expect(ROOM_H).toBe(3)
		expect(HALF_W).toBe(ROOM_W / 2)
		expect(HALF_D).toBe(ROOM_D / 2)
	})

	it('exports pointer_button with is_left_click', () => {
		expect(typeof pointer_button.is_left_click).toBe('function')
		expect(pointer_button.is_left_click({ nativeEvent: { button: 0 } })).toBe(true)
		expect(pointer_button.is_left_click({ nativeEvent: { button: 2 } })).toBe(false)
	})
})
