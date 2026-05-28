import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const { version } = JSON.parse(
	readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as { version: string }

const LOADING_OVERLAY_TIMEOUT_MS = 8000
const READY_PROGRESS_VALUE = 100
const SEL_GAME_SCENE = '[data-testid="game-scene"]'
const SEL_LOADING_OVERLAY = '[data-testid="loading-overlay"]'
const SEL_CLICK_HINT = '.click-hint'
const SEL_LOADING_PROGRESS_BAR = '[data-testid="loading-overlay"] progress.bar'

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
	await expect(page.locator(SEL_GAME_SCENE)).toBeVisible()
	await expect(page.locator('[data-testid="game-scene"] canvas')).toBeVisible()
})

test('loading overlay is visible immediately on page load', async ({ page }) => {
	await page.goto('/')
	await expect(page.locator(SEL_LOADING_OVERLAY)).toBeVisible()
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
	await expect(page.locator('[data-testid="loading-overlay"] .game-title')).toHaveText(
		'JOSHUA GAME',
	)
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
	await expect(page.locator(SEL_LOADING_OVERLAY)).toBeHidden({
		timeout: LOADING_OVERLAY_TIMEOUT_MS,
	})
	await expect(page.locator(SEL_GAME_SCENE)).toBeVisible()
})

test('game scene is ready before the user clicks (no jump button shown yet)', async ({ page }) => {
	await page.goto('/')
	await expect(page.locator(SEL_GAME_SCENE)).toBeVisible()
	// Jump button only appears after session starts; its absence proves the
	// pre-start state. The keyboard / mouse / touch hints themselves live in
	// the 3D scene now and cannot be queried via data-testid.
	await expect(page.locator('[data-testid="jump-btn"]')).toHaveCount(0)
})

test('first click on the game scene does not toggle cyber mode (cyber-glow stays absent)', async ({
	page,
}) => {
	await page.goto('/')
	await expect(page.locator(SEL_GAME_SCENE)).toBeVisible()
	const glow_locator = page.locator('[data-testid="cyber-glow"]')
	const initial_glow_count = await glow_locator.count()

	await page.locator(SEL_GAME_SCENE).click()
	const after_glow_count = await glow_locator.count()

	expect(after_glow_count).toBe(initial_glow_count)
})

test('game scene has role="application" for screen reader keyboard pass-through', async ({
	page,
}) => {
	await page.goto('/')
	await expect(page.locator(SEL_GAME_SCENE)).toHaveAttribute('role', 'application')
})

test('game scene can be started with Enter key after focusing via Tab', async ({ page }) => {
	await page.goto('/')
	await expect(page.locator(SEL_GAME_SCENE)).toBeVisible()
	await page.keyboard.press('Tab')
	await page.keyboard.press('Enter')
	await expect(page.locator(SEL_CLICK_HINT)).toHaveCount(0)
})

test('game scene can be started with Space key after focusing via Tab', async ({ page }) => {
	await page.goto('/')
	await expect(page.locator(SEL_GAME_SCENE)).toBeVisible()
	await page.keyboard.press('Tab')
	await page.keyboard.press('Space')
	await expect(page.locator(SEL_CLICK_HINT)).toHaveCount(0)
})

test('loading overlay uses native progress element for accessible progress', async ({ page }) => {
	await page.goto('/')
	await expect(page.locator(SEL_LOADING_PROGRESS_BAR)).toBeVisible()
	await expect(page.locator(SEL_LOADING_PROGRESS_BAR)).toHaveAttribute('max', '100')
})

test('loading overlay progress element reaches 100 when the scene is ready', async ({ page }) => {
	await page.goto('/')
	await expect(page.locator(SEL_LOADING_PROGRESS_BAR)).toHaveJSProperty(
		'value',
		READY_PROGRESS_VALUE,
		{
			timeout: LOADING_OVERLAY_TIMEOUT_MS,
		},
	)
})
