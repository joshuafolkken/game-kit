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
	pnpm?: unknown
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

	it('does not reference jgame-install-bin in any lifecycle script', () => {
		expect(pkg.scripts.prepare ?? '').not.toMatch(/jgame-install-bin/)
		expect(pkg.scripts.postinstall ?? '').not.toMatch(/jgame-install-bin/)
	})

	it('keeps safe-chain in preinstall for consumer-side malware scanning', () => {
		expect(pkg.scripts.preinstall).toMatch(/safe-chain/)
	})

	it('does not declare a pnpm field (settings live in pnpm-workspace.yaml)', () => {
		expect(pkg.pnpm).toBeUndefined()
	})
})
