import { describe, expect, it } from 'vitest'
import { jgame_version } from './jgame-version.ts'

const PACKAGE_NAME = '@joshuafolkken/game-kit'
const APP_KIT_PACKAGE_NAME = '@joshuafolkken/app-kit'
const KIT_PACKAGE_NAME = '@joshuafolkken/kit'
const SELF_DIR = '/workspace/game-kit/dist/scripts'
const UPSTREAM_COUNT = 2

describe('jgame version commands', () => {
	it('builds a kit version-command config targeting game-kit', async () => {
		const config = await jgame_version.build_config(SELF_DIR)

		expect(config.package_name).toBe(PACKAGE_NAME)
		expect(config.versions_endpoint).toContain('game-kit/versions')
		expect(config.self_directory).toBe(SELF_DIR)
	})

	it('derives the fix-gh-packages path from the game-kit package name', async () => {
		const config = await jgame_version.build_config(SELF_DIR)

		expect(config.fix_gh_packages_path).toContain(PACKAGE_NAME)
	})

	it('includes the app-kit and kit upstreams, nearest first', async () => {
		const config = await jgame_version.build_config(SELF_DIR)

		expect(config.upstreams).toHaveLength(UPSTREAM_COUNT)
		expect(config.upstreams[0]?.package_name).toBe(APP_KIT_PACKAGE_NAME)
		expect(config.upstreams[1]?.package_name).toBe(KIT_PACKAGE_NAME)
	})

	it('derives each upstream versions endpoint from its package name', async () => {
		const config = await jgame_version.build_config(SELF_DIR)

		expect(config.upstreams[0]?.versions_endpoint).toContain('app-kit/versions')
		expect(config.upstreams[1]?.versions_endpoint).toContain('npm/kit/versions')
	})
})
