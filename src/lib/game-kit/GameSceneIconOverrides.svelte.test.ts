import { describe, expect, it } from 'vitest'
import GAME_SCENE_SOURCE from './GameScene.svelte?raw'

// Focused coverage for the icon-SVG override props (game-kit#370). Lives in its own file because
// the main GameScene.svelte.test.ts is at the test-file line cap. These props let a consumer swap
// the built-in keyboard / space / mouse / touch icons for a matching aesthetic (e.g. pixel/raster
// faces paired with a custom hint_font), forwarded through to ControlsScene.

describe('GameScene icon SVG overrides — keyboard_svg / mouse_svg / touch_svg props (#370)', () => {
	it('declares optional keyboard_svg / mouse_svg / touch_svg string props', () => {
		expect(GAME_SCENE_SOURCE).toMatch(/keyboard_svg\?\s*:\s*string\s*\|\s*undefined/u)
		expect(GAME_SCENE_SOURCE).toMatch(/mouse_svg\?\s*:\s*string\s*\|\s*undefined/u)
		expect(GAME_SCENE_SOURCE).toMatch(/touch_svg\?\s*:\s*string\s*\|\s*undefined/u)
	})

	it('destructures the three icon SVG props from $props', () => {
		const properties_block = /const\s*\{[\s\S]*?\}\s*:\s*Props\s*=\s*\$props\(\)/u.exec(
			GAME_SCENE_SOURCE,
		)
		const block = properties_block?.[0] ?? ''

		expect(block).toContain('keyboard_svg')
		expect(block).toContain('mouse_svg')
		expect(block).toContain('touch_svg')
	})

	it('forwards keyboard_svg / mouse_svg / touch_svg into <ControlsScene />', () => {
		expect(GAME_SCENE_SOURCE).toMatch(
			/<ControlsScene[\s\S]*?\{keyboard_svg\}[\s\S]*?\{mouse_svg\}[\s\S]*?\{touch_svg\}[\s\S]*?\/>/u,
		)
	})
})
