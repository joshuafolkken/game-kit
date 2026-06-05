import { describe, expect, it } from 'vitest'
import { jgame_version_api } from './jgame-version-api.ts'

describe('jgame_version_api', () => {
	it('exposes fetch_latest_version as a callable function', () => {
		expect(typeof jgame_version_api.fetch_latest_version).toBe('function')
	})

	it('targets the canonical game-kit packages endpoint', () => {
		expect(jgame_version_api.GH_API_PATH).toBe(
			'/users/joshuafolkken/packages/npm/game-kit/versions?per_page=1',
		)
	})
})
