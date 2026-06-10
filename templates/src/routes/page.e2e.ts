import { expect, test } from '@playwright/test'

// Minimal example e2e scaffolded into every new game project (#327). Co-located
// with the route it covers (src/routes/page.e2e.ts), matching the reference
// project layout — playwright's `testMatch: '**/*.e2e.{ts,js}'` discovers it
// regardless of directory. It also runs in game-kit's own CI (templates/ is not
// test-ignored), which keeps the shipped example permanently green.
const SEL_GAME_SCENE = '[data-testid="game-scene"]'

test('home page shows the game scene', async ({ page }) => {
	await page.goto('/')
	await expect(page.locator(SEL_GAME_SCENE)).toBeVisible()
})

test('game scene renders a canvas', async ({ page }) => {
	await page.goto('/')
	await expect(page.locator(`${SEL_GAME_SCENE} canvas`)).toBeVisible()
})
