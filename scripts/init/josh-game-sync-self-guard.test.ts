import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// `sync` distributes templates/ INTO a consumer. Run in this repository it goes backwards, because
// here the root files are the sources those templates are generated from — it once cost this repo
// its whole eslint profile and the pnpm-workspace.yaml overrides (#447). The guard has to refuse
// before the first write, which is why this asserts on the filesystem mocks and not just the output.
vi.mock('node:fs', async () => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- vi.importActual generic needs an inline import type
	const actual = await vi.importActual<typeof import('node:fs')>('node:fs')

	return {
		...actual,
		cpSync: vi.fn(),
		existsSync: vi.fn().mockReturnValue(false),
		mkdirSync: vi.fn(),
		readdirSync: vi.fn().mockReturnValue([]),
		readFileSync: vi.fn(),
		writeFileSync: vi.fn(),
	}
})
vi.mock('node:child_process', () => ({ execSync: vi.fn() }))
vi.mock('./josh-game-paths.ts', () => ({
	josh_game_paths: {
		PACKAGE_DIR: '/pkg',
		TEMPLATES_DIR: '/pkg/templates',
		PROJECT_ROOT: '/project',
	},
}))
vi.mock('./josh-game-eslint-config.ts', () => ({
	josh_game_eslint_config: { write_eslint_config: vi.fn() },
}))
vi.mock('./josh-game-cspell-config.ts', () => ({
	josh_game_cspell_config: { write_cspell_config: vi.fn() },
}))
vi.mock('./josh-game-sync-files.ts', () => ({
	josh_game_sync_files: {
		SYNC_FILES: [],
		sync_file: vi.fn(),
		sync_managed_files: vi.fn().mockReturnValue(0),
		sync_free_form_file: vi.fn(),
		seed_baselines: vi.fn(),
	},
}))

// The name is arbitrary on purpose: the guard compares the two package.json files it reads at
// runtime, so no literal here has to track a rename of the real package.
const DISTRIBUTING_NAME = '@example/some-kit'
const PACKAGE_PACKAGE_PATH = '/pkg/package.json'
const PROJECT_PACKAGE_PATH = '/project/package.json'

async function set_project_package(contents: string | (() => never)): Promise<void> {
	const { readFileSync } = await import('node:fs')

	vi.mocked(readFileSync).mockImplementation((file) => {
		if (file === PACKAGE_PACKAGE_PATH) return JSON.stringify({ name: DISTRIBUTING_NAME })
		if (file !== PROJECT_PACKAGE_PATH) return '{}'
		if (typeof contents === 'function') return contents()

		return contents
	})
}

describe('josh_game_sync.run — refuses to sync the repository it distributes from (#447)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.spyOn(console, 'info').mockImplementation(() => {
			/* no-op */
		})
		vi.spyOn(console, 'error').mockImplementation(() => {
			/* no-op */
		})
	})

	afterEach(() => {
		// In afterEach, not inline: a failing assertion would skip an inline reset and leak the
		// non-zero code into the vitest worker, failing the whole run for an unrelated reason.
		process.exitCode = 0
	})

	it('writes nothing and exits non-zero in the game-kit repository', async () => {
		const { cpSync, writeFileSync } = await import('node:fs')
		const { execSync } = await import('node:child_process')

		await set_project_package(JSON.stringify({ name: DISTRIBUTING_NAME }))
		const { josh_game_sync } = await import('./josh-game-sync.ts')

		josh_game_sync.run()

		expect(process.exitCode).toBe(1)
		expect(cpSync).not.toHaveBeenCalled()
		expect(writeFileSync).not.toHaveBeenCalled()
		expect(execSync).not.toHaveBeenCalled()
	})

	it('names the command to use here instead', async () => {
		await set_project_package(JSON.stringify({ name: DISTRIBUTING_NAME }))
		const { josh_game_sync } = await import('./josh-game-sync.ts')

		josh_game_sync.run()

		expect(console.error).toHaveBeenCalledWith(expect.stringContaining('pnpm josh-app sync'))
	})

	it('proceeds in a consumer project', async () => {
		await set_project_package(JSON.stringify({ name: 'my-game' }))
		const { josh_game_sync } = await import('./josh-game-sync.ts')

		expect(josh_game_sync.resolve_self_sync_name()).toBeNull()
	})

	it('proceeds when the distributing package name cannot be read', async () => {
		// Unreadable is never a match: without both names there is nothing to compare, and refusing on
		// a guess would block every consumer whose install this command could not introspect.
		const { readFileSync } = await import('node:fs')
		const { josh_game_sync } = await import('./josh-game-sync.ts')

		vi.mocked(readFileSync).mockReturnValue('{}')

		expect(josh_game_sync.resolve_self_sync_name()).toBeNull()
	})

	it('proceeds when the package name cannot be read, since that is not this repository', async () => {
		const { josh_game_sync } = await import('./josh-game-sync.ts')

		await set_project_package(() => {
			throw new Error('ENOENT: no such file or directory')
		})

		expect(josh_game_sync.resolve_self_sync_name()).toBeNull()

		await set_project_package('{ not json')

		expect(josh_game_sync.resolve_self_sync_name()).toBeNull()

		await set_project_package(JSON.stringify({ version: '1.0.0' }))

		expect(josh_game_sync.resolve_self_sync_name()).toBeNull()
	})
})
