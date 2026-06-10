import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const PACKAGE_JSON_PATH = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	'..',
	'package.json',
)

interface PackageJsonShape {
	scripts: Record<string, string | undefined>
	devDependencies?: Record<string, string | undefined>
	pnpm?: unknown
}

const package_ = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf8')) as PackageJsonShape

describe('package.json lifecycle scripts', () => {
	it('does not run developer-only commands on consumer install (no postinstall)', () => {
		expect(package_.scripts.postinstall).toBeUndefined()
	})

	it('orchestrates prepare from named prepare:* sub-scripts (#311)', () => {
		expect(package_.scripts.prepare).toBe(
			'pnpm prepare:gen && pnpm prepare:sync && pnpm prepare:lefthook && pnpm prepare:gh-packages',
		)
	})

	it('runs lefthook install in prepare:lefthook so it fires only for the package owner', () => {
		expect(package_.scripts['prepare:lefthook']).toMatch(/lefthook install/u)
	})

	it('runs fix-gh-packages in prepare:gh-packages so it fires only for the package owner', () => {
		expect(package_.scripts['prepare:gh-packages']).toMatch(/fix-gh-packages/u)
	})

	it('declares lefthook + tsx as direct devDeps so prepare is self-contained (#272)', () => {
		// Regression for #272: game-kit's prepare invokes lefthook + tsx. Relying on a
		// brew-global lefthook / transitive tsx leaves the version unpinned, and the
		// scaffolder's REQUIRED_DEV_DEPS sources its pins from these entries — a missing
		// entry would propagate an unpinned `*` into every scaffolded project.
		expect(package_.devDependencies?.lefthook).toBeDefined()
		expect(package_.devDependencies?.tsx).toBeDefined()
	})

	it('skips owner-only prepare:* steps in CI yet propagates a real local failure (#272/#323)', () => {
		// lefthook install / fix-gh-packages mutate git hooks + the lockfile — owner-machine-only
		// setup that cannot run in CI (lefthook install hits git "dubious ownership", exit 128). The
		// `[ -n "$CI" ] ||` guard skips them in CI/consumer-CI; the `! probe ||` guard skips on a
		// missing binary; otherwise the tool runs and a real failure propagates (no `; true` mask).
		const lefthook = package_.scripts['prepare:lefthook'] ?? ''
		const gh_packages = package_.scripts['prepare:gh-packages'] ?? ''

		expect(lefthook).toMatch(
			/\[ -n "\$CI" \] \|\| ! command -v lefthook >\/dev\/null 2>&1 \|\| lefthook install/u,
		)
		expect(gh_packages).toMatch(
			/\[ -n "\$CI" \] \|\| ! command -v tsx >\/dev\/null 2>&1 \|\| tsx /u,
		)
		expect(lefthook.trim()).not.toMatch(/;\s*true$/u)
		expect(gh_packages.trim()).not.toMatch(/;\s*true$/u)
	})

	it('guards prepare:gen on wrangler.jsonc but propagates a real gen failure, in CI too (#311/#323)', () => {
		// The scaffold's first `pnpm install` fires `prepare` BEFORE `josh sync` writes
		// wrangler.jsonc, so gen must skip until the config exists. The `[ ! -f … ] || pnpm gen`
		// form keeps that skip while letting a genuine `pnpm gen` failure fail install (#323).
		// Unlike the owner-only steps, gen generates types and is environment-agnostic, so it is
		// NOT `$CI`-guarded — wrangler-types breakage must surface in CI as well.
		const prepare_gen = package_.scripts['prepare:gen'] ?? ''

		expect(prepare_gen).toMatch(/\[ ! -f wrangler\.jsonc \] \|\| pnpm gen/u)
		expect(prepare_gen.trim()).not.toMatch(/;\s*true$/u)
		expect(prepare_gen).not.toMatch(/\$CI/u)
	})

	it('does not reference jgame-install-bin in any lifecycle script', () => {
		expect(package_.scripts.prepare ?? '').not.toMatch(/jgame-install-bin/u)
		expect(package_.scripts['prepare:gh-packages'] ?? '').not.toMatch(/jgame-install-bin/u)
		expect(package_.scripts.postinstall ?? '').not.toMatch(/jgame-install-bin/u)
	})

	it('keeps safe-chain in preinstall for consumer-side malware scanning', () => {
		expect(package_.scripts.preinstall).toMatch(/safe-chain/u)
	})

	it('does not declare a pnpm field (settings live in pnpm-workspace.yaml)', () => {
		expect(package_.pnpm).toBeUndefined()
	})
})
