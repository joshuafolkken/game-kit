import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { stub_touch_primary } from './e2e-helpers'

const FULLSCREEN_NOT_CALLED_WAIT_MS = 200
const HIGH_SCORE_STORAGE_KEY = 'game_high_score'
const HIGH_SCORE_ROUND_KEY = 'game_high_score_round'
const HIGH_SCORE_CHECK_KEY = 'game_high_score_check'
const CHECK_SEED = 0x9e_37_79_b9
const SAMPLE_HIGH_SCORE = 5000
const SAMPLE_HIGH_ROUND = 3
const LOADING_OVERLAY_TIMEOUT_MS = 8000
const SEL_GAME_SCENE = '[data-testid="game-scene"]'
const SEL_GAME_CANVAS = '[data-testid="game-scene"] canvas'
const GAME_SCENE_TARGET = 'game-scene'

test('fullscreen is requested on touch-primary devices when start hint is clicked', async ({
	page,
}) => {
	await stub_touch_primary(page, true)
	await page.goto('/')
	await expect(page.locator(SEL_GAME_SCENE)).toBeVisible()

	const fullscreen_target = await page.evaluate(
		async ([sel, target]) =>
			await new Promise<string>((resolve) => {
				const scene = document.querySelector<HTMLElement>(sel)

				if (!scene) {
					resolve('no-scene')

					return
				}

				// eslint-disable-next-line @typescript-eslint/promise-function-async -- test mock simulates a Promise<void>-returning DOM API
				scene.requestFullscreen = function (): Promise<void> {
					resolve(target)

					return Promise.resolve()
				}

				scene.click()
			}),
		[SEL_GAME_SCENE, GAME_SCENE_TARGET] as const,
	)

	expect(fullscreen_target).toBe(GAME_SCENE_TARGET)
})

test('fullscreen is NOT requested on desktop devices when start hint is clicked', async ({
	page,
}) => {
	await stub_touch_primary(page, false)
	await page.goto('/')
	await expect(page.locator(SEL_GAME_SCENE)).toBeVisible()

	const is_fullscreen_requested = await page.evaluate(
		async ([sel, wait_ms]) =>
			await new Promise<boolean>((resolve) => {
				const scene = document.querySelector<HTMLElement>(sel)

				if (!scene) {
					resolve(false)

					return
				}

				let is_called = false

				// eslint-disable-next-line @typescript-eslint/promise-function-async -- test mock simulates a Promise<void>-returning DOM API
				scene.requestFullscreen = function (): Promise<void> {
					is_called = true

					return Promise.resolve()
				}

				scene.click()
				setTimeout(() => {
					resolve(is_called)
				}, wait_ms)
			}),
		[SEL_GAME_SCENE, FULLSCREEN_NOT_CALLED_WAIT_MS] as const,
	)

	expect(is_fullscreen_requested).toBe(false)
})

test('pseudo-fullscreen class is applied when native API is unavailable on touch devices', async ({
	page,
}) => {
	await stub_touch_primary(page, true)
	await page.goto('/')
	await expect(page.locator(SEL_GAME_SCENE)).toBeVisible()

	await page.evaluate((sel) => {
		const scene = document.querySelector<HTMLElement>(sel)
		if (!scene) return
		Object.defineProperties(scene, {
			requestFullscreen: { value: undefined, configurable: true },
			webkitRequestFullscreen: {
				value: undefined,
				configurable: true,
			},
		})
		scene.click()
	}, SEL_GAME_SCENE)

	await expect(page.locator(SEL_GAME_SCENE)).toHaveClass(/pseudo-fullscreen/u)
})

test('page has no critical or serious accessibility violations', async ({ page }) => {
	await page.goto('/')
	const results = await new AxeBuilder({ page }).exclude('canvas').analyze()
	const violations = results.violations.filter(
		(violation) => violation.impact === 'critical' || violation.impact === 'serious',
	)

	expect(violations).toHaveLength(0)
})

test('high score persists in localStorage across page reload', async ({ page }) => {
	/* eslint-disable no-bitwise -- score-tamper-check hash; mirrors src/lib/game/Score.svelte.ts compute_check */
	const stored_check =
		(Math.imul(SAMPLE_HIGH_SCORE + 1, CHECK_SEED) ^
			Math.imul(SAMPLE_HIGH_ROUND + 1, CHECK_SEED >>> 1)) >>>
		0
	/* eslint-enable no-bitwise */

	await page.goto('/')
	await page.evaluate(
		([sk, rk, ck, score, round, check]) => {
			localStorage.setItem(sk, String(score))
			localStorage.setItem(rk, String(round))
			localStorage.setItem(ck, String(check))
		},
		[
			HIGH_SCORE_STORAGE_KEY,
			HIGH_SCORE_ROUND_KEY,
			HIGH_SCORE_CHECK_KEY,
			SAMPLE_HIGH_SCORE,
			SAMPLE_HIGH_ROUND,
			stored_check,
		] as const,
	)
	await page.goto('/')
	const [score_value, round_value, check_value] = await page.evaluate(
		([sk, rk, ck]) => [
			localStorage.getItem(sk),
			localStorage.getItem(rk),
			localStorage.getItem(ck),
		],
		[HIGH_SCORE_STORAGE_KEY, HIGH_SCORE_ROUND_KEY, HIGH_SCORE_CHECK_KEY] as const,
	)

	expect(score_value).toBe(String(SAMPLE_HIGH_SCORE))
	expect(round_value).toBe(String(SAMPLE_HIGH_ROUND))
	expect(check_value).toBe(String(stored_check))
})

test('game scene loads without shadow-related WebGL errors', async ({ page }) => {
	const errors: Array<string> = []

	page.on('pageerror', (error) => {
		errors.push(error.message)
	})
	await page.goto('/')
	await expect(page.locator('[data-testid="loading-overlay"]')).toBeHidden({
		timeout: LOADING_OVERLAY_TIMEOUT_MS,
	})
	const webgl_errors = errors.filter(
		(e) => e.toLowerCase().includes('shadow') || e.toLowerCase().includes('webgl'),
	)

	expect(webgl_errors).toHaveLength(0)
})

test('favicon link points to the game icon, not the Svelte logo', async ({ page }) => {
	await page.goto('/')
	const icon_href = await page.evaluate(() => {
		const links = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]')
		const last = [...links].at(-1)

		return last?.getAttribute('href') ?? null
	})

	expect(icon_href).toBe('/icon.svg')
})

test('loading overlay shows JOSHUA GAME as the game title', async ({ page }) => {
	await page.goto('/')
	const game_title = await page.evaluate(() => {
		const overlay = document.querySelector('#static-loading-overlay')
		const element = overlay?.querySelector('.game-title')

		return element?.textContent ?? null
	})

	expect(game_title).toBe('JOSHUA GAME')
})

test('server HTML has game name placeholders replaced', async ({ page }) => {
	const response = await page.request.get('/')
	const html = await response.text()

	expect(html).toContain('<title>Joshua Game</title>')
	expect(html).toContain('>JOSHUA GAME<')
	expect(html).not.toContain('__GAME_NAME__')
	expect(html).not.toContain('__GAME_NAME_DISPLAY__')
})

test('PWA manifest is linked in document head', async ({ page }) => {
	await page.goto('/')
	const manifest_href = await page.evaluate(() => {
		const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')

		return link?.href ?? null
	})

	expect(manifest_href).not.toBeNull()
})

test('service worker is ready after page load', async ({ page }) => {
	await page.goto('/')
	const scope = await page.evaluate(async () => {
		if (!('serviceWorker' in navigator)) return null
		const reg = await navigator.serviceWorker.ready

		return reg.scope
	})

	expect(scope).toBeTruthy()
})

// #423 deleted this component's own per-frame renderer.setSize() / setPixelRatio() calls, on the
// grounds that Threlte already sizes the renderer from its resize stage whenever the element
// actually changes. This test is the guard for exactly that assumption: if Threlte's sizing were
// ever insufficient, the drawing buffer would stop tracking its CSS box after a resize. The
// composer half of the change is covered by the gate's own unit tests in crt-resize.test.ts.
const RESIZE_STEPS = [
	{ width: 900, height: 700 },
	{ width: 1280, height: 800 },
	{ width: 480, height: 900 },
]
const RESIZE_SETTLE_TIMEOUT_MS = 5000
const BUFFER_SIZE_TOLERANCE_PX = 1

test('canvas drawing buffer keeps tracking its CSS size across viewport resizes', async ({
	page,
}) => {
	await page.goto('/')
	await expect(page.locator(SEL_GAME_SCENE)).toBeVisible()
	const canvas = page.locator(SEL_GAME_CANVAS)

	await expect(canvas).toBeVisible()

	for (const size of RESIZE_STEPS) {
		await page.setViewportSize(size)

		// The drawing buffer is floored from the CSS box at dpr 1, so allow a single pixel.
		await expect
			.poll(
				async () =>
					await canvas.evaluate((element: HTMLCanvasElement, tolerance: number) => {
						const rect = element.getBoundingClientRect()

						return (
							Math.abs(element.width - rect.width) <= tolerance &&
							Math.abs(element.height - rect.height) <= tolerance
						)
					}, BUFFER_SIZE_TOLERANCE_PX),
				{ timeout: RESIZE_SETTLE_TIMEOUT_MS },
			)
			.toBe(true)
	}
})

// #421 merged the three stage-2 CRT passes into one shader built from GLSL chunks. The failure mode
// that no source-level test can reach is the merged program failing to compile or link at runtime —
// a sampler passed as a function parameter, a uniform declared by one chunk and read by another,
// a name collision between chunks. three reports all of those through console.error and then draws
// nothing, so a silent black canvas is what a regression looks like.
//
// Both orientations run because the scanline axis flips on portrait, taking a different branch
// through the merged shader's coordinate math.
const CRT_ORIENTATIONS = [
	{ name: 'landscape', width: 1280, height: 800 },
	{ name: 'portrait', width: 480, height: 900 },
]
const SHADER_ERROR_PATTERN = /three|shader|webgl|glsl/iu

test('CRT renders in both orientations without a shader or WebGL error', async ({ page }) => {
	const errors: Array<string> = []

	page.on('console', (message) => {
		if (message.type() === 'error') errors.push(message.text())
	})
	page.on('pageerror', (error) => {
		errors.push(error.message)
	})

	await page.goto('/')
	await expect(page.locator(SEL_GAME_SCENE)).toBeVisible()

	// The RETRO overlay is only in the DOM while CRT mode is on, so it doubles as the signal that
	// the pipeline under test is the one being exercised (game-kit#388).
	await expect(page.locator('[data-testid="crt-overlay"]')).toBeAttached()

	const canvas = page.locator(SEL_GAME_CANVAS)

	for (const orientation of CRT_ORIENTATIONS) {
		await page.setViewportSize({ width: orientation.width, height: orientation.height })
		await expect(canvas).toBeVisible()
		// Wait for the drawing buffer to follow the new viewport rather than for a fixed delay: that
		// is the point at which the merged pass has rendered at the new scanline axis.
		await expect
			.poll(
				async () =>
					await canvas.evaluate((element: HTMLCanvasElement, tolerance: number) => {
						const rect = element.getBoundingClientRect()

						return Math.abs(element.width - rect.width) <= tolerance
					}, BUFFER_SIZE_TOLERANCE_PX),
				{ timeout: RESIZE_SETTLE_TIMEOUT_MS },
			)
			.toBe(true)
		await test.info().attach(`crt-${orientation.name}`, {
			body: await canvas.screenshot(),
			contentType: 'image/png',
		})
	}

	expect(errors.filter((message) => SHADER_ERROR_PATTERN.test(message))).toEqual([])
})
