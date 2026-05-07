import { defineConfig, devices } from '@playwright/test'

const IS_CI = Boolean(process.env['CI'])

const DEV_PORT = 5173
const PREVIEW_PORT = 4173

const CI_TIMEOUT = 15_000
const LOCAL_TIMEOUT = 25_000
const TEST_TIMEOUT = 10_000
const EXPECT_TIMEOUT = 5_000
const ACTION_TIMEOUT = 5_000
const NAVIGATION_TIMEOUT = 10_000
const CI_WORKERS = 2
const CI_RETRIES = 2
const VIEWPORT_WIDTH = 1_280
const VIEWPORT_HEIGHT = 720

const web_server_config = IS_CI
	? {
			command: 'pnpm run preview',
			port: PREVIEW_PORT,
			timeout: CI_TIMEOUT,
			reuseExistingServer: false,
		}
	: { command: 'pnpm run dev', port: DEV_PORT, timeout: LOCAL_TIMEOUT, reuseExistingServer: true }

export default defineConfig({
	webServer: web_server_config,
	testDir: 'e2e',
	fullyParallel: true,
	...(IS_CI ? { workers: CI_WORKERS } : {}),
	retries: IS_CI ? CI_RETRIES : 0,
	timeout: TEST_TIMEOUT,
	expect: { timeout: EXPECT_TIMEOUT },
	projects: [
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
				launchOptions: {
					args: ['--disable-dev-shm-usage', '--disable-gpu', ...(IS_CI ? ['--no-sandbox'] : [])],
				},
			},
		},
	],
	reporter: IS_CI ? [['html'], ['github']] : [['html'], ['list']],
	use: {
		actionTimeout: ACTION_TIMEOUT,
		navigationTimeout: NAVIGATION_TIMEOUT,
		screenshot: IS_CI ? 'only-on-failure' : 'off',
		video: IS_CI ? 'retain-on-failure' : 'off',
		trace: IS_CI ? 'retain-on-failure' : 'off',
	},
})
