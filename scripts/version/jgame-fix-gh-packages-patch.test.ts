import { describe, expect, it } from 'vitest'
import { jgame_fix_gh_packages_patch } from './jgame-fix-gh-packages-patch.ts'

const KEY = '@joshuafolkken/game-kit@0.1.0'
const TARBALL = 'https://npm.pkg.github.com/download/game-kit/0.1.0/abc'

const EXPANDED_ENTRY = [
	'',
	'packages:',
	'',
	`  '${KEY}':`,
	'    resolution:',
	'      integrity: sha512-abc',
	"    engines: {node: '>=18'}",
	'',
].join('\n')

const FLOW_ENTRY = [
	'',
	'packages:',
	'',
	`  '${KEY}':`,
	'    resolution: {integrity: sha512-abc}',
	"    engines: {node: '>=18'}",
	'',
].join('\n')

describe('jgame_fix_gh_packages_patch.insert_tarball_for_key', () => {
	it('inserts a tarball line after integrity in expanded resolution form', () => {
		const result = jgame_fix_gh_packages_patch.insert_tarball_for_key(EXPANDED_ENTRY, KEY, TARBALL)

		expect(result).toContain(`      tarball: ${TARBALL}`)
		expect(result.indexOf('integrity')).toBeLessThan(result.indexOf('tarball'))
		expect(result).toContain('    engines:')
	})

	it('inserts a tarball key into a flow-style resolution', () => {
		const result = jgame_fix_gh_packages_patch.insert_tarball_for_key(FLOW_ENTRY, KEY, TARBALL)

		expect(result).toContain(`{integrity: sha512-abc, tarball: ${TARBALL}}`)
	})

	it('leaves content unchanged when the key is absent', () => {
		const result = jgame_fix_gh_packages_patch.insert_tarball_for_key(
			EXPANDED_ENTRY,
			'missing@0.0.0',
			TARBALL,
		)

		expect(result).toBe(EXPANDED_ENTRY)
	})

	it('does not duplicate an already-present tarball (expanded)', () => {
		const once = jgame_fix_gh_packages_patch.insert_tarball_for_key(EXPANDED_ENTRY, KEY, TARBALL)
		const twice = jgame_fix_gh_packages_patch.insert_tarball_for_key(once, KEY, TARBALL)

		expect(twice).toBe(once)
	})
})

describe('jgame_fix_gh_packages_patch.patch_lockfile', () => {
	it('applies every patch in the map', () => {
		const result = jgame_fix_gh_packages_patch.patch_lockfile(
			EXPANDED_ENTRY,
			new Map([[KEY, TARBALL]]),
		)

		expect(result).toContain(`tarball: ${TARBALL}`)
	})

	it('returns the original content for an empty patch map', () => {
		expect(jgame_fix_gh_packages_patch.patch_lockfile(EXPANDED_ENTRY, new Map())).toBe(
			EXPANDED_ENTRY,
		)
	})
})
