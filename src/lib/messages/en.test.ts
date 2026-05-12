import { describe, expect, it } from 'vitest'
import { base_messages, messages, simon_messages } from './en'

const SIMON_SPECIFIC_KEYS = [
	'game_title',
	'simon_start',
	'simon_round',
	'simon_gameover',
	'game_application_label',
] as const

describe('messages', () => {
	it('contains all original keys for backward compatibility', () => {
		const original_keys = [
			'game_title',
			'press_start',
			'cyber_switch_label',
			'fullscreen_switch_label',
			'fps_switch_label',
			'click_to_start',
			'tap_to_start',
			'simon_start',
			'simon_round',
			'simon_gameover',
			'sprint_button',
			'jump_button',
			'loading_downloading',
			'loading_initializing',
			'loading_loading_assets',
			'loading_ready',
			'score_high_score',
			'score_current',
			'score_round',
			'game_application_label',
			'game_started_announcement',
			'pause_button',
			'controls_move',
			'controls_look',
			'controls_action',
			'controls_jump',
			'controls_return',
		]
		for (const key of original_keys) {
			expect(messages).toHaveProperty(key)
		}
	})
})

describe('base_messages', () => {
	it('contains no simon-specific keys', () => {
		for (const key of SIMON_SPECIFIC_KEYS) {
			expect(base_messages).not.toHaveProperty(key)
		}
	})
})

describe('simon_messages', () => {
	it('contains all simon-specific keys', () => {
		for (const key of SIMON_SPECIFIC_KEYS) {
			expect(simon_messages).toHaveProperty(key)
		}
	})
})
