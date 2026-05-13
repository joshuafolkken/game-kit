import { describe, expect, it } from 'vitest'
import type { ButtonColor, SimonBoardData } from './types'

const ALL_BUTTON_COLORS: ButtonColor[] = ['green', 'red', 'yellow', 'blue']

describe('simon types', () => {
	it('ButtonColor covers all four expected colors', () => {
		expect(ALL_BUTTON_COLORS).toHaveLength(4)
		expect(ALL_BUTTON_COLORS).toContain('green')
		expect(ALL_BUTTON_COLORS).toContain('red')
		expect(ALL_BUTTON_COLORS).toContain('yellow')
		expect(ALL_BUTTON_COLORS).toContain('blue')
	})

	it('SimonBoardData accepts a valid shape', () => {
		const data: SimonBoardData = {
			active_color: null,
			pressed_color: 'green',
			phase: 'idle',
			round: 0,
			flash_colors: [],
			flash_intensity: 1,
		}
		expect(data.phase).toBe('idle')
		expect(data.pressed_color).toBe('green')
	})
})
