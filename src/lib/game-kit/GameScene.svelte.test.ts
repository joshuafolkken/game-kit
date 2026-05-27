import { audio } from '$lib/game-kit/audio'
import { device } from '$lib/game-kit/Device.svelte'
import { fullscreen } from '$lib/game-kit/Fullscreen.svelte'
import { session } from '$lib/game-kit/Session.svelte'
import { game_state } from '$lib/game-kit/State.svelte'
import { fullscreen_switch_input } from '$lib/game-kit/switch/fullscreen-switch-input'
import { flushSync } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-svelte'
import GameScene from './GameScene.svelte'
import GAME_SCENE_SOURCE from './GameScene.svelte?raw'

const LABEL_JUMP = 'JUMP'
const LABEL_GAME = 'Joshua Game'
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
		const button = container.querySelector<HTMLElement>('[data-testid="jump-btn"]')

		expect(button).toBeTruthy()
		expect(button?.getAttribute('aria-label')).toBe(LABEL_JUMP)
		expect(button?.querySelector('svg')).toBeTruthy()
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
			/import\s+ControlsScene\s+from\s+'\$lib\/game-kit\/controls\/ControlsScene\.svelte'/u,
		)
		expect(GAME_SCENE_SOURCE).toMatch(/\{#if\s+!is_started\}[\s\S]*<ControlsScene[\s\S]*\{\/if\}/u)
	})

	it('passes hint_text and is_touch into <ControlsScene />', () => {
		expect(GAME_SCENE_SOURCE).toMatch(/<ControlsScene\s+\{hint_text\}\s+\{is_touch\}\s*\/>/u)
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
			const pause_button = container.querySelector<HTMLElement>('[data-testid="pause-btn"]')

			expect(pause_button).toBeTruthy()
			if (!pause_button) return
			pause_button.click()
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
			const pause_button = container.querySelector<HTMLElement>('[data-testid="pause-btn"]')

			expect(pause_button).toBeTruthy()
			if (!pause_button) return
			const style = globalThis.getComputedStyle(pause_button)

			expect(style.bottom).toBe('16px')
			expect(style.right).toBe('16px')
		})
	})

	describe('dynamic pixel DPR — dot count stays consistent on narrow viewports', () => {
		it('imports compute_pixel_dpr from the pixel-dpr helper', () => {
			expect(GAME_SCENE_SOURCE).toMatch(
				/import\s*\{\s*compute_pixel_dpr\s*\}\s*from\s*'\$lib\/game-kit\/pixel-dpr'/u,
			)
		})

		it('binds container clientWidth and clientHeight so DPR can react to viewport changes', () => {
			expect(GAME_SCENE_SOURCE).toContain('bind:clientWidth={container_width}')
			expect(GAME_SCENE_SOURCE).toContain('bind:clientHeight={container_height}')
		})

		it('Canvas uses dpr={1} (full CSS resolution) — lo-res rendering is handled by CrtDitherPass', () => {
			// The canvas runs at CSS resolution so Stage 2 CRT effects (scanlines + barrel)
			// have full device pixels to work with. The low-res game render is done inside
			// CrtDitherPass via the lo_dpr prop.
			expect(GAME_SCENE_SOURCE).toContain('<Canvas dpr={1}')
			expect(GAME_SCENE_SOURCE).not.toContain('<Canvas dpr={pixel_dpr}')
		})

		it('passes lo_dpr={pixel_dpr} to CrtDitherPass for the low-res game render stage', () => {
			expect(GAME_SCENE_SOURCE).toMatch(/(?:let|const)\s+lo_dpr\s*=\s*\$derived\(pixel_dpr\)/u)
			expect(GAME_SCENE_SOURCE).toContain('<CrtDitherPass {lo_dpr}')
		})

		it('defines shorter-edge-based DPR constants: TARGET_SHORT_EDGE_PIXELS=256 and MIN_SHORT_EDGE_PIXELS=128', () => {
			expect(GAME_SCENE_SOURCE).toMatch(/const\s+TARGET_SHORT_EDGE_PIXELS\s*=\s*256/u)
			expect(GAME_SCENE_SOURCE).toMatch(/const\s+MIN_SHORT_EDGE_PIXELS\s*=\s*128/u)
			expect(GAME_SCENE_SOURCE).not.toMatch(/TARGET_LONG_EDGE_PIXELS/u)
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

		it('.crt-overlay no longer renders scanlines in CSS — moved to the WebGL dither shader', () => {
			// Scanlines now live in DITHER_FRAGMENT_SHADER so they curve with the barrel pass.
			expect(GAME_SCENE_SOURCE).not.toContain('repeating-linear-gradient')
			expect(GAME_SCENE_SOURCE).not.toContain('--scanline-period')
			expect(GAME_SCENE_SOURCE).not.toContain('--scanline-angle')
		})

		it('.crt-overlay still carries static glass-face cues (vignette + highlight)', () => {
			expect(GAME_SCENE_SOURCE).toMatch(/\.crt-overlay\s*\{/u)
			expect(GAME_SCENE_SOURCE).toMatch(/radial-gradient\(\s*ellipse\s+at\s+center/u)
		})

		it('GameScene no longer owns DOTS_PER_SCANLINE / device_pixel_ratio / scanline-derived state', () => {
			expect(GAME_SCENE_SOURCE).not.toMatch(/const\s+DOTS_PER_SCANLINE\s*=/u)
			expect(GAME_SCENE_SOURCE).not.toMatch(/(?:let|const)\s+device_pixel_ratio\s*=\s*\$state\(/u)
			expect(GAME_SCENE_SOURCE).not.toMatch(/scanline_period_css/u)
			expect(GAME_SCENE_SOURCE).not.toMatch(/scanline_angle_css/u)
			expect(GAME_SCENE_SOURCE).not.toMatch(/(?:let|const)\s+is_portrait\s*=\s*\$derived/u)
		})

		it('does not overlay a phosphor mask (RGB sub-pixel stripes) — kept off intentionally', () => {
			expect(GAME_SCENE_SOURCE).not.toMatch(/repeating-linear-gradient\(\s*90deg/u)
			expect(GAME_SCENE_SOURCE).not.toMatch(/rgba\(\s*255,\s*0,\s*0/u)
			expect(GAME_SCENE_SOURCE).not.toMatch(/rgba\(\s*0,\s*255,\s*0/u)
			expect(GAME_SCENE_SOURCE).not.toMatch(/rgba\(\s*0,\s*0,\s*255/u)
		})

		it('applies a CRT vibrance filter to the canvas under .crt-active (lowered contrast + boosted saturation, no hue shift)', () => {
			// Reason: filter chain was retuned from contrast(1.08) saturate(1.1) brightness(1.15)
			// to contrast(0.9) saturate(1.8) brightness(1.1) for a richer, slightly softer
			// X68000-style palette. The chromatic aberration url(...) stays last in the chain so
			// channel separation operates on the post-vibrance image. Value-pin so silent drift
			// back to prior tunings is caught.
			// Filter is now gated on .crt-active so toggling CRT off removes all post-processing.
			expect(GAME_SCENE_SOURCE).toMatch(
				/\.game-container\.crt-active\s+:global\(canvas\)\s*\{[\s\S]*?filter:\s*contrast\(0\.9\)\s+saturate\(1\.8\)\s+brightness\(1\.1\)\s+url\(#crt-chromatic\)/u,
			)
			expect(GAME_SCENE_SOURCE).not.toMatch(
				/\.game-container\.crt-active\s+:global\(canvas\)[\s\S]*?hue-rotate/u,
			)

			// Negative: previous filter values must not be present on the canvas filter chain.
			for (const prior of [
				String.raw`contrast\(1\.08\)`,
				String.raw`saturate\(1\.1\)`,
				String.raw`brightness\(1\.15\)`,
			]) {
				expect(GAME_SCENE_SOURCE).not.toMatch(
					new RegExp(
						String.raw`\.game-container\.crt-active\s+:global\(canvas\)\s*\{[\s\S]*?filter:[^;]*${prior}`,
						'u',
					),
				)
			}
		})
	})

	describe('CRT scanline orientation — driven by the shader, not CSS', () => {
		it('GameScene no longer owns scanline-orientation logic (moved to CrtDitherPass)', () => {
			expect(GAME_SCENE_SOURCE).not.toMatch(/scanline_angle_css/u)
			expect(GAME_SCENE_SOURCE).not.toMatch(/--scanline-angle/u)
			expect(GAME_SCENE_SOURCE).not.toContain('repeating-linear-gradient')
		})
	})

	describe('CRT curvature — rounded corners + corner darkening + glass-dome highlight', () => {
		it('applies a border-radius to the canvas to simulate the CRT screen shape', () => {
			expect(GAME_SCENE_SOURCE).toMatch(
				/\.game-container\s*:global\(canvas\)\s*\{[\s\S]*?border-radius:\s*clamp\(/u,
			)
		})

		it('applies the same border-radius to .crt-overlay so scanlines clip on the same curve', () => {
			expect(GAME_SCENE_SOURCE).toMatch(/\.crt-overlay\s*\{[\s\S]*?border-radius:\s*clamp\(/u)
		})

		it('adds four corner darkening radial-gradients to fake CRT curvature', () => {
			expect(GAME_SCENE_SOURCE).toMatch(/radial-gradient\(\s*circle\s+at\s+top\s+left/u)
			expect(GAME_SCENE_SOURCE).toMatch(/radial-gradient\(\s*circle\s+at\s+top\s+right/u)
			expect(GAME_SCENE_SOURCE).toMatch(/radial-gradient\(\s*circle\s+at\s+bottom\s+left/u)
			expect(GAME_SCENE_SOURCE).toMatch(/radial-gradient\(\s*circle\s+at\s+bottom\s+right/u)
		})

		it('uses alpha 0.4 for the four corner darkening gradients (lightened from 0.55 for legibility)', () => {
			// Reason: corner darkening alpha was 0.55 originally. The scanline overlay was
			// then bumped to alpha 1 (full-black stripes covering 50% of the screen), which
			// flooded the periphery. We dropped corners to 0.4 so the screen edges stay
			// readable while the curvature illusion still reads. Value-pin to catch
			// regressions in either direction (back to 0.55 = too dark; to 0.25 = no curvature).
			for (const corner of [
				String.raw`top\s+left`,
				String.raw`top\s+right`,
				String.raw`bottom\s+left`,
				String.raw`bottom\s+right`,
			]) {
				expect(GAME_SCENE_SOURCE).toMatch(
					new RegExp(
						String.raw`radial-gradient\(\s*circle\s+at\s+${corner},\s*rgba\(\s*0,\s*0,\s*0,\s*0\.4\s*\)`,
						'u',
					),
				)
			}

			// Negative: the prior 0.55 alpha must not be present in any corner-darkening position.
			expect(GAME_SCENE_SOURCE).not.toMatch(
				/radial-gradient\(\s*circle\s+at\s+(?:top|bottom)\s+(?:left|right),\s*rgba\(\s*0,\s*0,\s*0,\s*0\.55\s*\)/u,
			)
		})

		it('adds a glass-dome highlight (light radial gradient in the upper-left quadrant)', () => {
			expect(GAME_SCENE_SOURCE).toMatch(
				/radial-gradient\(\s*ellipse\s+\d+%\s+\d+%\s+at\s+\d+%\s+\d+%,[\s\S]*?rgba\(\s*255,\s*255,\s*255/u,
			)
		})

		it('keeps the center vignette alongside the curvature layers (scanlines now in shader)', () => {
			expect(GAME_SCENE_SOURCE).toMatch(
				/radial-gradient\(\s*ellipse\s+at\s+center,\s*transparent\s+50%/u,
			)
			expect(GAME_SCENE_SOURCE).not.toContain('repeating-linear-gradient')
		})

		it('uses alpha 0.3 for the center vignette (lightened from 0.45 to recover edge brightness)', () => {
			// Reason: same logic as the corner-darkening pin — the alpha-1 scanline overlay
			// dimmed the periphery too much, so the vignette alpha was dropped from 0.45 to
			// 0.3 to lift the screen-edge brightness. Pinning the value catches drift in
			// either direction.
			expect(GAME_SCENE_SOURCE).toMatch(
				/radial-gradient\(\s*ellipse\s+at\s+center,\s*transparent\s+50%,\s*rgba\(\s*0,\s*0,\s*0,\s*0\.3\s*\)\s+100%\s*\)/u,
			)
			// Negative: prior 0.45 alpha must not be at the vignette's outer stop.
			expect(GAME_SCENE_SOURCE).not.toMatch(
				/radial-gradient\(\s*ellipse\s+at\s+center,\s*transparent\s+50%,\s*rgba\(\s*0,\s*0,\s*0,\s*0\.45\s*\)/u,
			)
		})
	})

	describe('CRT color quantization + Bayer dithering (WebGL post-process)', () => {
		it('imports CrtDitherPass and renders it inside <Canvas>', () => {
			expect(GAME_SCENE_SOURCE).toMatch(
				/import\s+CrtDitherPass\s+from\s+'\$lib\/game-kit\/CrtDitherPass\.svelte'/u,
			)
			expect(GAME_SCENE_SOURCE).toMatch(/<Canvas[\s\S]*<CrtDitherPass[^/]*\/>[\s\S]*<\/Canvas>/u)
		})

		it('no longer references the legacy SVG palette filter (replaced by GPU post-process)', () => {
			expect(GAME_SCENE_SOURCE).not.toMatch(/<filter\s+id="crt-palette"/u)
			expect(GAME_SCENE_SOURCE).not.toMatch(/feComponentTransfer/u)
			expect(GAME_SCENE_SOURCE).not.toMatch(/url\(#crt-palette\)/u)
			expect(GAME_SCENE_SOURCE).not.toMatch(/\.crt-filter-defs\s*\{/u)
		})
	})

	describe('CRT chromatic aberration — wiring into GameScene', () => {
		it('imports <CrtChromaticFilter /> and renders it conditionally when CRT is enabled', () => {
			expect(GAME_SCENE_SOURCE).toMatch(
				/import\s+CrtChromaticFilter\s+from\s+'\$lib\/game-kit\/CrtChromaticFilter\.svelte'/u,
			)
			expect(GAME_SCENE_SOURCE).toMatch(/<CrtChromaticFilter\s*\/>/u)
			expect(GAME_SCENE_SOURCE).toMatch(/\{#if\s+is_crt_enabled\}[\s\S]*<CrtChromaticFilter/u)
		})

		it('applies the chromatic filter to the canvas via CSS filter chain under .crt-active', () => {
			// Reason: the SVG <filter> only takes effect when CSS references it. Locking in
			// `url(#crt-chromatic)` on the canvas filter chain is the wiring contract that
			// connects GameScene's <canvas> to the externally-defined filter.
			// Filter is now gated on .crt-active so toggling CRT off removes all post-processing.
			expect(GAME_SCENE_SOURCE).toMatch(
				/\.game-container\.crt-active\s*:global\(canvas\)\s*\{[\s\S]*?filter:[^;]*url\(#crt-chromatic\)/u,
			)
		})

		it('renders the SVG <filter id="crt-chromatic"> into the DOM at mount', () => {
			const { container } = render_scene()
			const filter = container.querySelector('#crt-chromatic')

			expect(filter).toBeTruthy()
			expect(filter?.tagName.toLowerCase()).toBe('filter')
		})
	})

	describe('safe-area drawing when fullscreen is engaged (Issue #80)', () => {
		it('derives is_fullscreen_active from fullscreen.is_active', () => {
			expect(GAME_SCENE_SOURCE).toMatch(
				/(?:let|const)\s+is_fullscreen_active\s*=\s*\$derived\(\s*fullscreen\.is_active\s*\)/u,
			)
		})

		it('binds class:is-fullscreen on the game-container using is_fullscreen_active', () => {
			expect(GAME_SCENE_SOURCE).toMatch(/class:is-fullscreen=\{is_fullscreen_active\}/u)
		})

		it('applies the is-fullscreen class when fullscreen.is_active is true', () => {
			vi.spyOn(fullscreen, 'is_active', 'get').mockReturnValue(true)
			const { container } = render_scene()
			const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]')

			expect(scene).toBeTruthy()
			expect(scene?.classList.contains('is-fullscreen')).toBe(true)
		})

		it('omits the is-fullscreen class when fullscreen.is_active is false', () => {
			vi.spyOn(fullscreen, 'is_active', 'get').mockReturnValue(false)
			const { container } = render_scene()
			const scene = container.querySelector<HTMLElement>('[data-testid="game-scene"]')

			expect(scene).toBeTruthy()
			expect(scene?.classList.contains('is-fullscreen')).toBe(false)
		})

		it('default .game-container reserves safe-area-inset padding on all four sides', () => {
			expect(GAME_SCENE_SOURCE).toMatch(
				/\.game-container\s*\{[\s\S]*?padding-top:\s*env\(safe-area-inset-top/u,
			)
			expect(GAME_SCENE_SOURCE).toMatch(
				/\.game-container\s*\{[\s\S]*?padding-right:\s*env\(safe-area-inset-right/u,
			)
			expect(GAME_SCENE_SOURCE).toMatch(
				/\.game-container\s*\{[\s\S]*?padding-bottom:\s*env\(safe-area-inset-bottom/u,
			)
			expect(GAME_SCENE_SOURCE).toMatch(
				/\.game-container\s*\{[\s\S]*?padding-left:\s*env\(safe-area-inset-left/u,
			)
		})

		it('.game-container uses box-sizing: border-box so the safe-area padding does not bloat the box', () => {
			expect(GAME_SCENE_SOURCE).toMatch(/\.game-container\s*\{[\s\S]*?box-sizing:\s*border-box/u)
		})

		it('.game-container.is-fullscreen drops the safe-area padding so content extends edge-to-edge', () => {
			expect(GAME_SCENE_SOURCE).toMatch(/\.game-container\.is-fullscreen\s*\{[\s\S]*?padding:\s*0/u)
		})

		it('.pause-btn offset includes env(safe-area-inset-*) so the button stays clear of OS UI even in fullscreen', () => {
			expect(GAME_SCENE_SOURCE).toMatch(
				/\.pause-btn\s*\{[\s\S]*?bottom:\s*calc\([^)]*env\(safe-area-inset-bottom/u,
			)
			expect(GAME_SCENE_SOURCE).toMatch(
				/\.pause-btn\s*\{[\s\S]*?right:\s*calc\([^)]*env\(safe-area-inset-right/u,
			)
		})
	})

	describe('antialiasing — enabled on desktop when RETRO mode is off (Issue #116)', () => {
		it('imports should_use_antialias from the antialias helper', () => {
			expect(GAME_SCENE_SOURCE).toMatch(
				/import\s*\{\s*should_use_antialias\s*\}\s*from\s*'\$lib\/game-kit\/antialias'/u,
			)
		})

		it('derives is_aa_enabled from should_use_antialias(is_touch) only — not is_crt_enabled', () => {
			// Reason: AA is fixed at WebGL context creation. Reacting to is_crt_enabled would
			// force a Canvas remount on every RETRO toggle, resetting the player position.
			// Always-on AA on desktop is masked by the CRT post-process when RETRO is on, so we
			// only need is_touch as the input.
			expect(GAME_SCENE_SOURCE).toMatch(
				/(?:let|const)\s+is_aa_enabled\s*=\s*\$derived\(\s*should_use_antialias\(\s*is_touch\s*\)\s*\)/u,
			)
		})

		it('does NOT wrap <Canvas> in a {#key} block — toggling RETRO must not remount the Canvas', () => {
			// Negative pin: a `{#key is_aa_enabled}` or `{#key is_crt_enabled}` wrapper would
			// destroy and recreate the WebGL context on toggle, resetting player position and
			// scene state. Keep the Canvas mounted for the lifetime of the GameScene.
			expect(GAME_SCENE_SOURCE).not.toMatch(/\{#key\s+is_aa_enabled\}/u)
			expect(GAME_SCENE_SOURCE).not.toMatch(/\{#key\s+is_crt_enabled\}/u)
		})

		it('passes the antialias flag into the renderer factory via createRenderer', () => {
			expect(GAME_SCENE_SOURCE).toMatch(
				/createRenderer=\{\s*create_renderer_factory\(\s*is_aa_enabled\s*\)\s*\}/u,
			)
		})

		it('no longer hardcodes antialias: false on the WebGLRenderer call', () => {
			// Negative pin: a future regression that re-introduces the hardcoded `antialias: false`
			// literal would silently break the desktop-RETRO-off path.
			expect(GAME_SCENE_SOURCE).not.toMatch(/antialias:\s*false/u)
		})
	})

	describe('status live-region is visually hidden via scoped CSS (Issue #131)', () => {
		const MAX_VISUALLY_HIDDEN_HEIGHT_PX = 1

		it('keeps [role="status"] visually hidden before the session starts', () => {
			const { container } = render_scene()
			const status = container.querySelector<HTMLElement>('[role="status"]')

			expect(status).toBeTruthy()
			if (!status) return
			expect(status.getBoundingClientRect().height).toBeLessThanOrEqual(
				MAX_VISUALLY_HIDDEN_HEIGHT_PX,
			)
		})

		it('keeps [role="status"] visually hidden after session.start_session()', () => {
			const { container } = render_scene()

			session.start_session()
			flushSync()
			const status = container.querySelector<HTMLElement>('[role="status"]')

			expect(status).toBeTruthy()
			if (!status) return
			expect(status.textContent).toBe(LABEL_GAME_STARTED)
			expect(status.getBoundingClientRect().height).toBeLessThanOrEqual(
				MAX_VISUALLY_HIDDEN_HEIGHT_PX,
			)
		})

		it('drops the Tailwind sr-only class so dist consumers do not need Tailwind @source', () => {
			// Reason: Tailwind v4 ignores node_modules by default. A consumer importing this
			// component without an explicit `@source "../../node_modules/.../dist/**/*.svelte"`
			// would not generate the `sr-only` utility, and the live-region would fall back to
			// display: block and render as a ~24px visible band at the top of the viewport.
			expect(GAME_SCENE_SOURCE).not.toMatch(/class="sr-only"/u)
		})

		it('defines a scoped .visually-hidden style using the standard hiding scaffolding', () => {
			// Standard visually-hidden pattern: 1px box, overflow hidden, clip rect, no white-space wrap.
			expect(GAME_SCENE_SOURCE).toMatch(/\.visually-hidden\s*\{[\s\S]*?position:\s*absolute/u)
			expect(GAME_SCENE_SOURCE).toMatch(/\.visually-hidden\s*\{[\s\S]*?width:\s*1px/u)
			expect(GAME_SCENE_SOURCE).toMatch(/\.visually-hidden\s*\{[\s\S]*?height:\s*1px/u)
			expect(GAME_SCENE_SOURCE).toMatch(/\.visually-hidden\s*\{[\s\S]*?overflow:\s*hidden/u)
			expect(GAME_SCENE_SOURCE).toMatch(
				/\.visually-hidden\s*\{[\s\S]*?clip:\s*rect\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/u,
			)
		})

		it('applies the scoped visually-hidden class to the [role="status"] element', () => {
			expect(GAME_SCENE_SOURCE).toMatch(/<div\s+role="status"\s+class="visually-hidden">/u)
		})
	})
})
