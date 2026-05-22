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
		readFileSync: vi.fn(),
		writeFileSync: vi.fn(),
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

const CANONICAL_PREVIEW = 'wrangler dev .svelte-kit/cloudflare/_worker.js --port 4173'

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

function stub_readFileSync_by_path(
	read: ReturnType<typeof vi.fn>,
	overrides: Record<string, string>,
): void {
	read.mockImplementation((file: string) => {
		const key = String(file)
		if (key in overrides) return overrides[key]
		throw new Error(`unexpected readFileSync(${key})`)
	})
}

describe('jgame_sync.run', () => {
	beforeEach(async () => {
		vi.spyOn(console, 'info').mockImplementation(() => {})
		const { readFileSync } = await import('node:fs')
		const game_kit_pkg = JSON.stringify({ scripts: { preview: CANONICAL_PREVIEW } })
		const consumer_pkg = JSON.stringify({ scripts: { preview: CANONICAL_PREVIEW } })
		stub_readFileSync_by_path(vi.mocked(readFileSync), {
			'/pkg/package.json': game_kit_pkg,
			'/project/package.json': consumer_pkg,
		})
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

describe('jgame_sync managed package.json scripts', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.spyOn(console, 'info').mockImplementation(() => {})
	})

	it('rewrites a stale preview script to the canonical Worker-runtime value', async () => {
		// Regression for #135: a project initialized before the fix has
		// "preview": "vite preview" — jgame sync must correct it.
		const { readFileSync, writeFileSync } = await import('node:fs')
		stub_readFileSync_by_path(vi.mocked(readFileSync), {
			'/pkg/package.json': JSON.stringify({ scripts: { preview: CANONICAL_PREVIEW } }),
			'/project/package.json': JSON.stringify({
				name: 'consumer',
				scripts: { preview: 'vite preview', dev: 'vite dev' },
			}),
		})
		const { jgame_sync } = await import('./jgame-sync.ts')
		jgame_sync.run()
		expect(writeFileSync).toHaveBeenCalledTimes(1)
		const [written_path, written_body] = vi.mocked(writeFileSync).mock.calls[0]
		expect(written_path).toBe('/project/package.json')
		const written = JSON.parse(String(written_body))
		expect(written.scripts.preview).toBe(CANONICAL_PREVIEW)
		// Preserves consumer-owned scripts that are NOT in MANAGED_SCRIPT_KEYS.
		expect(written.scripts.dev).toBe('vite dev')
		// Preserves unrelated package.json fields.
		expect(written.name).toBe('consumer')
	})

	it('does not rewrite package.json when scripts are already canonical', async () => {
		const { readFileSync, writeFileSync } = await import('node:fs')
		stub_readFileSync_by_path(vi.mocked(readFileSync), {
			'/pkg/package.json': JSON.stringify({ scripts: { preview: CANONICAL_PREVIEW } }),
			'/project/package.json': JSON.stringify({
				name: 'consumer',
				scripts: { preview: CANONICAL_PREVIEW, dev: 'vite dev' },
			}),
		})
		const { jgame_sync } = await import('./jgame-sync.ts')
		jgame_sync.run()
		expect(writeFileSync).not.toHaveBeenCalled()
	})

	it('adds the canonical preview script when the consumer has no scripts field', async () => {
		const { readFileSync, writeFileSync } = await import('node:fs')
		stub_readFileSync_by_path(vi.mocked(readFileSync), {
			'/pkg/package.json': JSON.stringify({ scripts: { preview: CANONICAL_PREVIEW } }),
			'/project/package.json': JSON.stringify({ name: 'consumer' }),
		})
		const { jgame_sync } = await import('./jgame-sync.ts')
		jgame_sync.run()
		expect(writeFileSync).toHaveBeenCalledTimes(1)
		const written = JSON.parse(String(vi.mocked(writeFileSync).mock.calls[0][1]))
		expect(written.scripts.preview).toBe(CANONICAL_PREVIEW)
	})
})

describe('jgame_sync.apply_managed_scripts', () => {
	it('reports no change when consumer already has canonical values', async () => {
		const { jgame_sync } = await import('./jgame-sync.ts')
		const pkg = { scripts: { preview: CANONICAL_PREVIEW } }
		const did_change = jgame_sync.apply_managed_scripts(pkg, { preview: CANONICAL_PREVIEW })
		expect(did_change).toBe(false)
		expect(pkg.scripts.preview).toBe(CANONICAL_PREVIEW)
	})

	it('returns true and mutates scripts when a managed key is stale', async () => {
		const { jgame_sync } = await import('./jgame-sync.ts')
		const pkg = { scripts: { preview: 'vite preview' } }
		const did_change = jgame_sync.apply_managed_scripts(pkg, { preview: CANONICAL_PREVIEW })
		expect(did_change).toBe(true)
		expect(pkg.scripts.preview).toBe(CANONICAL_PREVIEW)
	})
})
