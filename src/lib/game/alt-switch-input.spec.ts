import { switch_audio } from '$lib/game/switch-audio'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { alt_switch_input } from './alt-switch-input'
import { session } from './session.svelte'
import { game_state } from './state.svelte'

describe('alt_switch_input', () => {
	beforeEach(() => {
		session.reset_session()
		game_state.reset_mode()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('does not toggle alt mode when session is not started', () => {
		alt_switch_input.on_click()
		expect(game_state.is_alt).toBe(false)
	})

	it('toggles alt mode once session has started', () => {
		session.start_session()
		alt_switch_input.on_click()
		expect(game_state.is_alt).toBe(true)
	})

	it('toggles alt mode twice when clicked twice after session started', () => {
		session.start_session()
		alt_switch_input.on_click()
		alt_switch_input.on_click()
		expect(game_state.is_alt).toBe(false)
	})

	it('plays switch click sound when session is started', () => {
		session.start_session()
		const spy = vi.spyOn(switch_audio, 'play_switch_click').mockImplementation(() => {})
		alt_switch_input.on_click()
		expect(spy).toHaveBeenCalledTimes(1)
	})

	it('does not play switch click sound when session is not started', () => {
		const spy = vi.spyOn(switch_audio, 'play_switch_click').mockImplementation(() => {})
		alt_switch_input.on_click()
		expect(spy).not.toHaveBeenCalled()
	})
})
