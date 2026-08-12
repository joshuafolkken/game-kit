import { security_headers_e2e } from '@joshuafolkken/app-kit/security/e2e'
import { expect, test } from '@playwright/test'

// Instance-specific companion to `security-headers.e2e.ts`, deliberately in its own file.
//
// That spec's `test.beforeEach` skips EVERY test in it against the vite dev server, which is right
// for the header assertions — `_headers` is a Worker-runtime file the dev server never processes.
// It is too broad for the CSP-violation check: `kit.csp` emits its policy in dev too, so a
// directive that blocks something the page legitimately needs is live locally and simply goes
// unobserved there. Playwright runs against dev locally and against the preview server in CI, so
// this file carries the dev half that the seeded spec structurally cannot.
//
// It earns its place: `script-src` initially shipped without `'wasm-unsafe-eval'`, and
// `@threlte/extras` eagerly evaluates three's meshopt decoder, which calls WebAssembly.instantiate()
// at module scope. Vite's dev pre-bundle keeps that module; the production build tree-shakes it. So
// the violation existed ONLY in dev, where every existing CSP test was skipped — a green suite and a
// console full of CompileErrors. The production bundle still ships the draco and basis decoders
// under _app/immutable/assets, so the same block is one compressed asset away from prod as well.

// On the preview server this overlaps the seeded spec's CSP-violation case, and that redundancy is
// accepted rather than skipped away. Restricting this to dev would mean an inverted `test.skip`,
// which `sonarjs/no-skipped-tests` rejects; more to the point, the seeded file is app-kit's and is
// re-seeded on every `josh-app sync`, so making it the only preview-side CSP guard would couple this
// repo's coverage to a file it does not own. The cost is one extra `settle()` window per CI run.
test('loads the game with no CSP violation, on dev and preview alike', async ({ page }) => {
	// Installed before navigating so the listener is in place for the very first script.
	const violations = await security_headers_e2e.watch_violations(page)

	await page.goto('/', { waitUntil: 'load' })
	// app-kit's default settle window, not a restated number — the seeded spec uses the same one.
	await security_headers_e2e.settle(page)

	// Proves the page under test is actually THIS game before reading the violation list. An
	// empty-violations assertion on its own passes vacuously against an error page, or against a
	// different app entirely: `playwright.config.ts` sets `reuseExistingServer: true` on a fixed dev
	// port, so an unrelated project already listening there is silently adopted (observed during
	// #416, and reported upstream as joshuafolkken/kit#775). A green run then means nothing.
	await expect(page.locator('[data-testid="game-scene"]')).toBeVisible()

	// Only CSP violations are asserted, deliberately. Uncaught page errors would be a broader net,
	// but the dev server legitimately produces one: `sw.js` is emitted at build time, so
	// `app.html`'s registration call rejects with a 404 in dev and would make this permanently red
	// for a reason that has nothing to do with the policy.
	expect(violations).toStrictEqual([])
})
