import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const { version } = JSON.parse(
	readFileSync(new URL('../../package.json', import.meta.url), 'utf-8'),
) as { version: string }

const LOADING_OVERLAY_TIMEOUT_MS = 8000
const READY_PROGRESS_VALUE = 100

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
