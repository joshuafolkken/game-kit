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
}

const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf8')) as PackageJsonShape

describe('package.json lifecycle scripts', () => {
	it('does not run developer-only commands on consumer install (no postinstall)', () => {
		expect(pkg.scripts.postinstall).toBeUndefined()
	})

	it('runs lefthook install in prepare so it fires only for the package owner', () => {
		expect(pkg.scripts.prepare).toMatch(/lefthook install/)
	})

	it('runs fix-gh-packages in prepare so it fires only for the package owner', () => {
		expect(pkg.scripts.prepare).toMatch(/fix-gh-packages/)
	})

	it('installs the global jgame shim in prepare so it fires only for the package owner', () => {
		expect(pkg.scripts.prepare).toMatch(/jgame-install-bin/)
	})

	it('gates the jgame-install-bin call behind a tsx availability check', () => {
		expect(pkg.scripts.prepare).toContain(
			'command -v tsx >/dev/null 2>&1 && tsx scripts/jgame-install-bin.ts',
		)
	})

	it('keeps safe-chain in preinstall for consumer-side malware scanning', () => {
		expect(pkg.scripts.preinstall).toMatch(/safe-chain/)
	})
})
