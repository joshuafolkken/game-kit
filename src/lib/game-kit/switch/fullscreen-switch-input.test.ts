import { session } from '$lib/game-kit/Session.svelte'
import { create_fullscreen_switch_input } from '$lib/game-kit/switch/fullscreen-switch-input'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { request_mock, exit_mock, fullscreen_state } = vi.hoisted(() => ({
	request_mock: vi.fn<(element: HTMLElement) => void>(),
	exit_mock: vi.fn<() => void>(),
	fullscreen_state: { is_active: false },
}))

vi.mock('$lib/game-kit/Fullscreen.svelte', () => ({
	fullscreen: {
		get is_active(): boolean {
			return fullscreen_state.is_active
		},
		request: request_mock,
		exit: exit_mock,
	},
}))

// The fullscreen module is mocked, so the container is only an opaque non-null token passed
// through to request() — a fake avoids needing a DOM in the node (server) test project.
const fake_element = {} as unknown as HTMLElement

describe('fullscreen_switch_input', () => {
	beforeEach(() => {
		session.reset_session()
		request_mock.mockClear()
		exit_mock.mockClear()
		fullscreen_state.is_active = false
	})

	it('does nothing when the session has not started', () => {
		const input = create_fullscreen_switch_input()

		input.set_container(fake_element)
		input.on_click()
		expect(request_mock).not.toHaveBeenCalled()
	})

	it('does nothing when no container is set', () => {
		session.start_session()
		const input = create_fullscreen_switch_input()

		input.on_click()
		expect(request_mock).not.toHaveBeenCalled()
	})

	it('requests fullscreen on the container when inactive', () => {
		session.start_session()
		const input = create_fullscreen_switch_input()

		input.set_container(fake_element)
		input.on_click()
		expect(request_mock).toHaveBeenCalledWith(fake_element)
	})

	it('exits fullscreen when already active', () => {
		session.start_session()
		fullscreen_state.is_active = true
		const input = create_fullscreen_switch_input()

		input.set_container(fake_element)
		input.on_click()
		expect(exit_mock).toHaveBeenCalledTimes(1)
	})
})
