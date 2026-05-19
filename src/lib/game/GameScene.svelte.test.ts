import { audio } from '$lib/game/audio'
import { device } from '$lib/game/device.svelte'
import { fullscreen } from '$lib/game/fullscreen.svelte'
import { session } from '$lib/game/session.svelte'
import { game_state } from '$lib/game/state.svelte'
import { fullscreen_switch_input } from '$lib/game/switch/fullscreen-switch-input'
import { flushSync } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-svelte'
import GameScene from './GameScene.svelte'
import GAME_SCENE_SOURCE from './GameScene.svelte?raw'

const LABEL_JUMP = 'JUMP'
const LABEL_GAME = 'Simon game'
const LABEL_GAME_STARTED = 'Game started'
const LABEL_PAUSE = 'Pause'

function render_scene(extra: Record<string, unknown> = {}) {
	return render(GameScene, {
		props: {
			label_jump: LABEL_JUMP,
			label_game: LABEL_GAME,
			label_game_started: LABEL_GAME_STARTED,
			label_pause: LABEL_PAUSE,
			...extra,
		},
	})
}

describe('GameScene', () => {
	beforeEach(() => {
		session.reset_session()
		game_state.reset_mode()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('renders game-scene container', () => {
		const { container } = render_scene()
		expect(container.querySelector('[data-testid="game-scene"]')).toBeTruthy()
	})

	it('hides jump button before the session starts', () => {
		const { container } = render_scene()
		expect(container.querySelector('[data-testid="jump-btn"]')).toBeNull()
	})

	it('shows jump button with aria-label after session starts', () => {
		const { container } = render_scene()
		const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]')
		expect(scene).toBeTruthy()
		if (!scene) return
		scene.click()
		flushSync()
		const btn = container.querySelector<HTMLElement>('[data-testid="jump-btn"]')
		expect(btn).toBeTruthy()
		expect(btn?.getAttribute('aria-label')).toBe(LABEL_JUMP)
		expect(btn?.querySelector('svg')).toBeTruthy()
	})

	it('renders a canvas element', () => {
		const { container } = render_scene()
		expect(container.querySelector('canvas')).toBeTruthy()
	})

	it('renders <ControlsScene /> in the canvas, guarded by !is_started', () => {
		// ControlsScene now renders inside the 3D <Canvas> (not the DOM), so it
		// cannot be reached via querySelector. Verify via the source that the
		// component is wired up with the {#if !is_started} guard so the controls
		// overlay disappears once the session starts.
		expect(GAME_SCENE_SOURCE).toMatch(
			/import\s+ControlsScene\s+from\s+'\$lib\/game\/controls\/ControlsScene\.svelte'/,
		)
		expect(GAME_SCENE_SOURCE).toMatch(/\{#if\s+!is_started\}[\s\S]*<ControlsScene[\s\S]*\{\/if\}/)
	})

	it('passes hint_text and is_touch into <ControlsScene />', () => {
		expect(GAME_SCENE_SOURCE).toMatch(/<ControlsScene\s+\{hint_text\}\s+\{is_touch\}\s*\/>/)
	})

	it('calls on_start callback when user first clicks', () => {
		let called = false
		const { container } = render_scene({
			on_start: () => {
				called = true
			},
		})
		const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]')
		expect(scene).toBeTruthy()
		if (!scene) return
		scene.click()
		expect(called).toBe(true)
	})

	it('calls on_start only once across multiple clicks', () => {
		let call_count = 0
		const { container } = render_scene({
			on_start: () => {
				call_count++
			},
		})
		const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]')
		expect(scene).toBeTruthy()
		if (!scene) return
		scene.click()
		scene.click()
		scene.click()
		expect(call_count).toBe(1)
	})

	it('start_game runs init_audio only once across multiple clicks', () => {
		const spy = vi.spyOn(audio, 'init_audio')
		const { container } = render_scene()
		const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]')
		expect(scene).toBeTruthy()
		if (!scene) return
		scene.click()
		scene.click()
		scene.click()
		expect(spy).toHaveBeenCalledTimes(1)
	})

	it('start_game requests fullscreen on touch-primary devices', () => {
		vi.spyOn(device, 'is_touch_primary', 'get').mockReturnValue(true)
		const fullscreen_spy = vi.spyOn(fullscreen, 'request').mockResolvedValue()
		const { container } = render_scene()
		const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]')
		expect(scene).toBeTruthy()
		if (!scene) return
		scene.click()
		expect(fullscreen_spy).toHaveBeenCalledTimes(1)
	})

	it('start_game does not request fullscreen on desktop devices but still inits audio', () => {
		vi.spyOn(device, 'is_touch_primary', 'get').mockReturnValue(false)
		const fullscreen_spy = vi.spyOn(fullscreen, 'request').mockResolvedValue()
		const audio_spy = vi.spyOn(audio, 'init_audio')
		const { container } = render_scene()
		const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]')
		expect(scene).toBeTruthy()
		if (!scene) return
		scene.click()
		expect(fullscreen_spy).not.toHaveBeenCalled()
		expect(audio_spy).toHaveBeenCalledTimes(1)
	})

	it('registers the game-scene container with fullscreen_switch_input on mount', () => {
		const spy = vi.spyOn(fullscreen_switch_input, 'set_container')
		const { container } = render_scene()
		const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]')
		expect(scene).toBeTruthy()
		expect(spy).toHaveBeenCalledWith(scene)
	})

	it('sets session.is_session_started to true after first click', () => {
		const { container } = render_scene()
		const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]')
		expect(scene).toBeTruthy()
		if (!scene) return
		expect(session.is_session_started).toBe(false)
		scene.click()
		expect(session.is_session_started).toBe(true)
	})

	it('does not render cyber-glow when game_state.is_alt is false', () => {
		const { container } = render_scene()
		expect(container.querySelector('[data-testid="cyber-glow"]')).toBeNull()
	})

	it('renders cyber-glow when game_state.is_alt is true', () => {
		game_state.toggle_alt()
		const { container } = render_scene()
		expect(container.querySelector('[data-testid="cyber-glow"]')).toBeTruthy()
	})

	describe('ESC / Z key — return to start', () => {
		it('pressing ESC while session is active calls reset_session', () => {
			const { container } = render_scene()
			const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]')
			expect(scene).toBeTruthy()
			if (!scene) return
			scene.click()
			expect(session.is_session_started).toBe(true)
			scene.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
			expect(session.is_session_started).toBe(false)
		})

		it('pressing Z while session is active calls reset_session', () => {
			const { container } = render_scene()
			const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]')
			expect(scene).toBeTruthy()
			if (!scene) return
			scene.click()
			expect(session.is_session_started).toBe(true)
			scene.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', bubbles: true }))
			expect(session.is_session_started).toBe(false)
		})

		it('pressing ESC while session is not active does not start the game', () => {
			const { container } = render_scene()
			const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]')
			expect(scene).toBeTruthy()
			if (!scene) return
			expect(session.is_session_started).toBe(false)
			scene.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
			expect(session.is_session_started).toBe(false)
		})
	})

	describe('Enter / Space — start session', () => {
		it('pressing Enter starts the session', () => {
			const { container } = render_scene()
			const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]')
			expect(scene).toBeTruthy()
			if (!scene) return
			expect(session.is_session_started).toBe(false)
			scene.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
			expect(session.is_session_started).toBe(true)
		})

		it('pressing Space does NOT start the session (reserved for jump input)', () => {
			const { container } = render_scene()
			const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]')
			expect(scene).toBeTruthy()
			if (!scene) return
			expect(session.is_session_started).toBe(false)
			scene.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
			expect(session.is_session_started).toBe(false)
		})
	})

	describe('mobile move/look during controls overlay', () => {
		it('joystick zones are rendered before session starts so move/look work in overlay', () => {
			vi.spyOn(device, 'is_touch_primary', 'get').mockReturnValue(true)
			const { container } = render_scene()
			expect(container.querySelectorAll('.joystick-zone')).toHaveLength(2)
		})
	})

	describe('mobile pause button', () => {
		it('shows pause button when session is active on touch device', () => {
			vi.spyOn(device, 'is_touch_primary', 'get').mockReturnValue(true)
			vi.spyOn(fullscreen, 'request').mockResolvedValue()
			const { container } = render_scene()
			const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]')
			expect(scene).toBeTruthy()
			if (!scene) return
			scene.click()
			flushSync()
			expect(container.querySelector('[data-testid="pause-btn"]')).toBeTruthy()
		})

		it('does not show pause button on desktop', () => {
			vi.spyOn(device, 'is_touch_primary', 'get').mockReturnValue(false)
			const { container } = render_scene()
			const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]')
			expect(scene).toBeTruthy()
			if (!scene) return
			scene.click()
			flushSync()
			expect(container.querySelector('[data-testid="pause-btn"]')).toBeNull()
		})

		it('does not show pause button before session starts', () => {
			vi.spyOn(device, 'is_touch_primary', 'get').mockReturnValue(true)
			const { container } = render_scene()
			expect(container.querySelector('[data-testid="pause-btn"]')).toBeNull()
		})

		it('clicking pause button resets session', () => {
			vi.spyOn(device, 'is_touch_primary', 'get').mockReturnValue(true)
			vi.spyOn(fullscreen, 'request').mockResolvedValue()
			const { container } = render_scene()
			const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]')
			expect(scene).toBeTruthy()
			if (!scene) return
			scene.click()
			flushSync()
			const pause_btn = container.querySelector<HTMLElement>('[data-testid="pause-btn"]')
			expect(pause_btn).toBeTruthy()
			if (!pause_btn) return
			pause_btn.click()
			flushSync()
			expect(session.is_session_started).toBe(false)
		})

		it('pause button is positioned at bottom-right of the screen', () => {
			vi.spyOn(device, 'is_touch_primary', 'get').mockReturnValue(true)
			vi.spyOn(fullscreen, 'request').mockResolvedValue()
			const { container } = render_scene()
			const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]')
			expect(scene).toBeTruthy()
			if (!scene) return
			scene.click()
			flushSync()
			const pause_btn = container.querySelector<HTMLElement>('[data-testid="pause-btn"]')
			expect(pause_btn).toBeTruthy()
			if (!pause_btn) return
			const style = globalThis.getComputedStyle(pause_btn)
			expect(style.bottom).toBe('16px')
			expect(style.right).toBe('16px')
		})
	})

	describe('dynamic pixel DPR — dot count stays consistent on narrow viewports', () => {
		it('imports compute_pixel_dpr from the pixel-dpr helper', () => {
			expect(GAME_SCENE_SOURCE).toMatch(
				/import\s*\{\s*compute_pixel_dpr\s*\}\s*from\s*'\$lib\/game\/pixel-dpr'/,
			)
		})

		it('binds container clientWidth and clientHeight so DPR can react to viewport changes', () => {
			expect(GAME_SCENE_SOURCE).toContain('bind:clientWidth={container_width}')
			expect(GAME_SCENE_SOURCE).toContain('bind:clientHeight={container_height}')
		})

		it('Canvas receives the derived pixel_dpr (not a fixed PIXEL_DPR constant)', () => {
			expect(GAME_SCENE_SOURCE).toContain('<Canvas dpr={pixel_dpr}')
			expect(GAME_SCENE_SOURCE).not.toMatch(/const\s+PIXEL_DPR\s*=/)
		})

		it('defines shorter-edge-based DPR constants: TARGET_SHORT_EDGE_PIXELS=256 and MIN_SHORT_EDGE_PIXELS=128', () => {
			expect(GAME_SCENE_SOURCE).toMatch(/const\s+TARGET_SHORT_EDGE_PIXELS\s*=\s*256/)
			expect(GAME_SCENE_SOURCE).toMatch(/const\s+MIN_SHORT_EDGE_PIXELS\s*=\s*128/)
			expect(GAME_SCENE_SOURCE).not.toMatch(/TARGET_LONG_EDGE_PIXELS/)
		})
	})

	describe('CRT filter overlay — scanlines + vignette over the whole game screen', () => {
		it('renders a CRT overlay element over the game container, regardless of session state', () => {
			const { container } = render_scene()
			expect(container.querySelector('[data-testid="crt-overlay"]')).toBeTruthy()
		})

		it('CRT overlay is a sibling of the Canvas so it covers the entire game screen', () => {
			const { container } = render_scene()
			const game_scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]')
			expect(game_scene).toBeTruthy()
			if (!game_scene) return
			const overlay = game_scene.querySelector<HTMLElement>('[data-testid="crt-overlay"]')
			expect(overlay?.parentElement).toBe(game_scene)
		})

		it('CRT overlay does not block pointer events (UI underneath stays interactive)', () => {
			const { container } = render_scene()
			const overlay = container.querySelector<HTMLElement>('[data-testid="crt-overlay"]')
			expect(overlay).toBeTruthy()
			if (!overlay) return
			const style = globalThis.getComputedStyle(overlay)
			expect(style.pointerEvents).toBe('none')
		})

		it('CSS defines .crt-overlay with repeating-linear-gradient (scanlines) and radial-gradient (vignette)', () => {
			expect(GAME_SCENE_SOURCE).toMatch(/\.crt-overlay\s*\{/)
			expect(GAME_SCENE_SOURCE).toMatch(/repeating-linear-gradient\(\s*0deg/)
			expect(GAME_SCENE_SOURCE).toMatch(/radial-gradient\(\s*ellipse\s+at\s+center/)
		})

		it('defines DOTS_PER_SCANLINE = 1 (one scanline per dot — ~256 scanlines, X68000-class CRT)', () => {
			expect(GAME_SCENE_SOURCE).toMatch(/const\s+DOTS_PER_SCANLINE\s*=\s*1/)
		})

		it('scanline gradient uses alpha 0.45 (heavy CRT look) on both gradient stops', () => {
			// Reason: value-pin so silent drift back to 0.25 (too faint) is caught.
			const alpha_matches = GAME_SCENE_SOURCE.match(/rgba\(\s*0,\s*0,\s*0,\s*0\.45\s*\)/g) ?? []
			expect(alpha_matches.length).toBeGreaterThanOrEqual(2)
			// Negative: the previous 0.25 alpha must be gone from the scanline stops.
			expect(GAME_SCENE_SOURCE).not.toMatch(
				/rgba\(\s*0,\s*0,\s*0,\s*0\.25\s*\)\s+calc\(var\(--scanline-period/,
			)
		})

		it('derives scanline_period_css with device-pixel snapping (Math.round on device px) to avoid moiré', () => {
			expect(GAME_SCENE_SOURCE).toMatch(
				/scanline_period_css\s*=\s*\$derived\.by\(\(\)\s*=>\s*\{[\s\S]*DOTS_PER_SCANLINE\s*\/\s*pixel_dpr/,
			)
			expect(GAME_SCENE_SOURCE).toMatch(/Math\.round\(\s*raw_css\s*\*\s*dpr\s*\)/)
		})

		it('tracks window.devicePixelRatio in a $state and updates it on resize', () => {
			expect(GAME_SCENE_SOURCE).toMatch(/let\s+device_pixel_ratio\s*=\s*\$state\(/)
			expect(GAME_SCENE_SOURCE).toContain('window.devicePixelRatio')
			expect(GAME_SCENE_SOURCE).toMatch(/window\.addEventListener\(\s*'resize'/)
			expect(GAME_SCENE_SOURCE).toMatch(/window\.removeEventListener\(\s*'resize'/)
		})

		it('binds the scanline period to the CRT overlay via the --scanline-period CSS variable', () => {
			expect(GAME_SCENE_SOURCE).toContain('style:--scanline-period="{scanline_period_css}px"')
			expect(GAME_SCENE_SOURCE).toMatch(/var\(--scanline-period,\s*3px\)/)
			// Duty cycle: dark : transparent = 1 : 1 (period / 2). CRT phosphor stripe look.
			expect(GAME_SCENE_SOURCE).toMatch(/calc\(\s*var\(--scanline-period,\s*3px\)\s*\/\s*2\s*\)/)
		})

		it('does not overlay a phosphor mask (RGB sub-pixel stripes) — kept off intentionally', () => {
			expect(GAME_SCENE_SOURCE).not.toMatch(/repeating-linear-gradient\(\s*90deg/)
			expect(GAME_SCENE_SOURCE).not.toMatch(/rgba\(\s*255,\s*0,\s*0/)
			expect(GAME_SCENE_SOURCE).not.toMatch(/rgba\(\s*0,\s*255,\s*0/)
			expect(GAME_SCENE_SOURCE).not.toMatch(/rgba\(\s*0,\s*0,\s*255/)
		})

		it('applies a subtle CRT vibrance filter to the canvas (contrast + saturate, no hue shift)', () => {
			expect(GAME_SCENE_SOURCE).toMatch(
				/\.game-container\s+:global\(canvas\)\s*\{[\s\S]*?filter:\s*contrast\(1\.08\)\s+saturate\(1\.1\)/,
			)
			expect(GAME_SCENE_SOURCE).not.toMatch(
				/\.game-container\s+:global\(canvas\)[\s\S]*?hue-rotate/,
			)
		})
	})

	describe('CRT curvature — rounded corners + corner darkening + glass-dome highlight', () => {
		it('applies a border-radius to the canvas to simulate the CRT screen shape', () => {
			expect(GAME_SCENE_SOURCE).toMatch(
				/\.game-container\s+:global\(canvas\)\s*\{[\s\S]*?border-radius:\s*clamp\(/,
			)
		})

		it('applies the same border-radius to .crt-overlay so scanlines clip on the same curve', () => {
			expect(GAME_SCENE_SOURCE).toMatch(/\.crt-overlay\s*\{[\s\S]*?border-radius:\s*clamp\(/)
		})

		it('adds four corner darkening radial-gradients to fake CRT curvature', () => {
			expect(GAME_SCENE_SOURCE).toMatch(/radial-gradient\(\s*circle\s+at\s+top\s+left/)
			expect(GAME_SCENE_SOURCE).toMatch(/radial-gradient\(\s*circle\s+at\s+top\s+right/)
			expect(GAME_SCENE_SOURCE).toMatch(/radial-gradient\(\s*circle\s+at\s+bottom\s+left/)
			expect(GAME_SCENE_SOURCE).toMatch(/radial-gradient\(\s*circle\s+at\s+bottom\s+right/)
		})

		it('adds a glass-dome highlight (light radial gradient in the upper-left quadrant)', () => {
			expect(GAME_SCENE_SOURCE).toMatch(
				/radial-gradient\(\s*ellipse\s+\d+%\s+\d+%\s+at\s+\d+%\s+\d+%,[\s\S]*?rgba\(\s*255,\s*255,\s*255/,
			)
		})

		it('keeps the existing center vignette and scanlines untouched alongside the new curvature layers', () => {
			expect(GAME_SCENE_SOURCE).toMatch(/repeating-linear-gradient\(\s*0deg/)
			expect(GAME_SCENE_SOURCE).toMatch(
				/radial-gradient\(\s*ellipse\s+at\s+center,\s*transparent\s+50%/,
			)
		})
	})

	describe('CRT color quantization + Bayer dithering (WebGL post-process)', () => {
		it('imports CrtDitherPass and renders it inside <Canvas>', () => {
			expect(GAME_SCENE_SOURCE).toMatch(
				/import\s+CrtDitherPass\s+from\s+'\$lib\/game\/CrtDitherPass\.svelte'/,
			)
			expect(GAME_SCENE_SOURCE).toMatch(/<Canvas[\s\S]*<CrtDitherPass\s*\/>[\s\S]*<\/Canvas>/)
		})

		it('no longer references the legacy SVG palette filter (replaced by GPU post-process)', () => {
			expect(GAME_SCENE_SOURCE).not.toMatch(/<filter\s+id="crt-palette"/)
			expect(GAME_SCENE_SOURCE).not.toMatch(/feComponentTransfer/)
			expect(GAME_SCENE_SOURCE).not.toMatch(/url\(#crt-palette\)/)
			expect(GAME_SCENE_SOURCE).not.toMatch(/\.crt-filter-defs\s*\{/)
		})
	})
})
