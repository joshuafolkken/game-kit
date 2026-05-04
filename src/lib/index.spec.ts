import { describe, it, expect } from 'vitest';
import {
	session,
	game_state,
	input,
	loading,
	fullscreen,
	fps,
	device,
	alt_switch_input,
	fps_switch_input,
	fullscreen_switch_input,
	audio,
	switch_audio,
	fonts,
	lighting,
	camera_shake,
	player_bounds,
	player_jump,
	player_speed,
	player_step,
	player_velocity,
	credits_scroll,
	CYBER_SWITCH_COLORS,
	FPS_SWITCH_COLORS,
	FULLSCREEN_SWITCH_COLORS,
	SWITCH_ICON_TYPES,
	DEFAULT_SWITCH_GEOMETRY,
	base_messages,
	MIN_DISPLAY_MS,
	OVERLAY_ELEMENT_ID,
	OBSERVER_GLOBAL_KEY
} from '$lib/index';

describe('library index exports', () => {
	it('exports state singletons', () => {
		expect(session).toBeDefined();
		expect(game_state).toBeDefined();
		expect(input).toBeDefined();
		expect(loading).toBeDefined();
		expect(fullscreen).toBeDefined();
		expect(fps).toBeDefined();
		expect(device).toBeDefined();
	});

	it('exports switch inputs', () => {
		expect(alt_switch_input).toBeDefined();
		expect(fps_switch_input).toBeDefined();
		expect(fullscreen_switch_input).toBeDefined();
	});

	it('exports utilities', () => {
		expect(audio).toBeDefined();
		expect(switch_audio).toBeDefined();
		expect(fonts).toBeDefined();
		expect(lighting).toBeDefined();
	});

	it('exports player modules', () => {
		expect(camera_shake).toBeDefined();
		expect(player_bounds).toBeDefined();
		expect(player_jump).toBeDefined();
		expect(player_speed).toBeDefined();
		expect(player_step).toBeDefined();
		expect(player_velocity).toBeDefined();
	});

	it('exports credits_scroll with make_credits_scroll_bounds and advance_scroll', () => {
		expect(typeof credits_scroll.make_credits_scroll_bounds).toBe('function');
		expect(typeof credits_scroll.advance_scroll).toBe('function');
	});

	it('exports switch colors and config', () => {
		expect(CYBER_SWITCH_COLORS).toBeDefined();
		expect(FPS_SWITCH_COLORS).toBeDefined();
		expect(FULLSCREEN_SWITCH_COLORS).toBeDefined();
		expect(SWITCH_ICON_TYPES).toEqual(['cyber', 'fullscreen', 'fps']);
		expect(DEFAULT_SWITCH_GEOMETRY).toBeDefined();
	});

	it('exports base_messages with required keys', () => {
		expect(base_messages.press_start).toBe('PRESS START');
		expect(base_messages.score_high_score).toBe('HI');
		expect(base_messages.score_current).toBe('SCORE');
	});

	it('exports loading constants', () => {
		expect(typeof MIN_DISPLAY_MS).toBe('number');
		expect(typeof OVERLAY_ELEMENT_ID).toBe('string');
		expect(typeof OBSERVER_GLOBAL_KEY).toBe('string');
	});
});
