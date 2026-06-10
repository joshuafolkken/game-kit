import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('node:fs', () => ({
	cpSync: vi.fn(),
	existsSync: vi.fn(),
	mkdirSync: vi.fn(),
	readdirSync: vi.fn(),
	readFileSync: vi.fn(),
	statSync: vi.fn(),
	writeFileSync: vi.fn(),
}))
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
	'pnpm prepare:gen && pnpm prepare:sync && pnpm prepare:lefthook && pnpm prepare:gh-packages'
// The orchestrated sub-scripts `prepare` delegates to — these SURVIVE `pnpm pack`
// (only the bare `prepare` key is stripped), so they mirror the published shape.
const PUBLISHED_SUB_SCRIPTS = {
	'prepare:gen': '[ ! -f wrangler.jsonc ] || pnpm gen',
	'prepare:sync': "svelte-kit sync || echo ''",
	'prepare:lefthook': '[ -n "$CI" ] || ! command -v lefthook >/dev/null 2>&1 || lefthook install',
	'prepare:gh-packages':
		'[ -n "$CI" ] || ! command -v tsx >/dev/null 2>&1 || tsx node_modules/@joshuafolkken/kit/scripts/fix-gh-packages.ts',
	gen: 'pnpm gen:pre && wrangler types',
	'gen:pre': 'node -e "clean .svelte-kit/cloudflare/_worker.*"',
}
const MOCK_HOST_PNPM_VERSION = '11.3.0'
const MAX_LINE_LENGTH = 100

// `pnpm pack` strips both the top-level `packageManager` field AND the bare `prepare`
// lifecycle script on publish, so the fixture mirrors that published shape: only
// `devEngines.packageManager` remains, and `scripts` carries NO bare `prepare` (init
// must emit the orchestrator from CANONICAL_PREPARE, not from the manifest). The
// colon-namespaced `prepare:*` sub-scripts + `gen` / `gen:pre` DO survive publish, so
// they are present here and init reads them through. The pre-#279 fixture wrongly kept
// `prepare`, so the unit suite passed while the real published init crashed (#279).
const MOCK_PKG = {
	version: '1.0.0',
	scripts: { preview: CANONICAL_PREVIEW, ...PUBLISHED_SUB_SCRIPTS },
	devDependencies: {
		'@ianvs/prettier-plugin-sort-imports': '^4.7.1',
		'@joshuafolkken/kit': '0.162.0',
		'@sveltejs/kit': '^2.0.0',
		cspell: '^10.0.0',
		eslint: '^10.4.0',
		lefthook: '^2.1.9',
		prettier: '^3.8.3',
		'prettier-plugin-svelte': '^4.0.1',
		'prettier-plugin-tailwindcss': '^0.8.0',
		svelte: '^5.0.0',
		tsx: '^4.22.4',
		vite: '^6.0.0',
	},
	devEngines: { packageManager: { name: 'pnpm', version: '>=11.0.0-0', onFail: 'error' } },
}

describe('jgame_init.generate_package_json', () => {
	beforeEach(async () => {
		const { readFileSync } = await import('node:fs')
		const { execSync } = await import('node:child_process')

		vi.mocked(readFileSync).mockReturnValue(JSON.stringify(MOCK_PKG))
		vi.mocked(execSync).mockReturnValue(Buffer.from(`${MOCK_HOST_PNPM_VERSION}\n`))
	})

	it('includes game-kit in devDependencies with current version (#301)', async () => {
		// game-kit is bundled at build time by the generated SvelteKit app, so it lives
		// in devDependencies — matching what `jgame vu` (`pnpm add -D`) already enforces.
		const { jgame_init } = await import('./jgame-init.ts')
		const result = JSON.parse(jgame_init.generate_package_json('my-game'))

		expect(result.devDependencies['@joshuafolkken/game-kit']).toBe('^1.0.0')
	})

	it('does not place game-kit in a `dependencies` field (#301)', async () => {
		// Regression for #301: `jgame init` previously scaffolded game-kit into
		// `dependencies`, so the first `jgame vu` silently relocated it to
		// `devDependencies`, producing unexpected dependency-field churn.
		const { jgame_init } = await import('./jgame-init.ts')
		const result = JSON.parse(jgame_init.generate_package_json('my-game'))

		expect(result.dependencies).toBeUndefined()
	})

	it('sorts game-kit lexicographically into devDependencies to avoid `jgame vu` churn (#301)', async () => {
		// `jgame vu` runs `pnpm add -D`, which re-sorts devDependencies keys. Emitting
		// the same lexicographic order here means the first upgrade produces no key churn:
		// game-kit lands immediately before @joshuafolkken/kit.
		const { jgame_init } = await import('./jgame-init.ts')
		const parsed = JSON.parse(jgame_init.generate_package_json('my-game')) as {
			devDependencies: Record<string, string>
		}
		const keys = Object.keys(parsed.devDependencies)

		expect(keys).toEqual([...keys].toSorted((left, right) => (left < right ? -1 : 1)))
		expect(keys.indexOf('@joshuafolkken/game-kit')).toBe(keys.indexOf('@joshuafolkken/kit') - 1)
	})

	it('uses supplied game name as package name', async () => {
		const { jgame_init } = await import('./jgame-init.ts')
		const result = JSON.parse(jgame_init.generate_package_json('tic-tac-toe'))

		expect(result.name).toBe('tic-tac-toe')
	})

	it('includes kit in devDependencies as a caret range, not an exact pin (#326)', async () => {
		// Regression for #326: game-kit exact-pins @joshuafolkken/kit internally, and
		// copying that verbatim froze consumers on one kit version until a manual bump.
		const { jgame_init } = await import('./jgame-init.ts')
		const result = JSON.parse(jgame_init.generate_package_json('my-game'))

		expect(result.devDependencies['@joshuafolkken/kit']).toBe('^0.162.0')
	})

	it('includes lint/format toolchain in devDependencies (#184)', async () => {
		// Regression for #184: kit declares `prettier` and `eslint` as devDeps,
		// not regular deps, so they are NOT installed transitively for consumers.
		// Without these in the scaffolded package.json, `pnpm josh lint` /
		// `pnpm josh format` fail on first use with "Command not found".
		const { jgame_init } = await import('./jgame-init.ts')
		const result = JSON.parse(jgame_init.generate_package_json('my-game'))

		expect(result.devDependencies.prettier).toBe('^3.8.3')
		expect(result.devDependencies.eslint).toBe('^10.4.0')
		expect(result.devDependencies['prettier-plugin-svelte']).toBe('^4.0.1')
		expect(result.devDependencies['prettier-plugin-tailwindcss']).toBe('^0.8.0')
		expect(result.devDependencies['@ianvs/prettier-plugin-sort-imports']).toBe('^4.7.1')
		expect(result.devDependencies.cspell).toBe('^10.0.0')
	})

	it('does not emit a pnpm field (settings are sourced from pnpm-workspace.yaml, copied via templates)', async () => {
		const { jgame_init } = await import('./jgame-init.ts')
		const result = JSON.parse(jgame_init.generate_package_json('my-game'))

		expect(result.pnpm).toBeUndefined()
	})

	it('includes required scripts', async () => {
		const { jgame_init } = await import('./jgame-init.ts')
		const result = JSON.parse(jgame_init.generate_package_json('my-game'))

		expect(result.scripts.dev).toBe('vite dev')
		expect(result.scripts.jgame).toBe('jgame')
		expect(result.scripts.josh).toBe('josh')
	})

	it('does not emit an unconditional postinstall that can fail pnpm install (#272)', async () => {
		// Regression for #272: the old generated `postinstall` ran
		// `lefthook install && tsx ...` unconditionally; with neither tool in the
		// scaffold's managed devDeps, `pnpm install` aborted on a fresh scaffold.
		const { jgame_init } = await import('./jgame-init.ts')
		const result = JSON.parse(jgame_init.generate_package_json('my-game'))

		expect(result.scripts.postinstall).toBeUndefined()
	})

	it('emits an orchestrated prepare that delegates to guarded prepare:* sub-scripts (#311)', async () => {
		// Regression for #279: MOCK_PKG mirrors the published shape (no bare `prepare`),
		// yet init MUST still emit the canonical orchestrator from CANONICAL_PREPARE.
		const { jgame_init } = await import('./jgame-init.ts')
		const result = JSON.parse(jgame_init.generate_package_json('my-game'))

		expect(result.scripts.prepare).toBe(CANONICAL_PREPARE)
		expect(result.scripts['prepare:sync']).toBe(PUBLISHED_SUB_SCRIPTS['prepare:sync'])
		expect(result.scripts.gen).toBe(PUBLISHED_SUB_SCRIPTS.gen)
		expect(result.scripts['gen:pre']).toBe(PUBLISHED_SUB_SCRIPTS['gen:pre'])
	})

	it('emits CI-guarded owner-only prepare:* sub-scripts whose CLIs are covered by managed devDeps (#272/#323)', async () => {
		// Acceptance criterion: scaffold-managed dependencies cover every CLI the generated setup
		// sub-scripts invoke. The owner-only steps carry a `[ -n "$CI" ] ||` guard so they skip in
		// CI yet propagate a real local failure (no `; true` mask); a missing binary still skips.
		const { jgame_init } = await import('./jgame-init.ts')
		const result = JSON.parse(jgame_init.generate_package_json('my-game'))

		expect(result.scripts['prepare:lefthook']).toContain(
			'[ -n "$CI" ] || ! command -v lefthook >/dev/null 2>&1 || lefthook',
		)
		expect(result.scripts['prepare:gh-packages']).toContain(
			'[ -n "$CI" ] || ! command -v tsx >/dev/null 2>&1 || tsx',
		)
		expect(result.devDependencies.lefthook).toBe('^2.1.9')
		expect(result.devDependencies.tsx).toBe('^4.22.4')
		expect(result.scripts['prepare:lefthook']).not.toMatch(/;\s*true\s*$/u)
		expect(result.scripts['prepare:gh-packages']).not.toMatch(/;\s*true\s*$/u)
	})

	it('guards prepare:gen on wrangler.jsonc, not on CI, so gen runs once the config exists (#311/#323)', async () => {
		// The scaffold's first `pnpm install` fires `prepare` BEFORE `josh sync` writes
		// wrangler.jsonc, so gen must skip until the config exists. The `[ ! -f … ] || pnpm gen`
		// form keeps that skip while letting a genuine `pnpm gen` failure fail install — in CI too,
		// since gen generates types and is NOT `$CI`-guarded (unlike the owner-only steps).
		const { jgame_init } = await import('./jgame-init.ts')
		const result = JSON.parse(jgame_init.generate_package_json('my-game'))

		expect(result.scripts['prepare:gen']).toMatch(/\[ ! -f wrangler\.jsonc \] \|\| pnpm gen/u)
		expect(result.scripts['prepare:gen']).not.toMatch(/;\s*true\s*$/u)
		expect(result.scripts['prepare:gen']).not.toMatch(/\$CI/u)
	})

	it('emits packageManager derived from the host pnpm version', async () => {
		// Regression for #174 round 2 (#176): the kit's own `packageManager`
		// field is stripped by `pnpm pack` on publish, so it cannot be copied
		// through. A scaffolded package.json that has only
		// devEngines.packageManager (range) without a top-level packageManager
		// is rejected by Node v25 / pnpm 11 with "Invalid package manager
		// specification (pnpm@>=11.0.0-0); expected a semver version",
		// crashing the `pnpm install` step of `jgame init`. The fix detects
		// the host pnpm version at scaffold time so the emitted value is an
		// exact semver that the validation accepts.
		const { jgame_init } = await import('./jgame-init.ts')
		const result = JSON.parse(jgame_init.generate_package_json('my-game'))

		expect(result.packageManager).toBe(`pnpm@${MOCK_HOST_PNPM_VERSION}`)
	})

	it('derives a host-floor devEngines that the generated packageManager satisfies (#283)', async () => {
		// Regression for #283: the scaffold pinned `packageManager` to the host pnpm
		// (e.g. 11.5.1) but copied game-kit's EXACT `devEngines` version (11.5.0)
		// verbatim, so `pnpm install` aborted under `onFail: error` whenever the host
		// pnpm was not exactly 11.5.0. Deriving `>=<host>` keeps packageManager and
		// devEngines consistent by construction, regardless of game-kit's own pin.
		const { jgame_init } = await import('./jgame-init.ts')
		const result = JSON.parse(jgame_init.generate_package_json('my-game'))

		expect(result.packageManager).toBe(`pnpm@${MOCK_HOST_PNPM_VERSION}`)
		expect(result.devEngines.packageManager.version).toBe(`>=${MOCK_HOST_PNPM_VERSION}`)
		// name/onFail are preserved from game-kit; only the version is host-derived.
		expect(result.devEngines.packageManager.name).toBe('pnpm')
		expect(result.devEngines.packageManager.onFail).toBe('error')
	})

	it('emits the canonical Cloudflare Worker preview script (not vite preview)', async () => {
		// Regression for #135: vite preview bypasses the Worker runtime, so
		// hooks.server.ts (CSP, redirects, HTML injection) never executes and
		// Worker-runtime E2E silently breaks. The value must come from game-kit's
		// own package.json so the two paths cannot drift.
		const { jgame_init } = await import('./jgame-init.ts')
		const result = JSON.parse(jgame_init.generate_package_json('my-game'))

		expect(result.scripts.preview).toBe(CANONICAL_PREVIEW)
		expect(result.scripts.preview).not.toBe('vite preview')
	})
})

describe('jgame_init.derive_names', () => {
	it('derives all name forms from kebab input', async () => {
		const { jgame_init } = await import('./jgame-init.ts')
		const result = jgame_init.derive_names('tic-tac-toe')

		expect(result.kebab).toBe('tic-tac-toe')
		expect(result.display).toBe('Tic Tac Toe')
		expect(result.upper).toBe('TIC TAC TOE')
		expect(result.description).toBe('A Tic Tac Toe game')
		expect(result.app_label).toBe('Tic Tac Toe game')
	})

	it('normalizes space-separated input to kebab', async () => {
		const { jgame_init } = await import('./jgame-init.ts')
		const result = jgame_init.derive_names('my game')

		expect(result.kebab).toBe('my-game')
		expect(result.display).toBe('My Game')
	})

	it('normalizes uppercase input', async () => {
		const { jgame_init } = await import('./jgame-init.ts')
		const result = jgame_init.derive_names('MyGame')

		expect(result.kebab).toBe('mygame')
		expect(result.display).toBe('Mygame')
	})

	it('returns empty kebab for empty input', async () => {
		const { jgame_init } = await import('./jgame-init.ts')
		const result = jgame_init.derive_names('')

		expect(result.kebab).toBe('')
	})

	it('strips invalid characters', async () => {
		const { jgame_init } = await import('./jgame-init.ts')
		const result = jgame_init.derive_names('my_game!')

		expect(result.kebab).toBe('mygame')
	})
})

describe('jgame_init.generate_game_config', () => {
	it('produces valid TypeScript with correct values', async () => {
		const { jgame_init } = await import('./jgame-init.ts')
		const names = {
			kebab: 'tic-tac-toe',
			display: 'Tic Tac Toe',
			upper: 'TIC TAC TOE',
			description: 'A Tic Tac Toe game',
			app_label: 'Tic Tac Toe game',
		}
		const result = jgame_init.generate_game_config(names)

		expect(result).toContain("const GAME_NAME = 'tic-tac-toe'")
		expect(result).toContain("const GAME_NAME_DISPLAY = 'Tic Tac Toe'")
		expect(result).toContain("const GAME_NAME_UPPER = 'TIC TAC TOE'")
		expect(result).toContain("const GAME_DESCRIPTION = 'A Tic Tac Toe game'")
		expect(result).toContain("const GAME_APP_LABEL = 'Tic Tac Toe game'")
		expect(result).toContain('export { game_config }')
	})

	it('produces Game Kit defaults for game-kit name', async () => {
		const { jgame_init } = await import('./jgame-init.ts')
		const names = jgame_init.derive_names('game-kit')
		const result = jgame_init.generate_game_config(names)

		expect(result).toContain("const GAME_NAME = 'game-kit'")
		expect(result).toContain("const GAME_NAME_DISPLAY = 'Game Kit'")
		expect(result).toContain("const GAME_NAME_UPPER = 'GAME KIT'")
	})

	it('emits the game_config object across multiple lines so no line exceeds the print width (#260)', async () => {
		const { jgame_init } = await import('./jgame-init.ts')
		const names = jgame_init.derive_names('a-very-long-game-name-that-would-overflow')
		const result = jgame_init.generate_game_config(names)
		const longest = Math.max(...result.split('\n').map((line) => line.length))

		expect(longest).toBeLessThanOrEqual(MAX_LINE_LENGTH)
		expect(result).toContain('const game_config = {\n')
		expect(result).toContain('\tGAME_NAME,\n')
	})
})

async function setup_run_mocks(): Promise<void> {
	const { readFileSync, existsSync, readdirSync, statSync } = await import('node:fs')
	const { execSync } = await import('node:child_process')

	// Default to a clean target (does not exist) so the preflight guard (#273) is a no-op
	// for the happy-path scaffold tests; guard tests override existsSync/readdirSync/statSync.
	vi.mocked(existsSync).mockReturnValue(false)
	vi.mocked(readdirSync).mockReturnValue([])
	vi.mocked(statSync).mockReturnValue({ isDirectory: () => true } as unknown as ReturnType<
		typeof statSync
	>)
	vi.mocked(readFileSync).mockReturnValue(JSON.stringify(MOCK_PKG))
	vi.mocked(execSync).mockImplementation((command: string | Uint8Array) => {
		if (command === 'pnpm --version') return Buffer.from(`${MOCK_HOST_PNPM_VERSION}\n`)

		return Buffer.from('')
	})
	vi.spyOn(console, 'info').mockImplementation(() => {
		/* no-op */
	})
	vi.spyOn(console, 'error').mockImplementation(() => {
		/* no-op */
	})
	vi.spyOn(process, 'exit').mockImplementation(() => {
		throw new Error('process.exit called')
	})
}

describe('jgame_init.run', () => {
	beforeEach(setup_run_mocks)

	it('exits with code 1 when no name is given', async () => {
		const { jgame_init } = await import('./jgame-init.ts')

		expect(() => {
			jgame_init.run()
		}).toThrow('process.exit called')
		expect(process.exit).toHaveBeenCalledWith(1)
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining('game name is required'))
	})

	it('exits with code 1 when name normalizes to empty', async () => {
		const { jgame_init } = await import('./jgame-init.ts')

		expect(() => {
			jgame_init.run('!@#')
		}).toThrow('process.exit called')
		expect(process.exit).toHaveBeenCalledWith(1)
		expect(console.error).toHaveBeenCalledWith(
			expect.stringContaining('"!@#" is not a valid game name'),
		)
	})

	it('creates project subdirectory', async () => {
		const { mkdirSync } = await import('node:fs')
		const { jgame_init } = await import('./jgame-init.ts')

		jgame_init.run('tic-tac-toe')
		expect(mkdirSync).toHaveBeenCalledWith('/project/tic-tac-toe', { recursive: true })
	})

	it('writes package.json into project subdirectory', async () => {
		const { writeFileSync } = await import('node:fs')
		const { jgame_init } = await import('./jgame-init.ts')

		jgame_init.run('tic-tac-toe')
		expect(writeFileSync).toHaveBeenCalledWith(
			'/project/tic-tac-toe/package.json',
			expect.stringContaining('"name": "tic-tac-toe"'),
		)
	})

	it('writes game-config.ts into project subdirectory', async () => {
		const { writeFileSync } = await import('node:fs')
		const { jgame_init } = await import('./jgame-init.ts')

		jgame_init.run('tic-tac-toe')
		expect(writeFileSync).toHaveBeenCalledWith(
			'/project/tic-tac-toe/src/lib/game-config.ts',
			expect.stringContaining("const GAME_NAME = 'tic-tac-toe'"),
		)
	})

	it('never writes its own tsconfig.json — josh init owns it (#326)', async () => {
		// Regression for #326: jgame's old USER_TSCONFIG survived the kit's extends-merge,
		// keeping noEmitOnError:false against the kit base's true. tsconfig.json creation
		// is left entirely to `pnpm josh init --type sveltekit` (invocation covered above).
		const { writeFileSync } = await import('node:fs')
		const { jgame_init } = await import('./jgame-init.ts')

		jgame_init.run('tic-tac-toe')
		const written_paths = vi.mocked(writeFileSync).mock.calls.map(([target]) => String(target))

		expect(written_paths).not.toContain('/project/tic-tac-toe/tsconfig.json')
	})

	it('copies templates into project subdirectory', async () => {
		const { cpSync } = await import('node:fs')
		const { jgame_init } = await import('./jgame-init.ts')

		jgame_init.run('tic-tac-toe')
		expect(cpSync).toHaveBeenCalledWith('/pkg/templates', '/project/tic-tac-toe', {
			recursive: true,
			filter: expect.any(Function),
		})
	})

	it('copy_templates filter excludes tsconfig.json and npmrc', async () => {
		const { cpSync } = await import('node:fs')
		const { jgame_init } = await import('./jgame-init.ts')

		jgame_init.run('tic-tac-toe')
		const recursive_call = vi
			.mocked(cpSync)
			.mock.calls.find(([source]) => source === '/pkg/templates')
		const filter = recursive_call?.[2]?.filter
		if (typeof filter !== 'function') throw new Error('filter must be a function')
		expect(filter('/pkg/templates/tsconfig.json', '/project/tic-tac-toe/tsconfig.json')).toBe(false)
		expect(filter('/pkg/templates/npmrc', '/project/tic-tac-toe/npmrc')).toBe(false)
		expect(filter('/pkg/templates/src/app.html', '/project/tic-tac-toe/src/app.html')).toBe(true)
	})

	it('writes .npmrc from templates/npmrc to bypass npm dotfile exclusion', async () => {
		const { cpSync } = await import('node:fs')
		const { jgame_init } = await import('./jgame-init.ts')

		jgame_init.run('tic-tac-toe')
		expect(cpSync).toHaveBeenCalledWith('/pkg/templates/npmrc', '/project/tic-tac-toe/.npmrc')
	})

	it('copies byte-identical, import-decoupled files directly from the package root', async () => {
		// These files are single-sourced at the repo root and not imported by any
		// template file, so jgame init copies them straight from the installed
		// package — they cannot drift from a template because none exists.
		const { cpSync } = await import('node:fs')
		const { jgame_init } = await import('./jgame-init.ts')

		jgame_init.run('tic-tac-toe')
		expect(cpSync).toHaveBeenCalledWith(
			'/pkg/svelte.config.js',
			'/project/tic-tac-toe/svelte.config.js',
		)
		expect(cpSync).toHaveBeenCalledWith('/pkg/src/app.d.ts', '/project/tic-tac-toe/src/app.d.ts')
	})

	it('runs git init, pnpm install, pnpm josh init, and pnpm josh sync with project cwd', async () => {
		const { execSync } = await import('node:child_process')
		const { jgame_init } = await import('./jgame-init.ts')

		jgame_init.run('tic-tac-toe')
		const opts = expect.objectContaining({ cwd: '/project/tic-tac-toe' })

		expect(execSync).toHaveBeenCalledWith('git init', opts)
		expect(execSync).toHaveBeenCalledWith('pnpm install', opts)
		expect(execSync).toHaveBeenCalledWith('pnpm josh init --type sveltekit', opts)
		expect(execSync).toHaveBeenCalledWith('pnpm josh sync', opts)
	})

	it('invokes pnpm josh init before pnpm josh sync (#184)', async () => {
		// Regression for #184: `josh sync` early-returns when destination configs
		// do not exist, so eslint.config.js / prettier.config.js never get
		// scaffolded. `josh init` MUST run first to create them, then `josh sync`
		// updates anything already present.
		const { execSync } = await import('node:child_process')
		const { jgame_init } = await import('./jgame-init.ts')

		jgame_init.run('tic-tac-toe')
		const calls = vi.mocked(execSync).mock.calls.map(([cmd]) => cmd)
		const init_index = calls.indexOf('pnpm josh init --type sveltekit')
		const sync_index = calls.indexOf('pnpm josh sync')

		expect(init_index).toBeGreaterThan(-1)
		expect(sync_index).toBeGreaterThan(init_index)
	})

	it('overwrites the bare cspell.config.yaml with the game-aware import (#286)', async () => {
		// josh init writes a bare cspell.config.yaml that trips on every game-template word;
		// jgame init must rewrite it to pull the word set from @joshuafolkken/game-kit/cspell/game.
		const { writeFileSync } = await import('node:fs')
		const { jgame_init } = await import('./jgame-init.ts')

		jgame_init.run('tic-tac-toe')
		expect(writeFileSync).toHaveBeenCalledWith(
			'/project/tic-tac-toe/cspell.config.yaml',
			expect.stringContaining('@joshuafolkken/game-kit/cspell/game'),
		)
	})

	it('prints next-steps message with cd and pnpm dev', async () => {
		const { jgame_init } = await import('./jgame-init.ts')

		jgame_init.run('tic-tac-toe')
		const calls = vi.mocked(console.info).mock.calls.flat().join('\n')

		expect(calls).toContain('cd tic-tac-toe')
		expect(calls).toContain('pnpm dev')
	})
})

describe('jgame_init.run preflight guard (#273)', () => {
	// Clear accumulated mock-call history so `not.toHaveBeenCalled()` assertions see a
	// clean slate (the other run() tests share the same vi.fn instances across the file).
	beforeEach(async () => {
		vi.clearAllMocks()
		await setup_run_mocks()
	})

	it('refuses to scaffold into an existing non-empty directory before any writes', async () => {
		// Regression for #273: a name collision must not silently overwrite real user files.
		const { existsSync, readdirSync, mkdirSync, writeFileSync, cpSync } = await import('node:fs')
		const { execSync } = await import('node:child_process')

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readdirSync).mockReturnValue(['package.json'] as unknown as ReturnType<
			typeof readdirSync
		>)
		const { jgame_init } = await import('./jgame-init.ts')

		expect(() => {
			jgame_init.run('tic-tac-toe')
		}).toThrow('process.exit called')
		expect(process.exit).toHaveBeenCalledWith(1)
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining('already exists'))
		// No mutation may happen once the guard fires.
		expect(mkdirSync).not.toHaveBeenCalled()
		expect(writeFileSync).not.toHaveBeenCalled()
		expect(cpSync).not.toHaveBeenCalled()
		expect(execSync).not.toHaveBeenCalledWith('git init', expect.anything())
	})

	it('refuses with a friendly error when the target path is an existing file, not a directory', async () => {
		// A file named like the kebab name must not crash with a raw ENOTDIR from readdirSync;
		// the isDirectory() short-circuit routes it to the same friendly guard error.
		const { existsSync, statSync, mkdirSync } = await import('node:fs')

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(statSync).mockReturnValue({ isDirectory: () => false } as unknown as ReturnType<
			typeof statSync
		>)
		const { jgame_init } = await import('./jgame-init.ts')

		expect(() => {
			jgame_init.run('tic-tac-toe')
		}).toThrow('process.exit called')
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining('already exists'))
		expect(mkdirSync).not.toHaveBeenCalled()
	})

	it('proceeds when the target directory exists but is empty', async () => {
		const { existsSync, readdirSync, statSync, mkdirSync } = await import('node:fs')
		const { jgame_init } = await import('./jgame-init.ts')

		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(statSync).mockReturnValue({ isDirectory: () => true } as unknown as ReturnType<
			typeof statSync
		>)
		vi.mocked(readdirSync).mockReturnValue([])

		jgame_init.run('tic-tac-toe')
		expect(mkdirSync).toHaveBeenCalledWith('/project/tic-tac-toe', { recursive: true })
	})
})
