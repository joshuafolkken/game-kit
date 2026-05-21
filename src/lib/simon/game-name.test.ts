import { describe, expect, it } from 'vitest'
import { GAME_DESCRIPTION, GAME_NAME, GAME_NAME_DISPLAY } from './game-name'

describe('game-name', () => {
	it('GAME_NAME is the all-caps display string', () => {
		expect(GAME_NAME).toBe('JOSHUA GAME')
	})

	it('GAME_NAME_DISPLAY is the title-case display string', () => {
		expect(GAME_NAME_DISPLAY).toBe('Joshua Game')
	})

	it('GAME_DESCRIPTION is the PWA description string', () => {
		expect(GAME_DESCRIPTION).toBe('A Joshua Game memory game')
	})
})
