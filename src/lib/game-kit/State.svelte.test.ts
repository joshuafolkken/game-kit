import { create_game_state } from '$lib/game-kit/State.svelte'
import { describe, expect, it } from 'vitest'

describe('game state', () => {
	it('starts with is_alt false', () => {
		const state = create_game_state()

		expect(state.is_alt).toBe(false)
	})

	it('set_alt assigns the given value', () => {
		const state = create_game_state()

		state.set_alt(true)
		expect(state.is_alt).toBe(true)

		state.set_alt(false)
		expect(state.is_alt).toBe(false)
	})

	it('toggle_alt flips is_alt', () => {
		const state = create_game_state()

		state.toggle_alt()
		expect(state.is_alt).toBe(true)

		state.toggle_alt()
		expect(state.is_alt).toBe(false)
	})

	it('reset_mode restores the default', () => {
		const state = create_game_state()

		state.set_alt(true)
		state.reset_mode()
		expect(state.is_alt).toBe(false)
	})
})
