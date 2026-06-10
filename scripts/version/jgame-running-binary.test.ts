import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { jgame_running_binary } from './jgame-running-binary.ts'

vi.mock('node:fs', () => ({ existsSync: vi.fn(), readFileSync: vi.fn() }))

const distribution_scripts = path.join('pkg', 'dist', 'scripts')
const source_scripts = path.join('pkg', 'scripts', 'version')
const package_json = path.join('pkg', 'package.json')

describe('jgame_running_binary.parse_version', () => {
	it('returns version string from valid package.json content', () => {
		expect(jgame_running_binary.parse_version('{"version":"0.55.0"}')).toBe('0.55.0')
	})

	it('throws when version field is missing', () => {
		expect(() => jgame_running_binary.parse_version('{"name":"foo"}')).toThrow(/version/u)
	})

	it('throws when version field is not a string', () => {
		expect(() => jgame_running_binary.parse_version('{"version":42}')).toThrow(/version/u)
	})

	it('throws when content is not a JSON object', () => {
		expect(() => jgame_running_binary.parse_version('"plain-string"')).toThrow(/version/u)
	})
})

describe('jgame_running_binary.resolve_package_json_path', () => {
	it('returns <pkg>/package.json from the bundled dist/scripts layout', () => {
		expect(jgame_running_binary.resolve_package_json_path(distribution_scripts)).toBe(package_json)
	})

	it('returns <pkg>/package.json from the scripts/version source layout', () => {
		expect(jgame_running_binary.resolve_package_json_path(source_scripts)).toBe(package_json)
	})

	it('normalizes a trailing separator on the script directory', () => {
		expect(jgame_running_binary.resolve_package_json_path(distribution_scripts + path.sep)).toBe(
			package_json,
		)
	})
})

describe('jgame_running_binary.running_package_directory', () => {
	it('resolves to the absolute package root two levels up', () => {
		expect(jgame_running_binary.running_package_directory(distribution_scripts)).toBe(
			path.resolve('pkg'),
		)
	})
})

describe('jgame_running_binary.read_running_version', () => {
	afterEach(() => {
		vi.resetAllMocks()
	})

	it('returns undefined when package.json is missing', async () => {
		const { existsSync } = await import('node:fs')

		vi.mocked(existsSync).mockReturnValue(false)

		expect(jgame_running_binary.read_running_version(distribution_scripts)).toBeUndefined()
	})

	it('returns the parsed version when package.json is present and valid', async () => {
		const { existsSync, readFileSync } = await import('node:fs')

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockReturnValue('{"version":"1.2.3"}')

		expect(jgame_running_binary.read_running_version(distribution_scripts)).toBe('1.2.3')
	})

	it('returns undefined when package.json is malformed (does not throw)', async () => {
		const { existsSync, readFileSync } = await import('node:fs')

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockReturnValue('{"name":"no-version"}')

		expect(jgame_running_binary.read_running_version(distribution_scripts)).toBeUndefined()
	})
})
