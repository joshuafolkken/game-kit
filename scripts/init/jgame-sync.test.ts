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

// A minimal consumer `scripts` fixture. jgame sync no longer manages package.json
// scripts (the Cloudflare lifecycle moved to app-kit's `josh-app sync` overlay, #357),
// so the script content is irrelevant to the surviving devDeps / file-sync tests — this
// stands in as a representative non-empty scripts field.
const CONSUMER_SCRIPTS = { dev: 'vite dev' }

// Framework / app-shell files that jgame sync refreshes from templates/ on every
// run. Each entry pairs the destination path inside the user project with the
// source filename inside templates/. .npmrc is shipped as `npmrc` because npm
// strips .npmrc from published packages regardless of the `files` field.
const EXPECTED_SYNC_ENTRIES = [
	{ dest: '.npmrc', src: 'npmrc' },
	{ dest: 'src/app.html', src: 'src/app.html' },
	{ dest: 'src/hooks.server.ts', src: 'src/hooks.server.ts' },
	{ dest: 'src/lib/html-inject.ts', src: 'src/lib/html-inject.ts' },
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
const REAL_REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const REAL_TEMPLATES_DIR = path.join(REAL_REPO_ROOT, 'templates')

function stub_readFileSync_by_path(
	read: ReturnType<typeof vi.fn>,
	overrides: Record<string, string>,
): void {
	read.mockImplementation((file: string) => {
		const key = file
		if (Object.hasOwn(overrides, key)) return overrides[key]
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
		if (Object.hasOwn(store, file)) return store[file]
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
			scripts: CONSUMER_SCRIPTS,
			devDependencies: KIT_DEV_DEPS_FIXTURE,
		})
		const consumer_package = JSON.stringify({
			scripts: CONSUMER_SCRIPTS,
			devDependencies: KIT_DEV_DEPS_FIXTURE,
		})

		stub_readFileSync_by_path(vi.mocked(readFileSync), {
			'/pkg/package.json': game_kit_package,
			'/project/package.json': consumer_package,
		})
	})

	it('delegates the framework sync to pnpm josh-app sync (#357)', async () => {
		const { execSync } = await import('node:child_process')
		const { jgame_sync } = await import('./jgame-sync.ts')

		jgame_sync.run()
		expect(execSync).toHaveBeenCalledWith('pnpm josh-app sync', expect.any(Object))
	})

	it('calls pnpm josh-app init to self-heal missing configs (#357)', async () => {
		// `josh-app sync` (= `josh sync`) early-returns on missing destinations, so the
		// canonical `josh-app init` is invoked to scaffold eslint.config.js / etc. on
		// projects that predate this layer.
		const { execSync } = await import('node:child_process')
		const { jgame_sync } = await import('./jgame-sync.ts')

		jgame_sync.run()
		expect(execSync).toHaveBeenCalledWith('pnpm josh-app init', expect.any(Object))
	})

	it('runs pnpm josh-app init AFTER pnpm josh-app sync (#357)', async () => {
		// `josh-app sync`'s preflight pnpm install installs the new devDeps that
		// sync_managed_development_deps just wrote into package.json; `josh-app init` then
		// scaffolds any missing config files with those deps already available.
		const { execSync } = await import('node:child_process')
		const { jgame_sync } = await import('./jgame-sync.ts')

		jgame_sync.run()
		const exec_calls = vi.mocked(execSync).mock.calls
		const sync_index = exec_calls.findIndex(([cmd]) => cmd === 'pnpm josh-app sync')
		const init_index = exec_calls.findIndex(([cmd]) => cmd === 'pnpm josh-app init')

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

	it('pre-syncs pnpm-workspace.yaml BEFORE invoking pnpm josh-app sync (regression for #182)', async () => {
		// pnpm 11 runs a deps-status check (pnpm install) before every pnpm script.
		// If the consumer's pnpm-workspace.yaml lacks the bare-name @joshuafolkken/game-kit
		// exclude, that pre-flight install fails on ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION
		// and pnpm josh-app sync (which would have refreshed the yaml) never executes.
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
		const josh_sync_index = exec_calls.findIndex(([cmd]) => cmd === 'pnpm josh-app sync')
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

describe('jgame_sync.SYNC_FILES contract', () => {
	it('does not manage tsconfig.json or src/app.d.ts (owned by the josh-app overlay, #326/#357)', async () => {
		// tsconfig.json reconciliation is owned by `josh-app sync`, and src/app.d.ts is
		// seeded by `josh-app init` (Cloudflare-aware). Adding either here would shadow the
		// overlay with a verbatim template copy and clobber the app-kit-owned content.
		const { jgame_sync } = await import('./jgame-sync.ts')
		const destinations = jgame_sync.SYNC_FILES.map((entry) => entry.dest)

		expect(destinations).not.toContain('tsconfig.json')
		expect(destinations).not.toContain('src/app.d.ts')
	})

	it('still manages the game-owned app shell src/app.html', async () => {
		// src/app.html is the game's rich shell (loading overlay, version/name placeholders)
		// and intentionally overrides app-kit's generic seeded shell, so it stays managed here.
		const { jgame_sync } = await import('./jgame-sync.ts')
		const destinations = jgame_sync.SYNC_FILES.map((entry) => entry.dest)

		expect(destinations).toContain('src/app.html')
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
				scripts: CONSUMER_SCRIPTS,
				devDependencies: KIT_DEV_DEPS_FIXTURE,
			}),
			'/project/package.json': JSON.stringify({
				name: 'consumer',
				scripts: CONSUMER_SCRIPTS,
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
				scripts: CONSUMER_SCRIPTS,
				devDependencies: KIT_DEV_DEPS_FIXTURE,
			}),
			'/project/package.json': JSON.stringify({
				name: 'consumer',
				scripts: CONSUMER_SCRIPTS,
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
				scripts: CONSUMER_SCRIPTS,
				devDependencies: KIT_DEV_DEPS_FIXTURE,
			}),
			'/project/package.json': JSON.stringify({
				name: 'consumer',
				scripts: CONSUMER_SCRIPTS,
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

	it('drops the legacy pnpm field and de-duplicates a runtime-listed dep on a full sync (#323)', async () => {
		// Reproduces the mnemecha state. @threlte/core is listed only under runtime
		// `dependencies` (move, range preserved); `three` is in BOTH sections (de-dup,
		// devDeps range wins); a stale package.json `pnpm` field that pnpm 11 ignores lingers.
		const { readFileSync, writeFileSync } = await import('node:fs')
		const all_deps = await build_complete_consumer_development_deps()
		const development_deps = Object.fromEntries(
			Object.entries(all_deps).filter(([key]) => key !== '@threlte/core'),
		)

		stub_fs_roundtrip(vi.mocked(readFileSync), vi.mocked(writeFileSync), {
			'/pkg/package.json': JSON.stringify({
				scripts: CONSUMER_SCRIPTS,
				devDependencies: KIT_DEV_DEPS_FIXTURE,
			}),
			'/project/package.json': JSON.stringify({
				name: 'consumer',
				scripts: CONSUMER_SCRIPTS,
				dependencies: { '@threlte/core': '^8.0.0', three: '^0.170.0', 'my-runtime-lib': '^2.0.0' },
				devDependencies: development_deps,
				pnpm: { overrides: { cookie: '^0.7.0' } },
			}),
		})
		const { jgame_sync } = await import('./jgame-sync.ts')

		jgame_sync.run()
		const package_writes = vi
			.mocked(writeFileSync)
			.mock.calls.filter(([file_path]) => String(file_path) === '/project/package.json')
		const written = JSON.parse(String(package_writes.at(-1)?.[1]))

		expect(written.pnpm).toBeUndefined()
		// Moved dep keeps its runtime range; de-duped dep keeps the devDeps range; the
		// consumer's own non-managed runtime dep survives under dependencies.
		expect(written.devDependencies['@threlte/core']).toBe('^8.0.0')
		expect(written.devDependencies.three).toBe(all_deps.three)
		expect(written.dependencies).toEqual({ 'my-runtime-lib': '^2.0.0' })
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

describe('jgame_sync.remove_legacy_pnpm_field', () => {
	it('removes a legacy pnpm field but leaves a package without one unchanged (#323)', async () => {
		const { jgame_sync } = await import('./jgame-sync.ts')
		const with_field: { pnpm?: unknown; name?: string } = {
			name: 'consumer',
			pnpm: { overrides: { cookie: '^0.7.0' } },
		}

		expect(jgame_sync.remove_legacy_pnpm_field(with_field)).toBe(true)
		expect('pnpm' in with_field).toBe(false)
		expect(with_field.name).toBe('consumer')
		expect(jgame_sync.remove_legacy_pnpm_field({})).toBe(false)
	})
})

describe('jgame_sync.is_josh_resolvable', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns true when the josh probe command succeeds', async () => {
		const { execSync } = await import('node:child_process')

		vi.mocked(execSync).mockReturnValue(Buffer.from(''))
		const { jgame_sync } = await import('./jgame-sync.ts')

		expect(jgame_sync.is_josh_resolvable()).toBe(true)
		expect(execSync).toHaveBeenCalledWith('pnpm josh help', expect.any(Object))
	})

	it('returns false when the josh probe command throws (bin unresolvable)', async () => {
		const { execSync } = await import('node:child_process')

		vi.mocked(execSync).mockImplementation(() => {
			throw new Error('command not found: josh')
		})
		const { jgame_sync } = await import('./jgame-sync.ts')

		expect(jgame_sync.is_josh_resolvable()).toBe(false)
	})
})

describe('jgame_sync.run josh-app delegation', () => {
	beforeEach(async () => {
		vi.clearAllMocks()
		// clearAllMocks keeps implementations; reset execSync so a throwing probe
		// from the is_josh_resolvable suite does not leak into the default path here.
		const { execSync } = await import('node:child_process')

		vi.mocked(execSync).mockReset()
		vi.spyOn(console, 'info').mockImplementation(() => {
			/* no-op */
		})
		const { readFileSync } = await import('node:fs')
		const package_json = JSON.stringify({
			scripts: CONSUMER_SCRIPTS,
			devDependencies: KIT_DEV_DEPS_FIXTURE,
		})

		stub_readFileSync_by_path(vi.mocked(readFileSync), {
			'/pkg/package.json': package_json,
			'/project/package.json': package_json,
		})
	})

	it('logs an actionable error and exits non-zero when josh is unresolvable', async () => {
		// Bin absent: the resolvability probe (pnpm josh help) throws. jgame sync must
		// surface an actionable message naming @joshuafolkken/kit and exit non-zero,
		// rather than silently skipping the kit-owned files or emitting an opaque error.
		const { execSync } = await import('node:child_process')

		vi.mocked(execSync).mockImplementation((command) => {
			if (command === 'pnpm josh help') throw new Error('command not found: josh')

			return Buffer.from('')
		})
		const error_spy = vi.spyOn(console, 'error').mockImplementation(() => {
			/* no-op */
		})

		vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit called')
		})
		const { jgame_sync } = await import('./jgame-sync.ts')

		expect(() => {
			jgame_sync.run()
		}).toThrow('process.exit called')
		expect(process.exit).toHaveBeenCalledWith(1)
		expect(error_spy).toHaveBeenCalledWith(expect.stringContaining('@joshuafolkken/kit'))
		expect(execSync).not.toHaveBeenCalledWith('pnpm josh-app sync', expect.anything())
	})
})
