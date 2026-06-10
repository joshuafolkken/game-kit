import { describe, expect, it } from 'vitest'
import { jgame_fix_gh_packages_logic } from './jgame-fix-gh-packages-logic.ts'

const GH_NPMRC = '@joshuafolkken:registry=https://npm.pkg.github.com\n'

describe('jgame_fix_gh_packages_logic.parse_gh_scopes', () => {
	it('collects scopes whose registry is the GitHub Packages host', () => {
		const scopes = jgame_fix_gh_packages_logic.parse_gh_scopes(GH_NPMRC)

		expect(scopes.has('@joshuafolkken')).toBe(true)
	})

	it('tolerates a trailing slash on the registry URL', () => {
		const scopes = jgame_fix_gh_packages_logic.parse_gh_scopes(
			'@scope:registry=https://npm.pkg.github.com/\n',
		)

		expect(scopes.has('@scope')).toBe(true)
	})

	it('ignores scopes pointing at the public npm registry', () => {
		const scopes = jgame_fix_gh_packages_logic.parse_gh_scopes(
			'@other:registry=https://registry.npmjs.org\n',
		)

		expect(scopes.size).toBe(0)
	})
})

describe('jgame_fix_gh_packages_logic.parse_npmrc_auth_token', () => {
	it('returns a literal auth token', () => {
		const token = jgame_fix_gh_packages_logic.parse_npmrc_auth_token(
			'//npm.pkg.github.com/:_authToken=ghp_literal\n',
		)

		expect(token).toBe('ghp_literal')
	})

	it('ignores an env-var placeholder token', () => {
		const token = jgame_fix_gh_packages_logic.parse_npmrc_auth_token(
			'//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}\n',
		)

		expect(token).toBeUndefined()
	})

	it('returns undefined when no auth token line is present', () => {
		expect(jgame_fix_gh_packages_logic.parse_npmrc_auth_token(GH_NPMRC)).toBeUndefined()
	})
})

describe('jgame_fix_gh_packages_logic key helpers', () => {
	it('extracts the scope from a scoped key', () => {
		expect(jgame_fix_gh_packages_logic.scope_from_key('@joshuafolkken/game-kit@0.1.0')).toBe(
			'@joshuafolkken',
		)
	})

	it('returns an empty scope for an unscoped key', () => {
		expect(jgame_fix_gh_packages_logic.scope_from_key('lodash@4.0.0')).toBe('')
	})

	it('extracts the package path from a scoped versioned key', () => {
		expect(jgame_fix_gh_packages_logic.package_path_from_key('@joshuafolkken/game-kit@0.1.0')).toBe(
			'@joshuafolkken/game-kit',
		)
	})

	it('extracts the version, stripping a peer-deps suffix', () => {
		expect(
			jgame_fix_gh_packages_logic.package_version_from_key(
				'@joshuafolkken/game-kit@0.1.0(react@19)',
			),
		).toBe('0.1.0')
	})
})

const LOCKFILE_WITH_SCOPED_PACKAGE = [
	"lockfileVersion: '9.0'",
	'',
	'packages:',
	'',
	"  '@joshuafolkken/game-kit@0.1.0':",
	'    resolution:',
	'      integrity: sha512-abc',
	'',
	'  lodash@4.17.21:',
	'    resolution: {integrity: sha512-def, tarball: https://example/lodash.tgz}',
	'',
	'snapshots:',
	'',
	"  '@joshuafolkken/other@1.0.0':",
	'    resolution:',
	'      integrity: sha512-zzz',
	'',
].join('\n')

describe('jgame_fix_gh_packages_logic.parse_lockfile_packages', () => {
	it('enumerates only the packages section, not snapshots', () => {
		const packages = jgame_fix_gh_packages_logic.parse_lockfile_packages(
			LOCKFILE_WITH_SCOPED_PACKAGE,
		)

		expect(Object.keys(packages)).toContain('@joshuafolkken/game-kit@0.1.0')
		expect(Object.keys(packages)).toContain('lodash@4.17.21')
		expect(Object.keys(packages)).not.toContain('@joshuafolkken/other@1.0.0')
	})

	it('detects a missing tarball on the scoped package', () => {
		const packages = jgame_fix_gh_packages_logic.parse_lockfile_packages(
			LOCKFILE_WITH_SCOPED_PACKAGE,
		)

		expect(packages['@joshuafolkken/game-kit@0.1.0']?.has_tarball).toBe(false)
	})

	it('detects an existing tarball in a flow-style resolution', () => {
		const packages = jgame_fix_gh_packages_logic.parse_lockfile_packages(
			LOCKFILE_WITH_SCOPED_PACKAGE,
		)

		expect(packages['lodash@4.17.21']?.has_tarball).toBe(true)
	})

	it('merges packages across the multi-document pnpm 11 lockfile stream', () => {
		const multi_document = [
			"lockfileVersion: '9.0'",
			'',
			'packages:',
			'',
			'  first-doc-pkg@1.0.0:',
			'    resolution:',
			'      integrity: sha512-aaa',
			'',
			"lockfileVersion: '9.0'",
			'',
			'packages:',
			'',
			"  '@joshuafolkken/game-kit@0.1.0':",
			'    resolution:',
			'      integrity: sha512-bbb',
			'',
			'snapshots:',
			'',
		].join('\n')
		const packages = jgame_fix_gh_packages_logic.parse_lockfile_packages(multi_document)

		expect(Object.keys(packages)).toContain('first-doc-pkg@1.0.0')
		expect(packages['@joshuafolkken/game-kit@0.1.0']?.has_tarball).toBe(false)
	})
})

describe('jgame_fix_gh_packages_logic.needs_tarball_fix', () => {
	const scopes = new Set(['@joshuafolkken'])

	it('returns true for a scoped GH package missing a tarball', () => {
		expect(
			jgame_fix_gh_packages_logic.needs_tarball_fix(
				'@joshuafolkken/game-kit@0.1.0',
				{ has_tarball: false },
				scopes,
			),
		).toBe(true)
	})

	it('returns false when the package already has a tarball', () => {
		expect(
			jgame_fix_gh_packages_logic.needs_tarball_fix(
				'@joshuafolkken/game-kit@0.1.0',
				{ has_tarball: true },
				scopes,
			),
		).toBe(false)
	})

	it('returns false for a package outside the GH scopes', () => {
		expect(
			jgame_fix_gh_packages_logic.needs_tarball_fix(
				'lodash@4.17.21',
				{ has_tarball: false },
				scopes,
			),
		).toBe(false)
	})
})

describe('jgame_fix_gh_packages_logic.resolve_token', () => {
	it('prefers the environment token when non-empty', () => {
		expect(jgame_fix_gh_packages_logic.resolve_token('env', 'npmrc', () => 'cli')).toBe('env')
	})

	it('falls back to the npmrc token when the environment token is empty', () => {
		expect(jgame_fix_gh_packages_logic.resolve_token('', 'npmrc', () => 'cli')).toBe('npmrc')
	})

	it('falls back to the cli token when neither env nor npmrc is set', () => {
		expect(jgame_fix_gh_packages_logic.resolve_token(undefined, undefined, () => 'cli')).toBe('cli')
	})
})
