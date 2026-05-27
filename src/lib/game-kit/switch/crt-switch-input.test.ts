import { crt } from '$lib/game-kit/Crt.svelte'
import { session } from '$lib/game-kit/Session.svelte'
import { switch_audio } from '$lib/game-kit/switch/switch-audio'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { crt_switch_input } from './crt-switch-input.js'

describe('crt_switch_input', () => {
	beforeEach(() => {
		session.reset_session()
		if (!crt.is_crt_enabled) crt.toggle()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('does not toggle CRT when session is not started', () => {
		crt_switch_input.on_click()
		expect(crt.is_crt_enabled).toBe(true)
	})

	it('toggles CRT once session has started', () => {
		session.start_session()
		crt_switch_input.on_click()
		expect(crt.is_crt_enabled).toBe(false)
	})

	it('toggles CRT twice when clicked twice after session started', () => {
		session.start_session()
		crt_switch_input.on_click()
		crt_switch_input.on_click()
		expect(crt.is_crt_enabled).toBe(true)
	})

	it('plays switch click sound when session is started', () => {
		session.start_session()
		const spy = vi.spyOn(switch_audio, 'play_switch_click').mockImplementation(() => {})

		crt_switch_input.on_click()
		expect(spy).toHaveBeenCalledTimes(1)
	})

	it('does not play switch click sound when session is not started', () => {
		const spy = vi.spyOn(switch_audio, 'play_switch_click').mockImplementation(() => {})

		crt_switch_input.on_click()
		expect(spy).not.toHaveBeenCalled()
	})
})
