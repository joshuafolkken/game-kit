import { crt } from '$lib/game-kit/Crt.svelte'
import { afterEach, describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-svelte'
import GameScene from './GameScene.svelte'

// Focused coverage for the crt_initial prop (game-kit#375). Lives in its own file because the
// main GameScene.svelte.test.ts is at the test-file line cap. The prop lets a consumer choose
// the initial CRT/RETRO mode through game-kit API instead of hand-toggling it in the synced app
// shell — which jgame sync would clobber on the next bump.

const SEL_GAME_SCENE = '[data-testid="game-scene"]'
const CLASS_CRT_ACTIVE = 'crt-active'

const BASE_LABELS = {
	label_jump: 'JUMP',
	label_game: 'Joshua Game',
	label_game_started: 'Game started',
	label_pause: 'Pause',
}

function render_with_crt_initial(crt_initial: 'on' | 'off'): ReturnType<typeof render> {
	return render(GameScene, { props: { ...BASE_LABELS, crt_initial } })
}

function has_crt_active(container: HTMLElement): boolean | undefined {
	return container.querySelector<HTMLElement>(SEL_GAME_SCENE)?.classList.contains(CLASS_CRT_ACTIVE)
}

describe('GameScene crt_initial prop — pick the initial CRT mode without editing the shell', () => {
	// crt is a module singleton; restore the enabled default so a disabled render does not leak.
	afterEach(() => {
		if (!crt.is_crt_enabled) crt.toggle()
	})

	it('starts with CRT disabled (no .crt-active) when crt_initial is "off"', () => {
		const { container } = render_with_crt_initial('off')

		expect(crt.is_crt_enabled).toBe(false)
		expect(has_crt_active(container)).toBe(false)
	})

	it('keeps CRT enabled (.crt-active) when crt_initial is "on"', () => {
		const { container } = render_with_crt_initial('on')

		expect(crt.is_crt_enabled).toBe(true)
		expect(has_crt_active(container)).toBe(true)
	})

	it('leaves the shared CRT state untouched when crt_initial is omitted (no force-reset)', () => {
		// Contract: an omitted prop must not clobber a prior runtime RETRO toggle. Disable CRT,
		// then render without crt_initial — it must stay disabled, not be forced back on.
		crt.set_enabled(false)
		render(GameScene, { props: { ...BASE_LABELS } })

		expect(crt.is_crt_enabled).toBe(false)
	})
})
