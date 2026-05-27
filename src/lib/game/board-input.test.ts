import { session } from '$lib/game-kit/Session.svelte'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { game_board_input } from './board-input'
import type { ButtonColor } from './types'

const LEFT_BUTTON = 0
const RIGHT_BUTTON = 2

describe('game_board_input', () => {
	// eslint-disable-next-line init-declarations -- assigned by beforeEach
	let press_mock: ReturnType<typeof vi.fn<(color: ButtonColor) => void>>
	// eslint-disable-next-line init-declarations -- assigned by beforeEach
	let release_mock: ReturnType<typeof vi.fn<() => void>>
	// eslint-disable-next-line init-declarations -- assigned by beforeEach
	let start_mock: ReturnType<typeof vi.fn<() => void>>

	beforeEach(() => {
		session.reset_session()
		press_mock = vi.fn<(color: ButtonColor) => void>()
		release_mock = vi.fn<() => void>()
		start_mock = vi.fn<() => void>()
		game_board_input.configure({
			on_press: press_mock,
			on_release: release_mock,
			on_start: start_mock,
		})
	})

	describe('on_button_pointer_down', () => {
		it('does not call on_press when session is not started', () => {
			game_board_input.on_button_pointer_down({ nativeEvent: { button: LEFT_BUTTON } }, 'green')
			expect(press_mock).not.toHaveBeenCalled()
		})

		it('calls on_press once session has started', () => {
			session.start_session()
			game_board_input.on_button_pointer_down({ nativeEvent: { button: LEFT_BUTTON } }, 'red')
			expect(press_mock).toHaveBeenCalledWith('red')
		})

		it('does not call on_press for non-left click even after session started', () => {
			session.start_session()
			game_board_input.on_button_pointer_down({ nativeEvent: { button: RIGHT_BUTTON } }, 'blue')
			expect(press_mock).not.toHaveBeenCalled()
		})
	})

	describe('on_button_release', () => {
		it('does not call on_release when session is not started', () => {
			game_board_input.on_button_release()
			expect(release_mock).not.toHaveBeenCalled()
		})

		it('calls on_release once session has started', () => {
			session.start_session()
			game_board_input.on_button_release()
			expect(release_mock).toHaveBeenCalledTimes(1)
		})
	})

	describe('on_center_click', () => {
		it('does not call on_start when session is not started', () => {
			game_board_input.on_center_click()
			expect(start_mock).not.toHaveBeenCalled()
		})

		it('calls on_start once session has started', () => {
			session.start_session()
			game_board_input.on_center_click()
			expect(start_mock).toHaveBeenCalledTimes(1)
		})
	})
})
