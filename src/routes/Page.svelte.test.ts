import { game_state } from '$lib/game-kit/State.svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-svelte'
import Page from './+page.svelte'

const SEL_CYBER_GLOW = '[data-testid="cyber-glow"]'

describe('Home page', () => {
	beforeEach(() => {
		if (game_state.is_alt) game_state.toggle_alt()
	})

	afterEach(() => {
		if (game_state.is_alt) game_state.toggle_alt()
	})

	it('does not render cyber-glow in normal mode', () => {
		const { container } = render(Page)

		expect(container.querySelector(SEL_CYBER_GLOW)).toBeNull()
	})

	it('renders cyber-glow when cyber mode is active', () => {
		game_state.toggle_alt()
		const { container } = render(Page)

		expect(container.querySelector(SEL_CYBER_GLOW)).toBeTruthy()
	})
})
