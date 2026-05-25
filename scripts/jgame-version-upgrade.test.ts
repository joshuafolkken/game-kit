import { describe, expect, it } from 'vitest'
import { jgame_version_upgrade } from './jgame-version-upgrade.ts'

describe('jgame_version_upgrade', () => {
	it('exposes run / read_project_overrides / exec_pnpm_add', () => {
		expect(typeof jgame_version_upgrade.run).toBe('function')
		expect(typeof jgame_version_upgrade.read_project_overrides).toBe('function')
		expect(typeof jgame_version_upgrade.exec_pnpm_add).toBe('function')
	})
})
