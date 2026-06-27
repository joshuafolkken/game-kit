import { describe, expect, it } from 'vitest'
import { jgame_version } from './jgame-version.ts'

const PACKAGE_NAME = '@joshuafolkken/game-kit'
const SELF_DIR = '/workspace/game-kit/dist/scripts'

describe('jgame version commands', () => {
	it('builds a kit version-command config targeting game-kit', () => {
		const config = jgame_version.build_config(SELF_DIR)

		expect(config.package_name).toBe(PACKAGE_NAME)
		expect(config.versions_endpoint).toContain('game-kit/versions')
		expect(config.self_directory).toBe(SELF_DIR)
	})

	it('derives the fix-gh-packages path from the game-kit package name', () => {
		const config = jgame_version.build_config(SELF_DIR)

		expect(config.fix_gh_packages_path).toContain(PACKAGE_NAME)
	})
})
