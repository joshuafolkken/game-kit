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

	it('guards every owner-only tool in the prepare:* sub-scripts so a missing binary cannot fail install (#272)', () => {
		const lefthook = package_.scripts['prepare:lefthook'] ?? ''
		const gh_packages = package_.scripts['prepare:gh-packages'] ?? ''

		expect(lefthook).toMatch(/command -v lefthook >\/dev\/null 2>&1 && lefthook install/u)
		expect(gh_packages).toMatch(/command -v tsx >\/dev\/null 2>&1 && tsx /u)
		expect(lefthook.trim()).toMatch(/;\s*true$/u)
		expect(gh_packages.trim()).toMatch(/;\s*true$/u)
	})

	it('guards prepare:gen on wrangler.jsonc so the first scaffold install no-ops (#311)', () => {
		// The scaffold's first `pnpm install` fires `prepare` BEFORE `josh sync` writes
		// wrangler.jsonc, so an unguarded `wrangler types` would abort install. The guard
		// makes gen skip until the config exists, then run on later installs.
		const prepare_gen = package_.scripts['prepare:gen'] ?? ''

		expect(prepare_gen).toMatch(/\[ -f wrangler\.jsonc \] && pnpm gen/u)
		expect(prepare_gen.trim()).toMatch(/;\s*true$/u)
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
