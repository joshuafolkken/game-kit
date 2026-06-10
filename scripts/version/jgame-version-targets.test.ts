import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jgame_version_targets } from './jgame-version-targets.ts'

vi.mock('node:child_process', () => ({ execFileSync: vi.fn() }))
vi.mock('node:fs', () => ({ existsSync: vi.fn(), readFileSync: vi.fn() }))

const PKG = '@joshuafolkken/game-kit'

describe('jgame_version_targets.parse_global_version', () => {
	it('returns the version from a pnpm ls -g --json payload', () => {
		const stdout = JSON.stringify([{ dependencies: { [PKG]: { version: '0.70.0' } } }])

		expect(jgame_version_targets.parse_global_version(stdout)).toBe('0.70.0')
	})

	it('returns undefined when the package is absent from dependencies', () => {
		const stdout = JSON.stringify([{ dependencies: { other: { version: '1.0.0' } } }])

		expect(jgame_version_targets.parse_global_version(stdout)).toBeUndefined()
	})

	it('returns undefined for an empty array (package not installed globally)', () => {
		expect(jgame_version_targets.parse_global_version('[]')).toBeUndefined()
	})

	it('returns undefined for non-JSON output', () => {
		expect(jgame_version_targets.parse_global_version('not json')).toBeUndefined()
	})

	it('returns undefined when the payload is not an array', () => {
		expect(jgame_version_targets.parse_global_version('{"dependencies":{}}')).toBeUndefined()
	})
})

describe('jgame_version_targets.parse_project_version', () => {
	it('returns the version field from package.json content', () => {
		expect(jgame_version_targets.parse_project_version('{"version":"0.42.0"}')).toBe('0.42.0')
	})

	it('returns undefined when raw is undefined (file missing)', () => {
		expect(jgame_version_targets.parse_project_version(undefined)).toBeUndefined()
	})

	it('returns undefined when the version field is absent', () => {
		expect(jgame_version_targets.parse_project_version('{"name":"x"}')).toBeUndefined()
	})

	it('returns undefined for malformed JSON', () => {
		expect(jgame_version_targets.parse_project_version('{')).toBeUndefined()
	})
})

describe('jgame_version_targets.project_package_path', () => {
	it('builds the node_modules package.json path under cwd', () => {
		expect(jgame_version_targets.project_package_path('/proj')).toBe(
			path.join('/proj', 'node_modules', PKG, 'package.json'),
		)
	})
})

describe('jgame_version_targets.read_global_version', () => {
	afterEach(() => {
		vi.resetAllMocks()
	})

	it('returns the parsed version from execFileSync output', async () => {
		const { execFileSync } = await import('node:child_process')

		vi.mocked(execFileSync).mockReturnValue(
			Buffer.from(JSON.stringify([{ dependencies: { [PKG]: { version: '0.71.0' } } }])),
		)

		expect(jgame_version_targets.read_global_version()).toBe('0.71.0')
	})

	it('returns undefined when pnpm ls throws (pnpm missing or no global install)', async () => {
		const { execFileSync } = await import('node:child_process')

		vi.mocked(execFileSync).mockImplementation(() => {
			throw new Error('command not found: pnpm')
		})

		expect(jgame_version_targets.read_global_version()).toBeUndefined()
	})
})

describe('jgame_version_targets.read_project_version', () => {
	afterEach(() => {
		vi.resetAllMocks()
	})

	it('reads and parses the installed package.json under node_modules', async () => {
		const { existsSync, readFileSync } = await import('node:fs')

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockReturnValue('{"version":"0.43.0"}')

		expect(jgame_version_targets.read_project_version('/proj')).toBe('0.43.0')
	})

	it('returns undefined when the package is not installed locally', async () => {
		const { existsSync } = await import('node:fs')

		vi.mocked(existsSync).mockReturnValue(false)

		expect(jgame_version_targets.read_project_version('/proj')).toBeUndefined()
	})
})
