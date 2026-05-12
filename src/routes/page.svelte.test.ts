import { game_state } from '$lib/game/state.svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-svelte'
import Page from './+page.svelte'

describe('Home page', () => {
	beforeEach(() => {
		if (game_state.is_alt) game_state.toggle_alt()
	})

	afterEach(() => {
		if (game_state.is_alt) game_state.toggle_alt()
	})

	it('does not render cyber-glow in normal mode', () => {
		const { container } = render(Page)
		expect(container.querySelector('[data-testid="cyber-glow"]')).toBeNull()
	})

	it('renders cyber-glow when cyber mode is active', () => {
		game_state.toggle_alt()
		const { container } = render(Page)
		expect(container.querySelector('[data-testid="cyber-glow"]')).toBeTruthy()
	})
})
