import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('node:fs', async () => {
	const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
	return {
		...actual,
		cpSync: vi.fn(),
		mkdirSync: vi.fn(),
	}
})
vi.mock('node:child_process', () => ({ execSync: vi.fn() }))
vi.mock('./jgame-paths.ts', () => ({
	jgame_paths: {
		PACKAGE_DIR: '/pkg',
		TEMPLATES_DIR: '/pkg/templates',
		PROJECT_ROOT: '/project',
	},
}))

// Framework / app-shell files that jgame sync refreshes on every run.
const EXPECTED_SYNC_FILES = [
	'.npmrc',
	'src/app.d.ts',
	'src/app.html',
	'src/hooks.server.ts',
	'src/routes/+layout.svelte',
	'src/routes/layout.css',
	'svelte.config.js',
	'vite.config.ts',
] as const

// Resolve the real templates/ dir from this test file's location so the
// "template source must exist" guard does not depend on the mocked PROJECT_ROOT.
const REAL_TEMPLATES_DIR = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'../templates',
)

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

	it.each(EXPECTED_SYNC_FILES)('syncs %s from templates to PROJECT_ROOT', async (file) => {
		const { cpSync } = await import('node:fs')
		const { jgame_sync } = await import('./jgame-sync.ts')
		jgame_sync.run()
		expect(cpSync).toHaveBeenCalledWith(`/pkg/templates/${file}`, `/project/${file}`)
	})

	it.each(EXPECTED_SYNC_FILES)('has a real templates/%s source file to copy', (file) => {
		// Guard against SYNC_FILES drift away from the actual templates directory.
		expect(existsSync(path.join(REAL_TEMPLATES_DIR, file))).toBe(true)
	})
})
