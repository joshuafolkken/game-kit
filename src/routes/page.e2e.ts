import { readFileSync } from 'node:fs'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const { version } = JSON.parse(
	readFileSync(new URL('../../package.json', import.meta.url), 'utf-8'),
) as { version: string }

const LOADING_OVERLAY_TIMEOUT_MS = 8000
const FULLSCREEN_NOT_CALLED_WAIT_MS = 200
const TOUCH_PRIMARY_QUERY = '(hover: none) and (pointer: coarse)'
const READY_PROGRESS_VALUE = 100
const HIGH_SCORE_STORAGE_KEY = 'simon_high_score'
const HIGH_SCORE_ROUND_KEY = 'simon_high_score_round'
const HIGH_SCORE_CHECK_KEY = 'simon_high_score_check'
const CHECK_SEED = 0x9e3779b9
const SAMPLE_HIGH_SCORE = 5000
const SAMPLE_HIGH_ROUND = 3

async function stub_touch_primary(page: Page, is_touch: boolean): Promise<void> {
	await page.addInitScript(
		([query, matches]) => {
			const original = globalThis.matchMedia.bind(globalThis)
			globalThis.matchMedia = function patched(input: string): MediaQueryList {
				if (input === query) {
					return {
						matches: matches as boolean,
						media: input,
						onchange: null,
						addEventListener() {},
						removeEventListener() {},
						addListener() {},
						removeListener() {},
						dispatchEvent() {
							return false
						},
					} as MediaQueryList
				}
				return original(input)
			}
		},
		[TOUCH_PRIMARY_QUERY, is_touch] as const,
	)
}

test('page response includes HTTP security headers', async ({ page }) => {
	const response = await page.goto('/')
	const headers = response?.headers() ?? {}
	expect(headers['x-frame-options']).toBe('SAMEORIGIN')
	expect(headers['x-content-type-options']).toBe('nosniff')
	expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
	expect(headers['permissions-policy']).toContain('camera=()')
	expect(headers['content-security-policy']).toContain("default-src 'self'")
})

test('game scene renders immediately with canvas', async ({ page }) => {
	await page.goto('/')
	await expect(page.locator('[data-testid="game-scene"]')).toBeVisible()
	await expect(page.locator('[data-testid="game-scene"] canvas')).toBeVisible()
})

test('loading overlay is visible immediately on page load', async ({ page }) => {
	await page.goto('/')
	await expect(page.locator('[data-testid="loading-overlay"]')).toBeVisible()
})

test('loading overlay displays the logo svg', async ({ page }) => {
	await page.goto('/')
	await expect(page.locator('[data-testid="loading-overlay"] svg.logo')).toBeVisible()
})

test('loading overlay displays Joshua Folkken below the logo', async ({ page }) => {
	await page.goto('/')
	await expect(page.locator('[data-testid="loading-overlay"] .brand')).toHaveText('Joshua Folkken')
})

test('loading overlay displays game title below the brand', async ({ page }) => {
	await page.goto('/')
	await expect(page.locator('[data-testid="loading-overlay"] .game-title')).toHaveText('SIMON')
})

test('loading overlay displays game version below the brand', async ({ page }) => {
	await page.goto('/')
	await expect(page.locator('[data-testid="loading-overlay"] .game-version')).toHaveText(
		`v${version}`,
	)
})

test('loading overlay reaches 100% progress once the scene is ready', async ({ page }) => {
	await page.goto('/')
	await expect(page.locator('[data-testid="loading-overlay"] .progress')).toHaveText('100%', {
		timeout: LOADING_OVERLAY_TIMEOUT_MS,
	})
})

test('loading overlay shows ready text once the scene is ready', async ({ page }) => {
	await page.goto('/')
	await expect(page.locator('[data-testid="loading-overlay"] .status')).toHaveText('READY', {
		timeout: LOADING_OVERLAY_TIMEOUT_MS,
	})
})

test('loading overlay disappears once the scene is ready', async ({ page }) => {
	await page.goto('/')
	await expect(page.locator('[data-testid="loading-overlay"]')).toBeHidden({
		timeout: LOADING_OVERLAY_TIMEOUT_MS,
	})
	await expect(page.locator('[data-testid="game-scene"]')).toBeVisible()
})

test('controls overlay is visible before the user clicks', async ({ page }) => {
	await page.goto('/')
	await expect(page.locator('[data-testid="controls-overlay"]')).toBeVisible()
	await expect(page.locator('[data-testid="start-hint"]')).toBeVisible()
})

test('controls overlay disappears after the game scene is clicked', async ({ page }) => {
	await page.goto('/')
	await page.locator('[data-testid="game-scene"]').click()
	await expect(page.locator('[data-testid="controls-overlay"]')).toHaveCount(0)
})

test('first click on the game scene does not toggle cyber mode while controls overlay is shown', async ({
	page,
}) => {
	await page.goto('/')
	await expect(page.locator('[data-testid="game-scene"]')).toBeVisible()
	await expect(page.locator('[data-testid="controls-overlay"]')).toBeVisible()
	const glow_locator = page.locator('[data-testid="cyber-glow"]')
	const initial_glow_count = await glow_locator.count()
	await page.locator('[data-testid="game-scene"]').click()
	await expect(page.locator('[data-testid="controls-overlay"]')).toHaveCount(0)
	const after_glow_count = await glow_locator.count()
	expect(after_glow_count).toBe(initial_glow_count)
})

test('fullscreen is requested on touch-primary devices when start hint is clicked', async ({
	page,
}) => {
	await stub_touch_primary(page, true)
	await page.goto('/')
	await expect(page.locator('[data-testid="game-scene"]')).toBeVisible()

	const fullscreen_target = await page.evaluate(
		() =>
			new Promise<string>((resolve) => {
				const scene = document.querySelector<HTMLElement>('[data-testid="game-scene"]')
				if (!scene) {
					resolve('no-scene')
					return
				}
				scene.requestFullscreen = function (): Promise<void> {
					resolve('game-scene')
					return Promise.resolve()
				}
				scene.click()
			}),
	)

	expect(fullscreen_target).toBe('game-scene')
})

test('fullscreen is NOT requested on desktop devices when start hint is clicked', async ({
	page,
}) => {
	await stub_touch_primary(page, false)
	await page.goto('/')
	await expect(page.locator('[data-testid="game-scene"]')).toBeVisible()

	const was_called = await page.evaluate(
		(wait_ms) =>
			new Promise<boolean>((resolve) => {
				const scene = document.querySelector<HTMLElement>('[data-testid="game-scene"]')
				if (!scene) {
					resolve(false)
					return
				}
				let called = false
				scene.requestFullscreen = function (): Promise<void> {
					called = true
					return Promise.resolve()
				}
				scene.click()
				setTimeout(() => resolve(called), wait_ms)
			}),
		FULLSCREEN_NOT_CALLED_WAIT_MS,
	)

	expect(was_called).toBe(false)
	await expect(page.locator('[data-testid="controls-overlay"]')).toHaveCount(0)
})

test('pseudo-fullscreen class is applied when native API is unavailable on touch devices', async ({
	page,
}) => {
	await stub_touch_primary(page, true)
	await page.goto('/')
	await expect(page.locator('[data-testid="game-scene"]')).toBeVisible()

	await page.evaluate(() => {
		const scene = document.querySelector<HTMLElement>('[data-testid="game-scene"]')
		if (!scene) return
		Object.defineProperty(scene, 'requestFullscreen', { value: undefined, configurable: true })
		Object.defineProperty(scene, 'webkitRequestFullscreen', {
			value: undefined,
			configurable: true,
		})
		scene.click()
	})

	await expect(page.locator('[data-testid="game-scene"]')).toHaveClass(/pseudo-fullscreen/)
})

test('game scene has role="application" for screen reader keyboard pass-through', async ({
	page,
}) => {
	await page.goto('/')
	await expect(page.locator('[data-testid="game-scene"]')).toHaveAttribute('role', 'application')
})

test('game scene can be started with Enter key after focusing via Tab', async ({ page }) => {
	await page.goto('/')
	await expect(page.locator('[data-testid="game-scene"]')).toBeVisible()
	await page.keyboard.press('Tab')
	await page.keyboard.press('Enter')
	await expect(page.locator('.click-hint')).toHaveCount(0)
})

test('game scene can be started with Space key after focusing via Tab', async ({ page }) => {
	await page.goto('/')
	await expect(page.locator('[data-testid="game-scene"]')).toBeVisible()
	await page.keyboard.press('Tab')
	await page.keyboard.press('Space')
	await expect(page.locator('.click-hint')).toHaveCount(0)
})

test('loading overlay uses native progress element for accessible progress', async ({ page }) => {
	await page.goto('/')
	await expect(page.locator('[data-testid="loading-overlay"] progress.bar')).toBeVisible()
	await expect(page.locator('[data-testid="loading-overlay"] progress.bar')).toHaveAttribute(
		'max',
		'100',
	)
})

test('loading overlay progress element reaches 100 when the scene is ready', async ({ page }) => {
	await page.goto('/')
	await expect(page.locator('[data-testid="loading-overlay"] progress.bar')).toHaveJSProperty(
		'value',
		READY_PROGRESS_VALUE,
		{
			timeout: LOADING_OVERLAY_TIMEOUT_MS,
		},
	)
})

test('page has no critical or serious accessibility violations', async ({ page }) => {
	await page.goto('/')
	const results = await new AxeBuilder({ page }).exclude('canvas').analyze()
	const violations = results.violations.filter(
		(v) => v.impact === 'critical' || v.impact === 'serious',
	)
	expect(violations).toHaveLength(0)
})

test('high score persists in localStorage across page reload', async ({ page }) => {
	const stored_check =
		(Math.imul(SAMPLE_HIGH_SCORE + 1, CHECK_SEED) ^
			Math.imul(SAMPLE_HIGH_ROUND + 1, CHECK_SEED >>> 1)) >>>
		0
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
	const [score_val, round_val, check_val] = await page.evaluate(
		([sk, rk, ck]) => [
			localStorage.getItem(sk),
			localStorage.getItem(rk),
			localStorage.getItem(ck),
		],
		[HIGH_SCORE_STORAGE_KEY, HIGH_SCORE_ROUND_KEY, HIGH_SCORE_CHECK_KEY] as const,
	)
	expect(score_val).toBe(String(SAMPLE_HIGH_SCORE))
	expect(round_val).toBe(String(SAMPLE_HIGH_ROUND))
	expect(check_val).toBe(String(stored_check))
})

test('game scene loads without shadow-related WebGL errors', async ({ page }) => {
	const errors: string[] = []
	page.on('pageerror', (err) => errors.push(err.message))
	await page.goto('/')
	await expect(page.locator('[data-testid="loading-overlay"]')).toBeHidden({
		timeout: LOADING_OVERLAY_TIMEOUT_MS,
	})
	const webgl_errors = errors.filter(
		(e) => e.toLowerCase().includes('shadow') || e.toLowerCase().includes('webgl'),
	)
	expect(webgl_errors).toHaveLength(0)
})

test('favicon link points to the Simon icon, not the Svelte logo', async ({ page }) => {
	await page.goto('/')
	const icon_href = await page.evaluate(() => {
		const links = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]')
		const last = links[links.length - 1]
		return last?.getAttribute('href') ?? null
	})
	expect(icon_href).toBe('/icon.svg')
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
