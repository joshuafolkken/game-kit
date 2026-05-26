import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const APP_HTML = readFileSync('src/app.html', 'utf-8')

describe('app.html — mobile safe-area / PWA fullscreen meta tags', () => {
	it('viewport meta declares viewport-fit=cover so env(safe-area-inset-*) becomes non-zero on iOS', () => {
		expect(APP_HTML).toMatch(
			/<meta\s+name="viewport"\s+content="[^"]*viewport-fit=cover[^"]*"\s*\/?>/u,
		)
	})

	it('declares apple-mobile-web-app-capable="yes" so the iOS PWA launches without browser chrome', () => {
		expect(APP_HTML).toMatch(/<meta\s+name="apple-mobile-web-app-capable"\s+content="yes"\s*\/?>/u)
	})

	it('declares apple-mobile-web-app-status-bar-style="black-translucent" so iOS PWA content draws under the status bar', () => {
		expect(APP_HTML).toMatch(
			/<meta\s+name="apple-mobile-web-app-status-bar-style"\s+content="black-translucent"\s*\/?>/u,
		)
	})
})
