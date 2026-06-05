import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { jgame_version_check } from './jgame-version-check.ts'

describe('jgame_version_check.parse_version', () => {
	it('returns version string from valid package.json content', () => {
		expect(jgame_version_check.parse_version('{"version":"0.55.0"}')).toBe('0.55.0')
	})

	it('throws when version field is missing', () => {
		expect(() => jgame_version_check.parse_version('{"name":"foo"}')).toThrow(/version/u)
	})

	it('throws when version field is not a string', () => {
		expect(() => jgame_version_check.parse_version('{"version":42}')).toThrow(/version/u)
	})

	it('throws when content is not a JSON object', () => {
		expect(() => jgame_version_check.parse_version('"plain-string"')).toThrow(/version/u)
	})
})

describe('jgame_version_check.resolve_package_json_path', () => {
	const distribution_scripts = path.join('pkg', 'dist', 'scripts')
	const source_scripts = path.join('pkg', 'scripts', 'version')
	const package_json = path.join('pkg', 'package.json')

	it('returns <pkg>/package.json from the bundled dist/scripts layout', () => {
		expect(jgame_version_check.resolve_package_json_path(distribution_scripts)).toBe(package_json)
	})

	it('returns <pkg>/package.json from the scripts/version source layout', () => {
		expect(jgame_version_check.resolve_package_json_path(source_scripts)).toBe(package_json)
	})

	it('normalizes a trailing separator on the script directory', () => {
		expect(jgame_version_check.resolve_package_json_path(distribution_scripts + path.sep)).toBe(
			package_json,
		)
	})
})
