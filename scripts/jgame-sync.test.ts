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

// Framework / app-shell files that jgame sync refreshes on every run. Each
// entry pairs the destination path inside the user project with the source
// filename inside templates/. .npmrc is shipped as `npmrc` because npm strips
// .npmrc from published packages regardless of the `files` field.
const EXPECTED_SYNC_ENTRIES = [
	{ dest: '.npmrc', src: 'npmrc' },
	{ dest: 'src/app.d.ts', src: 'src/app.d.ts' },
	{ dest: 'src/app.html', src: 'src/app.html' },
	{ dest: 'src/hooks.server.ts', src: 'src/hooks.server.ts' },
	{ dest: 'src/routes/+layout.svelte', src: 'src/routes/+layout.svelte' },
	{ dest: 'src/routes/layout.css', src: 'src/routes/layout.css' },
	{ dest: 'svelte.config.js', src: 'svelte.config.js' },
	{ dest: 'vite.config.ts', src: 'vite.config.ts' },
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

	it.each(EXPECTED_SYNC_ENTRIES)(
		'syncs $dest from templates/$src to PROJECT_ROOT',
		async ({ dest, src }) => {
			const { cpSync } = await import('node:fs')
			const { jgame_sync } = await import('./jgame-sync.ts')
			jgame_sync.run()
			expect(cpSync).toHaveBeenCalledWith(`/pkg/templates/${src}`, `/project/${dest}`)
		},
	)

	it.each(EXPECTED_SYNC_ENTRIES)('has a real templates/$src source file to copy', ({ src }) => {
		// Guard against SYNC_FILES drift away from the actual templates directory.
		expect(existsSync(path.join(REAL_TEMPLATES_DIR, src))).toBe(true)
	})

	it('writes .npmrc from templates/npmrc to bypass npm dotfile exclusion', async () => {
		// Regression: npm pack strips templates/.npmrc from the published tarball,
		// so the source must be a non-dotfile name (`npmrc`) while the destination
		// in the user project remains `.npmrc`.
		const { cpSync } = await import('node:fs')
		const { jgame_sync } = await import('./jgame-sync.ts')
		jgame_sync.run()
		expect(cpSync).toHaveBeenCalledWith('/pkg/templates/npmrc', '/project/.npmrc')
		expect(existsSync(path.join(REAL_TEMPLATES_DIR, '.npmrc'))).toBe(false)
	})
})
