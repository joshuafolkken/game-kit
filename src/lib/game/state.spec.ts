import { describe, it, expect, beforeEach } from 'vitest';
import { game_state, create_game_state } from './state.svelte';

describe('game_state', () => {
	beforeEach(() => {
		game_state.reset_mode();
	});

	it('starts with alt mode off', () => {
		expect(game_state.is_alt).toBe(false);
	});

	it('toggles alt mode on', () => {
		game_state.toggle_alt();
		expect(game_state.is_alt).toBe(true);
	});

	it('toggles alt mode off again', () => {
		game_state.toggle_alt();
		game_state.toggle_alt();
		expect(game_state.is_alt).toBe(false);
	});

	it('resets alt mode to default (off) on reset_mode', () => {
		game_state.toggle_alt();
		game_state.reset_mode();
		expect(game_state.is_alt).toBe(false);
	});

	it('set_alt(true) sets alt mode on', () => {
		game_state.set_alt(true);
		expect(game_state.is_alt).toBe(true);
	});

	it('set_alt(false) sets alt mode off', () => {
		game_state.set_alt(true);
		game_state.set_alt(false);
		expect(game_state.is_alt).toBe(false);
	});
});

describe('create_game_state isolation', () => {
	it('two instances do not share is_alt state', () => {
		const a = create_game_state();
		const b = create_game_state();
		a.toggle_alt();
		expect(a.is_alt).toBe(true);
		expect(b.is_alt).toBe(false);
	});
});
