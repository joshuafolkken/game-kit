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

const SEL_GAME_SCENE = '[data-testid="game-scene"]'
const SEL_JUMP_BTN = '[data-testid="jump-btn"]'
const SEL_CYBER_GLOW = '[data-testid="cyber-glow"]'
const SEL_PAUSE_BTN = '[data-testid="pause-btn"]'
const SEL_CRT_OVERLAY = '[data-testid="crt-overlay"]'
const SEL_STATUS_ROLE = '[role="status"]'
const REPEATING_LINEAR_GRADIENT = 'repeating-linear-gradient'
const CLASS_IS_FULLSCREEN = 'is-fullscreen'

async function render_scene(extra: Record<string, unknown> = {}): ReturnType<typeof render> {
	return await render(GameScene, {
		props: {
			label_jump: LABEL_JUMP,
			label_game: LABEL_GAME,
			label_game_started: LABEL_GAME_STARTED,
			label_pause: LABEL_PAUSE,
			...extra,
		},
	})
}

beforeEach(() => {
	session.reset_session()
	game_state.reset_mode()
})

afterEach(() => {
	vi.restoreAllMocks()
})

it('renders game-scene container', async () => {
	const { container } = await render_scene()

	expect(container.querySelector(SEL_GAME_SCENE)).toBeTruthy()
})

it('hides jump button before the session starts', async () => {
	const { container } = await render_scene()

	expect(container.querySelector(SEL_JUMP_BTN)).toBeNull()
})

it('shows jump button with aria-label after session starts', async () => {
	const { container } = await render_scene()
	const scene = container.querySelector<HTMLElement>(SEL_GAME_SCENE)

	expect(scene).toBeTruthy()
	if (!scene) return
	scene.click()
	flushSync()
	const button = container.querySelector<HTMLElement>(SEL_JUMP_BTN)

	expect(button).toBeTruthy()
	expect(button?.getAttribute('aria-label')).toBe(LABEL_JUMP)
	expect(button?.querySelector('svg')).toBeTruthy()
})

it('renders a canvas element', async () => {
	const { container } = await render_scene()

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

it('forwards hint_text, is_touch, hint_font and both font adjustments into <ControlsScene />', () => {
	expect(GAME_SCENE_SOURCE).toMatch(
		/<ControlsScene[\s\S]*?\{hint_text\}[\s\S]*?\{is_touch\}[\s\S]*?\{hint_font\}[\s\S]*?\{hint_font_scale\}[\s\S]*?\{hint_font_y_offset\}[\s\S]*?\/>/u,
	)
})

it('declares hint_font (string) plus optional numeric hint_font_scale / hint_font_y_offset props', () => {
	expect(GAME_SCENE_SOURCE).toMatch(
		/interface\s+Props\s*\{[\s\S]*?hint_font\?\s*:\s*string[\s\S]*?\}/u,
	)
	expect(GAME_SCENE_SOURCE).toMatch(/hint_font_scale\?\s*:\s*number\s*\|\s*undefined/u)
	expect(GAME_SCENE_SOURCE).toMatch(/hint_font_y_offset\?\s*:\s*number\s*\|\s*undefined/u)
})

it('declares optional hint_color / key_color / icon_color string props (#371)', () => {
	expect(GAME_SCENE_SOURCE).toMatch(/hint_color\?\s*:\s*string\s*\|\s*undefined/u)
	expect(GAME_SCENE_SOURCE).toMatch(/key_color\?\s*:\s*string\s*\|\s*undefined/u)
	expect(GAME_SCENE_SOURCE).toMatch(/icon_color\?\s*:\s*string\s*\|\s*undefined/u)
})

it('forwards hint_color / key_color / icon_color into <ControlsScene /> (#371)', () => {
	expect(GAME_SCENE_SOURCE).toMatch(
		/<ControlsScene[\s\S]*?\{hint_color\}[\s\S]*?\{key_color\}[\s\S]*?\{icon_color\}[\s\S]*?\/>/u,
	)
})

it('calls on_start callback when user first clicks', async () => {
	let is_called = false
	const { container } = await render_scene({
		on_start: () => {
			is_called = true
		},
	})
	const scene = container.querySelector<HTMLElement>(SEL_GAME_SCENE)

	expect(scene).toBeTruthy()
	if (!scene) return
	scene.click()
	expect(is_called).toBe(true)
})

it('calls on_start only once across multiple clicks', async () => {
	let call_count = 0
	const { container } = await render_scene({
		on_start: () => {
			// eslint-disable-next-line no-plusplus -- idiomatic counter increment inside a test callback
			call_count++
		},
	})
	const scene = container.querySelector<HTMLElement>(SEL_GAME_SCENE)

	expect(scene).toBeTruthy()
	if (!scene) return
	scene.click()
	scene.click()
	scene.click()
	expect(call_count).toBe(1)
})

it('start_game runs init_audio only once across multiple clicks', async () => {
	const spy = vi.spyOn(audio, 'init_audio')
	const { container } = await render_scene()
	const scene = container.querySelector<HTMLElement>(SEL_GAME_SCENE)

	expect(scene).toBeTruthy()
	if (!scene) return
	scene.click()
	scene.click()
	scene.click()
	expect(spy).toHaveBeenCalledTimes(1)
})

it('start_game requests fullscreen on touch-primary devices', async () => {
	vi.spyOn(device, 'is_touch_primary', 'get').mockReturnValue(true)
	const fullscreen_spy = vi.spyOn(fullscreen, 'request').mockResolvedValue()
	const { container } = await render_scene()
	const scene = container.querySelector<HTMLElement>(SEL_GAME_SCENE)

	expect(scene).toBeTruthy()
	if (!scene) return
	scene.click()
	expect(fullscreen_spy).toHaveBeenCalledTimes(1)
})

it('start_game does not request fullscreen on desktop devices but still inits audio', async () => {
	vi.spyOn(device, 'is_touch_primary', 'get').mockReturnValue(false)
	const fullscreen_spy = vi.spyOn(fullscreen, 'request').mockResolvedValue()
	const audio_spy = vi.spyOn(audio, 'init_audio')
	const { container } = await render_scene()
	const scene = container.querySelector<HTMLElement>(SEL_GAME_SCENE)

	expect(scene).toBeTruthy()
	if (!scene) return
	scene.click()
	expect(fullscreen_spy).not.toHaveBeenCalled()
	expect(audio_spy).toHaveBeenCalledTimes(1)
})

it('registers the game-scene container with fullscreen_switch_input on mount', async () => {
	const spy = vi.spyOn(fullscreen_switch_input, 'set_container')
	const { container } = await render_scene()
	const scene = container.querySelector<HTMLElement>(SEL_GAME_SCENE)

	expect(scene).toBeTruthy()
	expect(spy).toHaveBeenCalledWith(scene)
})

it('sets session.is_session_started to true after first click', async () => {
	const { container } = await render_scene()
	const scene = container.querySelector<HTMLElement>(SEL_GAME_SCENE)

	expect(scene).toBeTruthy()
	if (!scene) return
	expect(session.is_session_started).toBe(false)
	scene.click()
	expect(session.is_session_started).toBe(true)
})

it('does not render cyber-glow when game_state.is_alt is false', async () => {
	const { container } = await render_scene()

	expect(container.querySelector(SEL_CYBER_GLOW)).toBeNull()
})

it('renders cyber-glow when game_state.is_alt is true', async () => {
	game_state.toggle_alt()
	const { container } = await render_scene()

	expect(container.querySelector(SEL_CYBER_GLOW)).toBeTruthy()
})

describe('ESC / Z key — return to start', () => {
	it.each([
		{ label: 'ESC', key: 'Escape' },
		{ label: 'Z', key: 'z' },
		{ label: 'uppercase Z', key: 'Z' },
	])('pressing $label while session is active calls reset_session', async ({ key }) => {
		const { container } = await render_scene()
		const scene = container.querySelector<HTMLElement>(SEL_GAME_SCENE)

		expect(scene).toBeTruthy()
		if (!scene) return
		scene.click()
		expect(session.is_session_started).toBe(true)
		scene.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
		expect(session.is_session_started).toBe(false)
	})

	it('pressing ESC while session is not active does not start the game', async () => {
		const { container } = await render_scene()
		const scene = container.querySelector<HTMLElement>(SEL_GAME_SCENE)

		expect(scene).toBeTruthy()
		if (!scene) return
		expect(session.is_session_started).toBe(false)
		scene.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
		expect(session.is_session_started).toBe(false)
	})
})

describe('Enter / Space — start session', () => {
	it('pressing Enter starts the session', async () => {
		const { container } = await render_scene()
		const scene = container.querySelector<HTMLElement>(SEL_GAME_SCENE)

		expect(scene).toBeTruthy()
		if (!scene) return
		expect(session.is_session_started).toBe(false)
		scene.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
		expect(session.is_session_started).toBe(true)
	})

	it('pressing Space does NOT start the session (reserved for jump input)', async () => {
		const { container } = await render_scene()
		const scene = container.querySelector<HTMLElement>(SEL_GAME_SCENE)

		expect(scene).toBeTruthy()
		if (!scene) return
		expect(session.is_session_started).toBe(false)
		scene.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
		expect(session.is_session_started).toBe(false)
	})
})

describe('mobile move/look during controls overlay', () => {
	it('joystick zones are rendered before session starts so move/look work in overlay', async () => {
		vi.spyOn(device, 'is_touch_primary', 'get').mockReturnValue(true)
		const { container } = await render_scene()

		expect(container.querySelectorAll('.joystick-zone')).toHaveLength(2)
	})
})

describe('mobile pause button', () => {
	it('shows pause button when session is active on touch device', async () => {
		vi.spyOn(device, 'is_touch_primary', 'get').mockReturnValue(true)
		vi.spyOn(fullscreen, 'request').mockResolvedValue()
		const { container } = await render_scene()
		const scene = container.querySelector<HTMLElement>(SEL_GAME_SCENE)

		expect(scene).toBeTruthy()
		if (!scene) return
		scene.click()
		flushSync()
		expect(container.querySelector(SEL_PAUSE_BTN)).toBeTruthy()
	})

	it('does not show pause button on desktop', async () => {
		vi.spyOn(device, 'is_touch_primary', 'get').mockReturnValue(false)
		const { container } = await render_scene()
		const scene = container.querySelector<HTMLElement>(SEL_GAME_SCENE)

		expect(scene).toBeTruthy()
		if (!scene) return
		scene.click()
		flushSync()
		expect(container.querySelector(SEL_PAUSE_BTN)).toBeNull()
	})

	it('does not show pause button before session starts', async () => {
		vi.spyOn(device, 'is_touch_primary', 'get').mockReturnValue(true)
		const { container } = await render_scene()

		expect(container.querySelector(SEL_PAUSE_BTN)).toBeNull()
	})

	it('clicking pause button resets session', async () => {
		vi.spyOn(device, 'is_touch_primary', 'get').mockReturnValue(true)
		vi.spyOn(fullscreen, 'request').mockResolvedValue()
		const { container } = await render_scene()
		const scene = container.querySelector<HTMLElement>(SEL_GAME_SCENE)

		expect(scene).toBeTruthy()
		if (!scene) return
		scene.click()
		flushSync()
		const pause_button = container.querySelector<HTMLElement>(SEL_PAUSE_BTN)

		expect(pause_button).toBeTruthy()
		if (!pause_button) return
		pause_button.click()
		flushSync()
		expect(session.is_session_started).toBe(false)
	})

	it('pause button is positioned at bottom-right of the screen', async () => {
		vi.spyOn(device, 'is_touch_primary', 'get').mockReturnValue(true)
		vi.spyOn(fullscreen, 'request').mockResolvedValue()
		const { container } = await render_scene()
		const scene = container.querySelector<HTMLElement>(SEL_GAME_SCENE)

		expect(scene).toBeTruthy()
		if (!scene) return
		scene.click()
		flushSync()
		const pause_button = container.querySelector<HTMLElement>(SEL_PAUSE_BTN)

		expect(pause_button).toBeTruthy()
		if (!pause_button) return
		const style = getComputedStyle(pause_button)

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
		// CrtDitherPass via the lo_dpr prop. Match across whitespace: adding the toneMapping
		// attr (game-kit#389) makes Prettier wrap <Canvas> onto multiple lines.
		expect(GAME_SCENE_SOURCE).toMatch(/<Canvas[\s\S]*?dpr=\{1\}/u)
		expect(GAME_SCENE_SOURCE).not.toMatch(/dpr=\{pixel_dpr\}/u)
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
	it('renders a CRT overlay element over the game container, regardless of session state', async () => {
		const { container } = await render_scene()

		expect(container.querySelector(SEL_CRT_OVERLAY)).toBeTruthy()
	})

	it('CRT overlay is a sibling of the Canvas so it covers the entire game screen', async () => {
		const { container } = await render_scene()
		const game_scene = container.querySelector<HTMLElement>(SEL_GAME_SCENE)

		expect(game_scene).toBeTruthy()
		if (!game_scene) return
		const overlay = game_scene.querySelector<HTMLElement>(SEL_CRT_OVERLAY)

		expect(overlay?.parentElement).toBe(game_scene)
	})

	it('CRT overlay does not block pointer events (UI underneath stays interactive)', async () => {
		const { container } = await render_scene()
		const overlay = container.querySelector<HTMLElement>(SEL_CRT_OVERLAY)

		expect(overlay).toBeTruthy()
		if (!overlay) return
		const style = getComputedStyle(overlay)

		expect(style.pointerEvents).toBe('none')
	})

	it('.crt-overlay no longer renders scanlines in CSS — moved to the WebGL dither shader', () => {
		// Scanlines now live in DITHER_FRAGMENT_SHADER so they curve with the barrel pass.
		expect(GAME_SCENE_SOURCE).not.toContain(REPEATING_LINEAR_GRADIENT)
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

	it('leaves no CSS filter on the canvas — grading moved into the barrel shader (#419)', () => {
		// Reason: `contrast(0.95) saturate(1.2) brightness(1) url(#crt-chromatic)` cost ~6 ms per
		// frame on a Pixel 6 Pro, where the compositor works at 1440x3120 while the WebGL pipeline
		// stays at CSS resolution. The grading values are pinned in crt-barrel.test.ts now; what
		// this file has to guarantee is that no `filter` declaration comes back to the canvas,
		// since any of them re-introduces the composited-layer path this change removed.
		expect(GAME_SCENE_SOURCE).not.toMatch(/:global\(canvas\)\s*\{[^}]*filter:/u)
		expect(GAME_SCENE_SOURCE).not.toMatch(/url\(#crt-chromatic\)/u)

		// Negative: no filter tuning of any generation may reappear on the canvas.
		for (const prior of ['contrast(', 'saturate(', 'brightness(', 'hue-rotate(']) {
			expect(GAME_SCENE_SOURCE).not.toContain(prior)
		}
	})
})

describe('CRT scanline orientation — driven by the shader, not CSS', () => {
	it('GameScene no longer owns scanline-orientation logic (moved to CrtDitherPass)', () => {
		expect(GAME_SCENE_SOURCE).not.toMatch(/scanline_angle_css/u)
		expect(GAME_SCENE_SOURCE).not.toMatch(/--scanline-angle/u)
		expect(GAME_SCENE_SOURCE).not.toContain(REPEATING_LINEAR_GRADIENT)
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
		expect(GAME_SCENE_SOURCE).not.toContain(REPEATING_LINEAR_GRADIENT)
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

describe('CRT chromatic aberration — moved out of GameScene (#419)', () => {
	it('no longer imports or renders the SVG filter component', () => {
		expect(GAME_SCENE_SOURCE).not.toMatch(/CrtChromaticFilter/u)
	})

	it('keeps the .crt-active state class, which no longer carries any canvas styling', () => {
		// The class survives as the state marker asserted by GameSceneCrtInitial.svelte.test.ts;
		// only the filter declaration it used to gate is gone.
		expect(GAME_SCENE_SOURCE).toMatch(/class:crt-active=\{is_crt_enabled\}/u)
	})

	it('renders no #crt-chromatic filter into the DOM at mount', async () => {
		const { container } = await render_scene()

		expect(container.querySelector('#crt-chromatic')).toBeNull()
		expect(container.querySelector('[data-testid="crt-chromatic-defs"]')).toBeNull()
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

	it('applies the is-fullscreen class when fullscreen.is_active is true', async () => {
		vi.spyOn(fullscreen, 'is_active', 'get').mockReturnValue(true)
		const { container } = await render_scene()
		const scene = container.querySelector<HTMLElement>(SEL_GAME_SCENE)

		expect(scene).toBeTruthy()
		expect(scene?.classList.contains(CLASS_IS_FULLSCREEN)).toBe(true)
	})

	it('omits the is-fullscreen class when fullscreen.is_active is false', async () => {
		vi.spyOn(fullscreen, 'is_active', 'get').mockReturnValue(false)
		const { container } = await render_scene()
		const scene = container.querySelector<HTMLElement>(SEL_GAME_SCENE)

		expect(scene).toBeTruthy()
		expect(scene?.classList.contains(CLASS_IS_FULLSCREEN)).toBe(false)
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

describe('antialiasing — unconditional since the CRT frame cost was removed (#429)', () => {
	it('requests antialias with a literal true, with no device gate left to read', () => {
		// Reason: the touch-primary gate from #116 assumed MSAA is unaffordable on a phone. Once
		// #419 removed the CSS filter's ~6 ms per frame, a Pixel 6 Pro held 120 fps with AA on in
		// both RETRO modes, so the gate — and the helper module behind it — are gone.
		expect(GAME_SCENE_SOURCE).toMatch(/antialias:\s*true/u)
		expect(GAME_SCENE_SOURCE).not.toMatch(/antialias:\s*false/u)
	})

	it('no longer imports or derives a device-dependent antialias flag', () => {
		expect(GAME_SCENE_SOURCE).not.toMatch(/should_use_antialias/u)
		expect(GAME_SCENE_SOURCE).not.toMatch(/is_aa_enabled/u)
		expect(GAME_SCENE_SOURCE).not.toMatch(/game-kit\/antialias/u)
	})

	it('calls the renderer factory with no arguments via createRenderer', () => {
		expect(GAME_SCENE_SOURCE).toMatch(/createRenderer=\{\s*create_renderer_factory\(\s*\)\s*\}/u)
	})

	it('does NOT wrap <Canvas> in a {#key} block — toggling RETRO must not remount the Canvas', () => {
		// Negative pin, unchanged in intent: `antialias` is fixed at context creation, so any
		// {#key} wrapper would destroy and recreate the WebGL context on toggle, resetting the
		// player position and scene state.
		expect(GAME_SCENE_SOURCE).not.toMatch(/\{#key\s+is_aa_enabled\}/u)
		expect(GAME_SCENE_SOURCE).not.toMatch(/\{#key\s+is_crt_enabled\}/u)
	})
})

describe('status live-region is visually hidden via scoped CSS (Issue #131)', () => {
	const MAX_VISUALLY_HIDDEN_HEIGHT_PX = 1

	it('keeps [role="status"] visually hidden before the session starts', async () => {
		const { container } = await render_scene()
		const status = container.querySelector<HTMLElement>(SEL_STATUS_ROLE)

		expect(status).toBeTruthy()
		if (!status) return
		expect(status.getBoundingClientRect().height).toBeLessThanOrEqual(MAX_VISUALLY_HIDDEN_HEIGHT_PX)
	})

	it('keeps [role="status"] visually hidden after session.start_session()', async () => {
		const { container } = await render_scene()

		session.start_session()
		flushSync()
		const status = container.querySelector<HTMLElement>(SEL_STATUS_ROLE)

		expect(status).toBeTruthy()
		if (!status) return
		expect(status.textContent).toBe(LABEL_GAME_STARTED)
		expect(status.getBoundingClientRect().height).toBeLessThanOrEqual(MAX_VISUALLY_HIDDEN_HEIGHT_PX)
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
