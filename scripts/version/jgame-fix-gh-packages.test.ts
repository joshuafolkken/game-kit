import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { jgame_fix_gh_packages } from './jgame-fix-gh-packages.ts'

vi.mock('node:child_process', () => ({ execFileSync: vi.fn() }))
vi.mock('node:fs', () => ({
	existsSync: vi.fn(),
	readFileSync: vi.fn(),
	writeFileSync: vi.fn(),
}))

const CWD = '/proj'
const GH_NPMRC = '@joshuafolkken:registry=https://npm.pkg.github.com\n'
const KEY = '@joshuafolkken/game-kit@0.1.0'
const TARBALL = 'https://npm.pkg.github.com/download/game-kit/0.1.0/abc'

const LOCKFILE = [
	'',
	'packages:',
	'',
	`  '${KEY}':`,
	'    resolution:',
	'      integrity: sha512-abc',
	'',
	'snapshots:',
	'',
].join('\n')

function stub_fetch_ok(): void {
	const response = {
		ok: true,
		json: vi.fn().mockResolvedValue({ versions: { '0.1.0': { dist: { tarball: TARBALL } } } }),
	}

	vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
}

describe('jgame_fix_gh_packages.extract_tarball_url', () => {
	it('reads the tarball from a packument for the requested version', () => {
		const packument = { versions: { '0.1.0': { dist: { tarball: TARBALL } } } }

		expect(jgame_fix_gh_packages.extract_tarball_url(packument, '0.1.0')).toBe(TARBALL)
	})

	it('returns undefined when the version is absent', () => {
		expect(jgame_fix_gh_packages.extract_tarball_url({ versions: {} }, '0.1.0')).toBeUndefined()
	})

	it('returns undefined for a non-object packument', () => {
		expect(jgame_fix_gh_packages.extract_tarball_url(null, '0.1.0')).toBeUndefined()
	})
})

describe('jgame_fix_gh_packages.run', () => {
	beforeEach(() => {
		vi.resetAllMocks()
		vi.spyOn(console, 'info').mockImplementation(() => {
			/* no-op */
		})
		vi.spyOn(console, 'warn').mockImplementation(() => {
			/* no-op */
		})
	})

	afterEach(() => {
		vi.unstubAllGlobals()
		vi.unstubAllEnvs()
	})

	it('is a no-op when .npmrc declares no GitHub Packages scope', async () => {
		const { existsSync, readFileSync, writeFileSync } = await import('node:fs')

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockReturnValue('@scope:registry=https://registry.npmjs.org\n')
		const fetch_spy = vi.fn()

		vi.stubGlobal('fetch', fetch_spy)

		await jgame_fix_gh_packages.run(CWD)

		expect(fetch_spy).not.toHaveBeenCalled()
		expect(writeFileSync).not.toHaveBeenCalled()
	})

	it('warns and skips when a GH scope is present but no token can be resolved', async () => {
		const { execFileSync } = await import('node:child_process')
		const { existsSync, readFileSync, writeFileSync } = await import('node:fs')

		vi.stubEnv('NODE_AUTH_TOKEN', '')
		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockReturnValue(GH_NPMRC)
		vi.mocked(execFileSync).mockImplementation(() => {
			throw new Error('gh not authenticated')
		})
		const fetch_spy = vi.fn()

		vi.stubGlobal('fetch', fetch_spy)

		await jgame_fix_gh_packages.run(CWD)

		expect(fetch_spy).not.toHaveBeenCalled()
		expect(writeFileSync).not.toHaveBeenCalled()
		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('no auth token'))
	})

	it('patches the lockfile when a scoped package is missing its tarball', async () => {
		const { existsSync, readFileSync, writeFileSync } = await import('node:fs')

		vi.stubEnv('NODE_AUTH_TOKEN', 'ghp_token')
		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockImplementation((file: unknown) =>
			String(file).endsWith('.npmrc') ? GH_NPMRC : LOCKFILE,
		)
		stub_fetch_ok()

		await jgame_fix_gh_packages.run(CWD)

		expect(writeFileSync).toHaveBeenCalledTimes(1)
		const written = vi.mocked(writeFileSync).mock.calls[0]?.[1] as string

		expect(written).toContain(`tarball: ${TARBALL}`)
	})

	it('does not write when every scoped package already has a tarball', async () => {
		const { existsSync, readFileSync, writeFileSync } = await import('node:fs')

		vi.stubEnv('NODE_AUTH_TOKEN', 'ghp_token')
		const lockfile_with_tarball = LOCKFILE.replace(
			'      integrity: sha512-abc',
			'      integrity: sha512-abc\n      tarball: existing',
		)

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockImplementation((file: unknown) =>
			String(file).endsWith('.npmrc') ? GH_NPMRC : lockfile_with_tarball,
		)
		const fetch_spy = vi.fn()

		vi.stubGlobal('fetch', fetch_spy)

		await jgame_fix_gh_packages.run(CWD)

		expect(fetch_spy).not.toHaveBeenCalled()
		expect(writeFileSync).not.toHaveBeenCalled()
	})
})
