import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-svelte'
import GameScene from './GameScene.svelte'
import GAME_SCENE_SOURCE from './GameScene.svelte?raw'

// Focused coverage for the shadows prop (game-kit#66). Lives in its own file because the main
// GameScene.svelte.test.ts is at the test-file line cap. The shadow map is exposed to consumers
// rather than gated on the device: #429 deleted the equivalent antialias device gate after
// measuring 120 fps with AA on, so game-kit no longer guesses what a phone can afford. The
// default (true) matches Threlte's omitted-prop default, keeping existing consumers unchanged.

const SEL_GAME_SCENE = '[data-testid="game-scene"]'

const BASE_LABELS = {
	label_jump: 'JUMP',
	label_game: 'Joshua Game',
	label_game_started: 'Game started',
	label_pause: 'Pause',
}

describe('GameScene shadows prop — consumer-controlled, not device-gated (Issue #66)', () => {
	it('declares an optional is_shadows_enabled prop that defaults to true', () => {
		expect(GAME_SCENE_SOURCE).toMatch(/is_shadows_enabled\?\s*:\s*boolean\s*\|\s*undefined/u)
		expect(GAME_SCENE_SOURCE).toMatch(/is_shadows_enabled\s*=\s*true\s*,/u)
	})

	it('accepts an explicit undefined so a consumer can forward a boolean | undefined setting', async () => {
		const { container } = await render(GameScene, {
			props: { ...BASE_LABELS, is_shadows_enabled: undefined },
		})

		expect(container.querySelector(SEL_GAME_SCENE)).toBeTruthy()
	})

	it('forwards the prop to <Canvas shadows> so the renderer honors it', () => {
		expect(GAME_SCENE_SOURCE).toMatch(/<Canvas[\s\S]*?shadows=\{is_shadows_enabled\}/u)
	})

	it('never hard-codes the shadow flag or derives it from the touch signal', () => {
		expect(GAME_SCENE_SOURCE).not.toMatch(/shadows=\{(?:true|false)\}/u)
		expect(GAME_SCENE_SOURCE).not.toMatch(/should_use_shadows/u)
	})

	it('renders with the default (no shadows prop) — the shadow-map-enabled path', async () => {
		const { container } = await render(GameScene, { props: { ...BASE_LABELS } })

		expect(container.querySelector(SEL_GAME_SCENE)).toBeTruthy()
	})

	it('renders when a consumer opts out of shadows to skip the shadow-map pass', async () => {
		const { container } = await render(GameScene, {
			props: { ...BASE_LABELS, is_shadows_enabled: false },
		})

		expect(container.querySelector(SEL_GAME_SCENE)).toBeTruthy()
	})
})
