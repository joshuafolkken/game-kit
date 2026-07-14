import { AgXToneMapping, NoToneMapping } from 'three'
import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-svelte'
import GameScene from './GameScene.svelte'
import GAME_SCENE_SOURCE from './GameScene.svelte?raw'

// Focused coverage for the tone_mapping prop / true-color default (game-kit#389). Lives in its
// own file because the main GameScene.svelte.test.ts is at the test-file line cap. Threlte's
// <Canvas> defaults toneMapping to AgXToneMapping, which compresses whites to ~0.8 and desaturates
// bright colors — wrong for game-kit's unlit exact-color UI. Defaulting to NoToneMapping renders
// crisp white (255) borders and true brand colors with no consumer override, while the prop still
// lets a consumer opt into AgX/another tone mapper.

const SEL_GAME_SCENE = '[data-testid="game-scene"]'

const BASE_LABELS = {
	label_jump: 'JUMP',
	label_game: 'Joshua Game',
	label_game_started: 'Game started',
	label_pause: 'Pause',
}

describe('GameScene tone_mapping prop — true (non-tone-mapped) color is the default', () => {
	it('imports NoToneMapping and the ToneMapping type from three', () => {
		expect(GAME_SCENE_SOURCE).toMatch(/import\s*\{[^}]*\bNoToneMapping\b[^}]*\}\s*from\s*'three'/u)
		expect(GAME_SCENE_SOURCE).toMatch(
			/import\s*\{[^}]*\btype ToneMapping\b[^}]*\}\s*from\s*'three'/u,
		)
	})

	it('declares an optional tone_mapping: ToneMapping prop that defaults to NoToneMapping', () => {
		expect(GAME_SCENE_SOURCE).toMatch(/tone_mapping\?\s*:\s*ToneMapping/u)
		expect(GAME_SCENE_SOURCE).toMatch(/tone_mapping\s*=\s*NoToneMapping/u)
	})

	it('forwards the tone_mapping prop to <Canvas toneMapping> so the renderer honors it', () => {
		expect(GAME_SCENE_SOURCE).toMatch(/<Canvas[^>]*\btoneMapping=\{tone_mapping\}/u)
	})

	it('renders with the default (no tone_mapping prop) — the NoToneMapping true-color path', () => {
		const { container } = render(GameScene, { props: { ...BASE_LABELS } })

		expect(container.querySelector(SEL_GAME_SCENE)).toBeTruthy()
	})

	it('renders when a consumer overrides tone_mapping (e.g. AgXToneMapping) instead of the default', () => {
		expect(NoToneMapping).not.toBe(AgXToneMapping)
		const { container } = render(GameScene, {
			props: { ...BASE_LABELS, tone_mapping: AgXToneMapping },
		})

		expect(container.querySelector(SEL_GAME_SCENE)).toBeTruthy()
	})
})
