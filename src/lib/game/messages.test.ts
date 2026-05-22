import { GAME_NAME, GAME_NAME_DISPLAY } from '$lib/game/game-name'
import { base_messages } from '$lib/messages/en'
import { describe, expect, it } from 'vitest'
import { game_messages, messages } from './messages'

const GAME_SPECIFIC_KEYS = [
	'game_title',
	'game_start',
	'game_round',
	'game_gameover',
	'game_application_label',
] as const

describe('game_messages', () => {
	it('contains every game-specific key', () => {
		for (const key of GAME_SPECIFIC_KEYS) {
			expect(game_messages).toHaveProperty(key)
		}
	})

	it('threads GAME_NAME constants through into the composed labels', () => {
		// Compare against the source-of-truth constants so renaming GAME_NAME later
		// is caught by game-name.test.ts (value) rather than failing here (composition).
		expect(game_messages.game_title).toBe(GAME_NAME)
		expect(game_messages.game_application_label).toBe(GAME_NAME_DISPLAY)
	})
})

describe('messages (composed)', () => {
	it('contains every base_messages key', () => {
		for (const key of Object.keys(base_messages)) {
			expect(messages).toHaveProperty(key)
		}
	})

	it('contains every game_messages key', () => {
		for (const key of GAME_SPECIFIC_KEYS) {
			expect(messages).toHaveProperty(key)
		}
	})

	it('places game_messages after base_messages so game wins on key collision', () => {
		// No collision today; this guard ensures any future overlap is resolved
		// in favor of the game-specific definition (matches the templates pattern).
		expect(messages.game_title).toBe(game_messages.game_title)
	})
})
