import { describe, expect, it } from 'vitest'
import { base_messages } from './en'

const GAME_SPECIFIC_KEYS = [
	'game_title',
	'game_start',
	'game_round',
	'game_gameover',
	'game_application_label',
] as const

const BASE_KEYS = [
	'press_start',
	'cyber_switch_label',
	'click_to_start',
	'tap_to_start',
	'sprint_button',
	'jump_button',
	'loading_downloading',
	'loading_initializing',
	'loading_loading_assets',
	'loading_ready',
	'score_high_score',
	'score_current',
	'score_round',
	'game_started_announcement',
	'pause_button',
	'controls_move',
	'controls_look',
	'controls_action',
	'controls_jump',
	'controls_return',
] as const

describe('base_messages', () => {
	it('exposes the expected generic UI keys', () => {
		for (const key of BASE_KEYS) {
			expect(base_messages).toHaveProperty(key)
		}
	})

	it('contains no game-specific keys (those belong in src/lib/game/messages.ts)', () => {
		for (const key of GAME_SPECIFIC_KEYS) {
			expect(base_messages).not.toHaveProperty(key)
		}
	})
})
