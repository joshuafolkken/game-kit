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

// devDependencies map that mirrors game-kit's own pins for the lint/format toolchain.
// Used as the canonical source for sync_managed_dev_deps assertions.
const KIT_DEV_DEPS_FIXTURE = {
	'@joshuafolkken/kit': '0.162.0',
	cspell: '^10.0.0',
	eslint: '^10.4.0',
	prettier: '^3.8.3',
	'prettier-plugin-svelte': '^4.0.1',
	'prettier-plugin-tailwindcss': '^0.8.0',
	'@ianvs/prettier-plugin-sort-imports': '^4.7.1',
}

// Returns a devDependencies map that satisfies every entry in REQUIRED_DEV_DEPS,
// so tests that focus on a different concern (managed scripts, file sync) can
// keep sync_managed_dev_deps as a silent no-op.
async function build_complete_consumer_dev_deps(): Promise<Record<string, string>> {
	const { jgame_managed_dev_deps } = await import('./jgame-managed-dev-deps.ts')
	const overrides: Record<string, string> = { ...KIT_DEV_DEPS_FIXTURE }
	return Object.fromEntries(
		jgame_managed_dev_deps.REQUIRED_DEV_DEPS.map((k) => [k, overrides[k] ?? '*']),
	)
}

describe('jgame_sync.run', () => {
	beforeEach(async () => {
		vi.spyOn(console, 'info').mockImplementation(() => {})
		const { readFileSync } = await import('node:fs')
		const game_kit_pkg = JSON.stringify({
			scripts: { preview: CANONICAL_PREVIEW },
			devDependencies: KIT_DEV_DEPS_FIXTURE,
		})
		const consumer_pkg = JSON.stringify({
			scripts: { preview: CANONICAL_PREVIEW },
			devDependencies: KIT_DEV_DEPS_FIXTURE,
		})
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

	it('calls josh init --type sveltekit to self-heal missing configs (#186)', async () => {
		// Regression for #186: projects scaffolded before #184 are missing
		// eslint.config.js / prettier.config.js. jgame sync must invoke josh init
		// to scaffold them, because josh sync early-returns on missing destinations.
		const { execSync } = await import('node:child_process')
		const { jgame_sync } = await import('./jgame-sync.ts')
		jgame_sync.run()
		expect(execSync).toHaveBeenCalledWith('pnpm josh init --type sveltekit', expect.any(Object))
	})

	it('runs pnpm josh init AFTER pnpm josh sync (#186)', async () => {
		// josh sync's preflight pnpm install installs the new devDeps that
		// sync_managed_dev_deps just wrote into package.json; josh init then
		// scaffolds any missing config files with those deps already available.
		const { execSync } = await import('node:child_process')
		const { jgame_sync } = await import('./jgame-sync.ts')
		jgame_sync.run()
		const exec_calls = vi.mocked(execSync).mock.calls
		const sync_index = exec_calls.findIndex(([cmd]) => String(cmd) === 'pnpm josh sync')
		const init_index = exec_calls.findIndex(
			([cmd]) => String(cmd) === 'pnpm josh init --type sveltekit',
		)
		expect(sync_index).toBeGreaterThanOrEqual(0)
		expect(init_index).toBeGreaterThanOrEqual(0)
		const sync_order = vi.mocked(execSync).mock.invocationCallOrder[sync_index]
		const init_order = vi.mocked(execSync).mock.invocationCallOrder[init_index]
		expect(init_order).toBeGreaterThan(sync_order)
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

	it('pre-syncs pnpm-workspace.yaml BEFORE invoking pnpm josh sync (regression for #182)', async () => {
		// pnpm 11 runs a deps-status check (pnpm install) before every pnpm script.
		// If the consumer's pnpm-workspace.yaml lacks the bare-name @joshuafolkken/game-kit
		// exclude, that pre-flight install fails on ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION
		// and pnpm josh sync (which would have refreshed the yaml) never executes.
		// jgame sync must therefore refresh pnpm-workspace.yaml itself, BEFORE invoking pnpm.
		const { cpSync } = await import('node:fs')
		const { execSync } = await import('node:child_process')
		const { jgame_sync } = await import('./jgame-sync.ts')
		jgame_sync.run()

		const cp_calls = vi.mocked(cpSync).mock.calls
		const exec_calls = vi.mocked(execSync).mock.calls
		const yaml_cp_index = cp_calls.findIndex(
			([src, dest]) =>
				String(src) === '/pkg/templates/pnpm-workspace.yaml' &&
				String(dest) === '/project/pnpm-workspace.yaml',
		)
		const josh_sync_index = exec_calls.findIndex(([cmd]) => String(cmd) === 'pnpm josh sync')
		const yaml_cp_order = vi.mocked(cpSync).mock.invocationCallOrder[yaml_cp_index]
		const josh_sync_order = vi.mocked(execSync).mock.invocationCallOrder[josh_sync_index]

		expect(yaml_cp_index).toBeGreaterThanOrEqual(0)
		expect(josh_sync_index).toBeGreaterThanOrEqual(0)
		expect(yaml_cp_order).toBeLessThan(josh_sync_order)
	})

	it('has a real templates/pnpm-workspace.yaml source file to pre-sync', () => {
		expect(existsSync(path.join(REAL_TEMPLATES_DIR, 'pnpm-workspace.yaml'))).toBe(true)
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
		const dev_deps = await build_complete_consumer_dev_deps()
		stub_readFileSync_by_path(vi.mocked(readFileSync), {
			'/pkg/package.json': JSON.stringify({
				scripts: { preview: CANONICAL_PREVIEW },
				devDependencies: KIT_DEV_DEPS_FIXTURE,
			}),
			'/project/package.json': JSON.stringify({
				name: 'consumer',
				scripts: { preview: 'vite preview', dev: 'vite dev' },
				devDependencies: dev_deps,
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
		const dev_deps = await build_complete_consumer_dev_deps()
		stub_readFileSync_by_path(vi.mocked(readFileSync), {
			'/pkg/package.json': JSON.stringify({
				scripts: { preview: CANONICAL_PREVIEW },
				devDependencies: KIT_DEV_DEPS_FIXTURE,
			}),
			'/project/package.json': JSON.stringify({
				name: 'consumer',
				scripts: { preview: CANONICAL_PREVIEW, dev: 'vite dev' },
				devDependencies: dev_deps,
			}),
		})
		const { jgame_sync } = await import('./jgame-sync.ts')
		jgame_sync.run()
		expect(writeFileSync).not.toHaveBeenCalled()
	})

	it('adds the canonical preview script when the consumer has no scripts field', async () => {
		const { readFileSync, writeFileSync } = await import('node:fs')
		const dev_deps = await build_complete_consumer_dev_deps()
		stub_readFileSync_by_path(vi.mocked(readFileSync), {
			'/pkg/package.json': JSON.stringify({
				scripts: { preview: CANONICAL_PREVIEW },
				devDependencies: KIT_DEV_DEPS_FIXTURE,
			}),
			'/project/package.json': JSON.stringify({
				name: 'consumer',
				devDependencies: dev_deps,
			}),
		})
		const { jgame_sync } = await import('./jgame-sync.ts')
		jgame_sync.run()
		expect(writeFileSync).toHaveBeenCalledTimes(1)
		const written = JSON.parse(String(vi.mocked(writeFileSync).mock.calls[0][1]))
		expect(written.scripts.preview).toBe(CANONICAL_PREVIEW)
	})
})

describe('jgame_sync managed package.json devDependencies', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.spyOn(console, 'info').mockImplementation(() => {})
	})

	it('adds missing required devDeps to consumer package.json (#186)', async () => {
		// Regression for #186: a project scaffolded before #184 is missing prettier,
		// eslint, etc. jgame sync must inject them so the next pnpm install (the
		// preflight before pnpm josh sync) installs the binaries that lint/format need.
		const { readFileSync, writeFileSync } = await import('node:fs')
		stub_readFileSync_by_path(vi.mocked(readFileSync), {
			'/pkg/package.json': JSON.stringify({
				scripts: { preview: CANONICAL_PREVIEW },
				devDependencies: KIT_DEV_DEPS_FIXTURE,
			}),
			'/project/package.json': JSON.stringify({
				name: 'consumer',
				scripts: { preview: CANONICAL_PREVIEW },
				devDependencies: { '@joshuafolkken/kit': '0.150.0' },
			}),
		})
		const { jgame_sync } = await import('./jgame-sync.ts')
		jgame_sync.run()
		const pkg_writes = vi
			.mocked(writeFileSync)
			.mock.calls.filter(([file_path]) => String(file_path) === '/project/package.json')
		expect(pkg_writes.length).toBeGreaterThanOrEqual(1)
		const final_pkg = JSON.parse(String(pkg_writes.at(-1)?.[1]))
		expect(final_pkg.devDependencies.prettier).toBe('^3.8.3')
		expect(final_pkg.devDependencies.eslint).toBe('^10.4.0')
	})

	it('preserves existing pins instead of downgrading (#186)', async () => {
		// Users who upgraded a single dep ahead of game-kit must not be silently
		// rolled back to game-kit's older pin.
		const { readFileSync, writeFileSync } = await import('node:fs')
		stub_readFileSync_by_path(vi.mocked(readFileSync), {
			'/pkg/package.json': JSON.stringify({
				scripts: { preview: CANONICAL_PREVIEW },
				devDependencies: KIT_DEV_DEPS_FIXTURE,
			}),
			'/project/package.json': JSON.stringify({
				name: 'consumer',
				scripts: { preview: CANONICAL_PREVIEW },
				devDependencies: { prettier: '^3.99.0' },
			}),
		})
		const { jgame_sync } = await import('./jgame-sync.ts')
		jgame_sync.run()
		const pkg_writes = vi
			.mocked(writeFileSync)
			.mock.calls.filter(([file_path]) => String(file_path) === '/project/package.json')
		const final_pkg = JSON.parse(String(pkg_writes.at(-1)?.[1]))
		expect(final_pkg.devDependencies.prettier).toBe('^3.99.0')
	})

	it('does not rewrite package.json when every required dep is already present', async () => {
		const { readFileSync, writeFileSync } = await import('node:fs')
		const dev_deps = await build_complete_consumer_dev_deps()
		stub_readFileSync_by_path(vi.mocked(readFileSync), {
			'/pkg/package.json': JSON.stringify({
				scripts: { preview: CANONICAL_PREVIEW },
				devDependencies: KIT_DEV_DEPS_FIXTURE,
			}),
			'/project/package.json': JSON.stringify({
				name: 'consumer',
				scripts: { preview: CANONICAL_PREVIEW },
				devDependencies: dev_deps,
			}),
		})
		const { jgame_sync } = await import('./jgame-sync.ts')
		jgame_sync.run()
		const pkg_writes = vi
			.mocked(writeFileSync)
			.mock.calls.filter(([file_path]) => String(file_path) === '/project/package.json')
		expect(pkg_writes).toHaveLength(0)
	})
})

describe('jgame_sync.apply_managed_dev_deps', () => {
	it('returns false and leaves pkg untouched when every required dep is present', async () => {
		const { jgame_sync } = await import('./jgame-sync.ts')
		const required = { prettier: '^3.8.3', eslint: '^10.4.0' }
		const pkg = { devDependencies: { prettier: '^3.99.0', eslint: '^10.4.0' } }
		const did_change = jgame_sync.apply_managed_dev_deps(pkg, required)
		expect(did_change).toBe(false)
		expect(pkg.devDependencies).toEqual({ prettier: '^3.99.0', eslint: '^10.4.0' })
	})

	it('returns true and adds only the missing required deps', async () => {
		const { jgame_sync } = await import('./jgame-sync.ts')
		const required = { prettier: '^3.8.3', eslint: '^10.4.0', cspell: '^10.0.0' }
		const pkg = { devDependencies: { prettier: '^3.99.0' } }
		const did_change = jgame_sync.apply_managed_dev_deps(pkg, required)
		expect(did_change).toBe(true)
		expect(pkg.devDependencies).toEqual({
			prettier: '^3.99.0',
			eslint: '^10.4.0',
			cspell: '^10.0.0',
		})
	})

	it('initializes devDependencies when the consumer has none', async () => {
		const { jgame_sync } = await import('./jgame-sync.ts')
		const required = { prettier: '^3.8.3' }
		const pkg: { devDependencies?: Record<string, string> } = {}
		const did_change = jgame_sync.apply_managed_dev_deps(pkg, required)
		expect(did_change).toBe(true)
		expect(pkg.devDependencies).toEqual({ prettier: '^3.8.3' })
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
