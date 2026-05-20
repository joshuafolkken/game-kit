import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('node:fs', () => ({
	cpSync: vi.fn(),
	mkdirSync: vi.fn(),
}))
vi.mock('node:child_process', () => ({ execSync: vi.fn() }))
vi.mock('./jgame-paths.ts', () => ({
	jgame_paths: {
		PACKAGE_DIR: '/pkg',
		TEMPLATES_DIR: '/pkg/templates',
		PROJECT_ROOT: '/project',
	},
}))

describe('jgame_sync.run', () => {
	beforeEach(() => {
		vi.spyOn(console, 'info').mockImplementation(() => {})
	})

	it('calls josh sync', async () => {
		const { execSync } = await import('node:child_process')
		const { jgame_sync } = await import('./jgame-sync.ts')
		jgame_sync.run()
		expect(execSync).toHaveBeenCalledWith('pnpm josh sync', expect.any(Object))
	})

	it('syncs +layout.svelte from templates to PROJECT_ROOT', async () => {
		const { cpSync } = await import('node:fs')
		const { jgame_sync } = await import('./jgame-sync.ts')
		jgame_sync.run()
		expect(cpSync).toHaveBeenCalledWith(
			'/pkg/templates/src/routes/+layout.svelte',
			'/project/src/routes/+layout.svelte',
		)
	})

	it('syncs layout.css from templates to PROJECT_ROOT', async () => {
		const { cpSync } = await import('node:fs')
		const { jgame_sync } = await import('./jgame-sync.ts')
		jgame_sync.run()
		expect(cpSync).toHaveBeenCalledWith(
			'/pkg/templates/src/routes/layout.css',
			'/project/src/routes/layout.css',
		)
	})
})
