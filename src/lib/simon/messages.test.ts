import { base_messages } from '$lib/messages/en'
import { describe, expect, it } from 'vitest'
import { messages, simon_messages } from './messages'

const SIMON_SPECIFIC_KEYS = [
	'game_title',
	'simon_start',
	'simon_round',
	'simon_gameover',
	'game_application_label',
] as const

describe('simon_messages', () => {
	it('contains every Simon-specific key', () => {
		for (const key of SIMON_SPECIFIC_KEYS) {
			expect(simon_messages).toHaveProperty(key)
		}
	})

	it('uses Joshua Game as the displayed game name', () => {
		expect(simon_messages.game_title).toBe('JOSHUA GAME')
		expect(simon_messages.game_application_label).toBe('Joshua Game')
	})
})

describe('messages (composed)', () => {
	it('contains every base_messages key', () => {
		for (const key of Object.keys(base_messages)) {
			expect(messages).toHaveProperty(key)
		}
	})

	it('contains every simon_messages key', () => {
		for (const key of SIMON_SPECIFIC_KEYS) {
			expect(messages).toHaveProperty(key)
		}
	})

	it('places simon_messages after base_messages so Simon wins on key collision', () => {
		// No collision today; this guard ensures any future overlap is resolved
		// in favor of the game-specific definition (matches the templates pattern).
		expect(messages.game_title).toBe(simon_messages.game_title)
	})
})
