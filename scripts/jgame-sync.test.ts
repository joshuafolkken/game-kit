import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { jgame_root_files } from './jgame-root-files.ts'

vi.mock('node:fs', async () => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- vi.importActual generic needs an inline import type
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
const CANONICAL_PREPARE =
	"svelte-kit sync || echo ''; command -v lefthook >/dev/null 2>&1 && lefthook install; command -v tsx >/dev/null 2>&1 && tsx node_modules/@joshuafolkken/kit/scripts/fix-gh-packages.ts; true"

// Framework / app-shell files that jgame sync refreshes from templates/ on every
// run. Each entry pairs the destination path inside the user project with the
// source filename inside templates/. .npmrc is shipped as `npmrc` because npm
// strips .npmrc from published packages regardless of the `files` field.
const EXPECTED_SYNC_ENTRIES = [
	{ dest: '.npmrc', src: 'npmrc' },
	{ dest: 'src/app.html', src: 'src/app.html' },
	{ dest: 'src/hooks.server.ts', src: 'src/hooks.server.ts' },
	{ dest: 'src/routes/+layout.svelte', src: 'src/routes/+layout.svelte' },
	// layout.css stays under templates/ as a COPY_PAIR because +layout.svelte
	// (still a template) imports it; it is regenerated from the root source.
	{ dest: 'src/routes/layout.css', src: 'src/routes/layout.css' },
	{ dest: 'vite.config.ts', src: 'vite.config.ts' },
] as const

// Byte-identical, import-decoupled files single-sourced at the repo root: jgame
// sync copies them directly from the package root, not from templates/ (they no
// longer exist there). Destination path equals the package-relative source path.
// Derived from the production list so the two cannot drift apart.
const EXPECTED_ROOT_SYNC_FILES = jgame_root_files.ROOT_COPY_FILES

// Resolve the real templates/ dir and repo root from this test file's location
// so the source-existence guards do not depend on the mocked PROJECT_ROOT.
const REAL_REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REAL_TEMPLATES_DIR = path.join(REAL_REPO_ROOT, 'templates')

function stub_readFileSync_by_path(
	read: ReturnType<typeof vi.fn>,
	overrides: Record<string, string>,
): void {
	read.mockImplementation((file: string) => {
		const key = file
		if (key in overrides) return overrides[key]
		throw new Error(`unexpected readFileSync(${key})`)
	})
}

// Stateful variant: writeFileSync persists into the same store that readFileSync
// reads from, mirroring a real filesystem. Required when a single jgame sync run
// touches package.json more than once (devDeps pass, then scripts pass) — the
// second read must observe the first write, exactly as production does.
function stub_fs_roundtrip(
	read: ReturnType<typeof vi.fn>,
	write: ReturnType<typeof vi.fn>,
	initial: Record<string, string>,
): void {
	const store: Record<string, string> = { ...initial }

	read.mockImplementation((file: string) => {
		if (file in store) return store[file]
		throw new Error(`unexpected readFileSync(${file})`)
	})
	write.mockImplementation((file: string, data: string) => {
		store[file] = data
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
async function build_complete_consumer_development_deps(): Promise<Record<string, string>> {
	const { jgame_managed_dev_deps } = await import('./jgame-managed-development-deps.ts')
	const overrides: Record<string, string> = { ...KIT_DEV_DEPS_FIXTURE }

	return Object.fromEntries(
		jgame_managed_dev_deps.REQUIRED_DEV_DEPS.map((k) => [k, overrides[k] ?? '*']),
	)
}

describe('jgame_sync.run', () => {
	beforeEach(async () => {
		vi.spyOn(console, 'info').mockImplementation(() => {
			/* no-op */
		})
		const { readFileSync } = await import('node:fs')
		const game_kit_package = JSON.stringify({
			scripts: { preview: CANONICAL_PREVIEW, prepare: CANONICAL_PREPARE },
			devDependencies: KIT_DEV_DEPS_FIXTURE,
		})
		const consumer_package = JSON.stringify({
			scripts: { preview: CANONICAL_PREVIEW, prepare: CANONICAL_PREPARE },
			devDependencies: KIT_DEV_DEPS_FIXTURE,
		})

		stub_readFileSync_by_path(vi.mocked(readFileSync), {
			'/pkg/package.json': game_kit_package,
			'/project/package.json': consumer_package,
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
		const sync_index = exec_calls.findIndex(([cmd]) => cmd === 'pnpm josh sync')
		const init_index = exec_calls.findIndex(([cmd]) => cmd === 'pnpm josh init --type sveltekit')

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

	it.each(EXPECTED_ROOT_SYNC_FILES)(
		'syncs %s from the package root to PROJECT_ROOT',
		async (destination) => {
			const { cpSync } = await import('node:fs')
			const { jgame_sync } = await import('./jgame-sync.ts')

			jgame_sync.run()
			expect(cpSync).toHaveBeenCalledWith(`/pkg/${destination}`, `/project/${destination}`)
		},
	)

	it.each(EXPECTED_ROOT_SYNC_FILES)(
		'has a real package-root %s source file to copy',
		(destination) => {
			expect(existsSync(path.join(REAL_REPO_ROOT, destination))).toBe(true)
		},
	)

	it.each(EXPECTED_ROOT_SYNC_FILES)('no longer ships %s inside templates/', (destination) => {
		// Single-sourced from the repo root; must not be reintroduced as a duplicate.
		expect(existsSync(path.join(REAL_TEMPLATES_DIR, destination))).toBe(false)
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
			([source, destination]) =>
				String(source) === '/pkg/templates/pnpm-workspace.yaml' &&
				String(destination) === '/project/pnpm-workspace.yaml',
		)
		const josh_sync_index = exec_calls.findIndex(([cmd]) => cmd === 'pnpm josh sync')
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

	it('overwrites eslint.config.js with the game-dir overrides so pre-#260 projects self-heal', async () => {
		// josh sync/init never overwrite an existing eslint.config.js, so an older
		// project keeps a bare config that fails on the verbatim game templates.
		const { writeFileSync } = await import('node:fs')
		const { jgame_sync } = await import('./jgame-sync.ts')

		jgame_sync.run()
		expect(writeFileSync).toHaveBeenCalledWith(
			'/project/eslint.config.js',
			expect.stringContaining("files: ['src/lib/game/**']"),
		)
	})

	it('overwrites cspell.config.yaml with the game-aware import so existing projects self-heal (#286)', async () => {
		// josh sync/init never overwrite an existing cspell.config.yaml, so a project scaffolded
		// before #286 keeps a bare config that trips on the verbatim game-template words.
		const { writeFileSync } = await import('node:fs')
		const { jgame_sync } = await import('./jgame-sync.ts')

		jgame_sync.run()
		expect(writeFileSync).toHaveBeenCalledWith(
			'/project/cspell.config.yaml',
			expect.stringContaining('@joshuafolkken/game-kit/cspell/game'),
		)
	})
})

describe('jgame_sync managed package.json scripts', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.spyOn(console, 'info').mockImplementation(() => {
			/* no-op */
		})
	})

	it('rewrites a stale preview script to the canonical Worker-runtime value', async () => {
		// Regression for #135: a project initialized before the fix has
		// "preview": "vite preview" — jgame sync must correct it.
		const { readFileSync, writeFileSync } = await import('node:fs')
		const development_deps = await build_complete_consumer_development_deps()

		stub_readFileSync_by_path(vi.mocked(readFileSync), {
			'/pkg/package.json': JSON.stringify({
				scripts: { preview: CANONICAL_PREVIEW, prepare: CANONICAL_PREPARE },
				devDependencies: KIT_DEV_DEPS_FIXTURE,
			}),
			'/project/package.json': JSON.stringify({
				name: 'consumer',
				scripts: { preview: 'vite preview', dev: 'vite dev' },
				devDependencies: development_deps,
			}),
		})
		const { jgame_sync } = await import('./jgame-sync.ts')

		jgame_sync.run()
		const package_writes = vi
			.mocked(writeFileSync)
			.mock.calls.filter(([file_path]) => String(file_path) === '/project/package.json')

		expect(package_writes).toHaveLength(1)
		const written = JSON.parse(String(package_writes.at(-1)?.[1]))

		expect(written.scripts.preview).toBe(CANONICAL_PREVIEW)
		// Preserves consumer-owned scripts that are NOT in MANAGED_SCRIPT_KEYS.
		expect(written.scripts.dev).toBe('vite dev')
		// Preserves unrelated package.json fields.
		expect(written.name).toBe('consumer')
	})

	it('does not rewrite package.json when scripts are already canonical', async () => {
		const { readFileSync, writeFileSync } = await import('node:fs')
		const development_deps = await build_complete_consumer_development_deps()

		stub_readFileSync_by_path(vi.mocked(readFileSync), {
			'/pkg/package.json': JSON.stringify({
				scripts: { preview: CANONICAL_PREVIEW, prepare: CANONICAL_PREPARE },
				devDependencies: KIT_DEV_DEPS_FIXTURE,
			}),
			'/project/package.json': JSON.stringify({
				name: 'consumer',
				scripts: { preview: CANONICAL_PREVIEW, prepare: CANONICAL_PREPARE, dev: 'vite dev' },
				devDependencies: development_deps,
			}),
		})
		const { jgame_sync } = await import('./jgame-sync.ts')

		jgame_sync.run()
		const package_writes = vi
			.mocked(writeFileSync)
			.mock.calls.filter(([file_path]) => String(file_path) === '/project/package.json')

		expect(package_writes).toHaveLength(0)
	})

	it('self-heals an existing consumer with the old failing postinstall (#272)', async () => {
		// Regression for #272: a project scaffolded before the fix carries the old
		// unconditional `postinstall` (`lefthook install && tsx ...`) and no `prepare`.
		// jgame sync must add the guarded canonical `prepare`, and the devDeps pass must
		// inject lefthook + tsx so the tools the old postinstall references actually exist
		// (its `pnpm install` then stops failing).
		const { readFileSync, writeFileSync } = await import('node:fs')

		stub_fs_roundtrip(vi.mocked(readFileSync), vi.mocked(writeFileSync), {
			'/pkg/package.json': JSON.stringify({
				scripts: { preview: CANONICAL_PREVIEW, prepare: CANONICAL_PREPARE },
				devDependencies: KIT_DEV_DEPS_FIXTURE,
			}),
			'/project/package.json': JSON.stringify({
				name: 'consumer',
				scripts: {
					preview: CANONICAL_PREVIEW,
					postinstall:
						'lefthook install && tsx node_modules/@joshuafolkken/kit/scripts/fix-gh-packages.ts',
				},
				devDependencies: { '@joshuafolkken/kit': '0.150.0' },
			}),
		})
		const { jgame_sync } = await import('./jgame-sync.ts')

		jgame_sync.run()
		const package_writes = vi
			.mocked(writeFileSync)
			.mock.calls.filter(([file_path]) => String(file_path) === '/project/package.json')
		const written = JSON.parse(String(package_writes.at(-1)?.[1]))

		expect(written.scripts.prepare).toBe(CANONICAL_PREPARE)
		// The superseded unconditional postinstall is removed, not left to double-run.
		expect(written.scripts.postinstall).toBeUndefined()
		expect(written.devDependencies.lefthook).toBeDefined()
		expect(written.devDependencies.tsx).toBeDefined()
	})

	it('adds the canonical preview script when the consumer has no scripts field', async () => {
		const { readFileSync, writeFileSync } = await import('node:fs')
		const development_deps = await build_complete_consumer_development_deps()

		stub_readFileSync_by_path(vi.mocked(readFileSync), {
			'/pkg/package.json': JSON.stringify({
				scripts: { preview: CANONICAL_PREVIEW, prepare: CANONICAL_PREPARE },
				devDependencies: KIT_DEV_DEPS_FIXTURE,
			}),
			'/project/package.json': JSON.stringify({
				name: 'consumer',
				devDependencies: development_deps,
			}),
		})
		const { jgame_sync } = await import('./jgame-sync.ts')

		jgame_sync.run()
		const package_writes = vi
			.mocked(writeFileSync)
			.mock.calls.filter(([file_path]) => String(file_path) === '/project/package.json')

		expect(package_writes).toHaveLength(1)
		const written = JSON.parse(String(package_writes.at(-1)?.[1]))

		expect(written.scripts.preview).toBe(CANONICAL_PREVIEW)
	})
})

describe('jgame_sync managed package.json devDependencies', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.spyOn(console, 'info').mockImplementation(() => {
			/* no-op */
		})
	})

	it('adds missing required devDeps to consumer package.json (#186)', async () => {
		// Regression for #186: a project scaffolded before #184 is missing prettier,
		// eslint, etc. jgame sync must inject them so the next pnpm install (the
		// preflight before pnpm josh sync) installs the binaries that lint/format need.
		const { readFileSync, writeFileSync } = await import('node:fs')

		stub_fs_roundtrip(vi.mocked(readFileSync), vi.mocked(writeFileSync), {
			'/pkg/package.json': JSON.stringify({
				scripts: { preview: CANONICAL_PREVIEW, prepare: CANONICAL_PREPARE },
				devDependencies: KIT_DEV_DEPS_FIXTURE,
			}),
			'/project/package.json': JSON.stringify({
				name: 'consumer',
				scripts: { preview: CANONICAL_PREVIEW, prepare: CANONICAL_PREPARE },
				devDependencies: { '@joshuafolkken/kit': '0.150.0' },
			}),
		})
		const { jgame_sync } = await import('./jgame-sync.ts')

		jgame_sync.run()
		const package_writes = vi
			.mocked(writeFileSync)
			.mock.calls.filter(([file_path]) => String(file_path) === '/project/package.json')

		expect(package_writes.length).toBeGreaterThanOrEqual(1)
		const final_package = JSON.parse(String(package_writes.at(-1)?.[1]))

		expect(final_package.devDependencies.prettier).toBe('^3.8.3')
		expect(final_package.devDependencies.eslint).toBe('^10.4.0')
	})

	it('preserves existing pins instead of downgrading (#186)', async () => {
		// Users who upgraded a single dep ahead of game-kit must not be silently
		// rolled back to game-kit's older pin.
		const { readFileSync, writeFileSync } = await import('node:fs')

		stub_readFileSync_by_path(vi.mocked(readFileSync), {
			'/pkg/package.json': JSON.stringify({
				scripts: { preview: CANONICAL_PREVIEW, prepare: CANONICAL_PREPARE },
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
		const package_writes = vi
			.mocked(writeFileSync)
			.mock.calls.filter(([file_path]) => String(file_path) === '/project/package.json')
		const final_package = JSON.parse(String(package_writes.at(-1)?.[1]))

		expect(final_package.devDependencies.prettier).toBe('^3.99.0')
	})

	it('does not rewrite package.json when every required dep is already present', async () => {
		const { readFileSync, writeFileSync } = await import('node:fs')
		const development_deps = await build_complete_consumer_development_deps()

		stub_readFileSync_by_path(vi.mocked(readFileSync), {
			'/pkg/package.json': JSON.stringify({
				scripts: { preview: CANONICAL_PREVIEW, prepare: CANONICAL_PREPARE },
				devDependencies: KIT_DEV_DEPS_FIXTURE,
			}),
			'/project/package.json': JSON.stringify({
				name: 'consumer',
				scripts: { preview: CANONICAL_PREVIEW, prepare: CANONICAL_PREPARE },
				devDependencies: development_deps,
			}),
		})
		const { jgame_sync } = await import('./jgame-sync.ts')

		jgame_sync.run()
		const package_writes = vi
			.mocked(writeFileSync)
			.mock.calls.filter(([file_path]) => String(file_path) === '/project/package.json')

		expect(package_writes).toHaveLength(0)
	})
})

describe('jgame_sync.apply_managed_dev_deps', () => {
	it('returns false and leaves pkg untouched when every required dep is present', async () => {
		const { jgame_sync } = await import('./jgame-sync.ts')
		const required = { prettier: '^3.8.3', eslint: '^10.4.0' }
		const package_ = { devDependencies: { prettier: '^3.99.0', eslint: '^10.4.0' } }
		const did_change = jgame_sync.apply_managed_dev_deps(package_, required)

		expect(did_change).toBe(false)
		expect(package_.devDependencies).toEqual({ prettier: '^3.99.0', eslint: '^10.4.0' })
	})

	it('returns true and adds only the missing required deps', async () => {
		const { jgame_sync } = await import('./jgame-sync.ts')
		const required = { prettier: '^3.8.3', eslint: '^10.4.0', cspell: '^10.0.0' }
		const package_ = { devDependencies: { prettier: '^3.99.0' } }
		const did_change = jgame_sync.apply_managed_dev_deps(package_, required)

		expect(did_change).toBe(true)
		expect(package_.devDependencies).toEqual({
			prettier: '^3.99.0',
			eslint: '^10.4.0',
			cspell: '^10.0.0',
		})
	})

	it('initializes devDependencies when the consumer has none', async () => {
		const { jgame_sync } = await import('./jgame-sync.ts')
		const required = { prettier: '^3.8.3' }
		const package_: { devDependencies?: Record<string, string> } = {}
		const did_change = jgame_sync.apply_managed_dev_deps(package_, required)

		expect(did_change).toBe(true)
		expect(package_.devDependencies).toEqual({ prettier: '^3.8.3' })
	})
})

describe('jgame_sync.apply_managed_scripts', () => {
	it('reports no change when consumer already has canonical values', async () => {
		const { jgame_sync } = await import('./jgame-sync.ts')
		const package_ = { scripts: { preview: CANONICAL_PREVIEW } }
		const did_change = jgame_sync.apply_managed_scripts(package_, { preview: CANONICAL_PREVIEW })

		expect(did_change).toBe(false)
		expect(package_.scripts.preview).toBe(CANONICAL_PREVIEW)
	})

	it('returns true and mutates scripts when a managed key is stale', async () => {
		const { jgame_sync } = await import('./jgame-sync.ts')
		const package_ = { scripts: { preview: 'vite preview' } }
		const did_change = jgame_sync.apply_managed_scripts(package_, { preview: CANONICAL_PREVIEW })

		expect(did_change).toBe(true)
		expect(package_.scripts.preview).toBe(CANONICAL_PREVIEW)
	})

	it('removes the superseded unconditional postinstall (#272)', async () => {
		const { jgame_sync } = await import('./jgame-sync.ts')
		const package_ = {
			scripts: {
				preview: CANONICAL_PREVIEW,
				postinstall:
					'lefthook install && tsx node_modules/@joshuafolkken/kit/scripts/fix-gh-packages.ts',
			},
		}
		const did_change = jgame_sync.apply_managed_scripts(package_, {
			preview: CANONICAL_PREVIEW,
			prepare: CANONICAL_PREPARE,
		})

		expect(did_change).toBe(true)
		expect(package_.scripts.postinstall).toBeUndefined()
		expect(package_.scripts.prepare).toBe(CANONICAL_PREPARE)
	})

	it('never touches a consumer-owned custom postinstall (#272)', async () => {
		const { jgame_sync } = await import('./jgame-sync.ts')
		const custom = 'node ./scripts/my-setup.js'
		const package_ = {
			scripts: { preview: CANONICAL_PREVIEW, prepare: CANONICAL_PREPARE, postinstall: custom },
		}
		const did_change = jgame_sync.apply_managed_scripts(package_, {
			preview: CANONICAL_PREVIEW,
			prepare: CANONICAL_PREPARE,
		})

		expect(did_change).toBe(false)
		expect(package_.scripts.postinstall).toBe(custom)
	})
})
