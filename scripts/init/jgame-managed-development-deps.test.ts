import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('node:fs', () => ({ readFileSync: vi.fn() }))
vi.mock('./jgame-paths.ts', () => ({
	jgame_paths: {
		PACKAGE_DIR: '/pkg',
		TEMPLATES_DIR: '/pkg/templates',
		PROJECT_ROOT: '/project',
	},
}))

const KIT_DEV_DEPS = {
	'@joshuafolkken/kit': '0.162.0',
	'@playwright/test': '1.60.0',
	'@vitest/browser-playwright': '^4.1.8',
	cspell: '^10.0.0',
	eslint: '^10.4.0',
	lefthook: '^2.1.9',
	playwright: '^1.60.0',
	prettier: '^3.8.3',
	'prettier-plugin-svelte': '^4.0.1',
	'prettier-plugin-tailwindcss': '^0.8.0',
	'@ianvs/prettier-plugin-sort-imports': '^4.7.1',
	'@sveltejs/kit': '^2.0.0',
	svelte: '^5.0.0',
	tsx: '^4.22.4',
	vite: '^6.0.0',
	vitest: '^4.1.8',
	'vitest-browser-svelte': '^2.1.1',
}

describe('jgame_managed_dev_deps.REQUIRED_DEV_DEPS', () => {
	it('includes the lint/format toolchain that kit declares only as devDeps (#184)', async () => {
		const { jgame_managed_dev_deps } = await import('./jgame-managed-development-deps.ts')
		const required = jgame_managed_dev_deps.REQUIRED_DEV_DEPS

		expect(required).toContain('prettier')
		expect(required).toContain('eslint')
		expect(required).toContain('prettier-plugin-svelte')
		expect(required).toContain('prettier-plugin-tailwindcss')
		expect(required).toContain('@ianvs/prettier-plugin-sort-imports')
		expect(required).toContain('cspell')
	})

	it('includes app-kit so scaffolds resolve the app-kit/*/sveltekit presets (#355)', async () => {
		// The scaffold's eslint.config.js imports `@joshuafolkken/app-kit/eslint/sveltekit`
		// and its cspell dictionary chains `@joshuafolkken/app-kit/cspell/sveltekit`, so
		// app-kit must be a direct devDep of every scaffolded project to resolve them.
		const { jgame_managed_dev_deps } = await import('./jgame-managed-development-deps.ts')
		const required = jgame_managed_dev_deps.REQUIRED_DEV_DEPS

		expect(required).toContain('@joshuafolkken/app-kit')
	})

	it('caret-normalizes app-kit so scaffolds receive patch/minor presets updates (#355)', async () => {
		const { jgame_managed_dev_deps } = await import('./jgame-managed-development-deps.ts')
		const result = jgame_managed_dev_deps.pick_required_deps({
			...KIT_DEV_DEPS,
			'@joshuafolkken/app-kit': '0.18.0',
		})

		expect(result['@joshuafolkken/app-kit']).toBe('^0.18.0')
	})

	it('includes lefthook + tsx so the generated prepare guards have tools to run (#272)', async () => {
		// Regression for #272: the scaffold's `prepare` runs
		// `command -v lefthook ... && lefthook install` and
		// `command -v tsx ... && tsx fix-gh-packages.ts`. Without these as direct
		// devDeps the guards skip silently, so git hooks and the GH Packages lockfile
		// fix never run in scaffolded projects.
		const { jgame_managed_dev_deps } = await import('./jgame-managed-development-deps.ts')
		const required = jgame_managed_dev_deps.REQUIRED_DEV_DEPS

		expect(required).toContain('lefthook')
		expect(required).toContain('tsx')
	})

	it('resolves lefthook + tsx to pinned versions, never the wildcard fallback (#272)', async () => {
		// game-kit MUST declare lefthook + tsx in its own devDependencies so the
		// pinned versions flow into scaffolds; a `*` here means the source pin is missing.
		const { jgame_managed_dev_deps } = await import('./jgame-managed-development-deps.ts')
		const result = jgame_managed_dev_deps.pick_required_deps(KIT_DEV_DEPS)

		expect(result.lefthook).toBe('^2.1.9')
		expect(result.tsx).toBe('^4.22.4')
	})

	it('includes the vitest browser-mode toolchain backing the synced vite.config.ts test block (#322)', async () => {
		// Regression for #322: the synced vite.config.ts imports `vitest/config` and
		// `@vitest/browser-playwright`, and its client project runs in chromium via
		// playwright. Without these as direct devDeps `josh test:unit` (a plain
		// `vitest run`) fails in scaffolded projects after a sync.
		const { jgame_managed_dev_deps } = await import('./jgame-managed-development-deps.ts')
		const required = jgame_managed_dev_deps.REQUIRED_DEV_DEPS

		expect(required).toContain('vitest')
		expect(required).toContain('@vitest/browser-playwright')
		expect(required).toContain('vitest-browser-svelte')
		expect(required).toContain('@playwright/test')
		expect(required).toContain('playwright')
	})

	it('resolves the vitest browser-mode toolchain to pinned versions, never the wildcard fallback (#322)', async () => {
		// game-kit MUST declare the toolchain in its own devDependencies so pinned
		// versions flow into scaffolds; a `*` here means the source pin is missing.
		const { jgame_managed_dev_deps } = await import('./jgame-managed-development-deps.ts')
		const result = jgame_managed_dev_deps.pick_required_deps(KIT_DEV_DEPS)

		expect(result.vitest).toBe('^4.1.8')
		expect(result['@vitest/browser-playwright']).toBe('^4.1.8')
		expect(result['vitest-browser-svelte']).toBe('^2.1.1')
		expect(result['@playwright/test']).toBe('^1.60.0')
		expect(result.playwright).toBe('^1.60.0')
	})

	it('stays alphabetically sorted so additions are insertion-stable', async () => {
		const { jgame_managed_dev_deps } = await import('./jgame-managed-development-deps.ts')
		const required = [...jgame_managed_dev_deps.REQUIRED_DEV_DEPS]
		const sorted = [...required].toSorted((left, right) => left.localeCompare(right))

		expect(required).toEqual(sorted)
	})
})

describe('jgame_managed_dev_deps.pick_required_deps', () => {
	it('resolves versions from the supplied source map', async () => {
		const { jgame_managed_dev_deps } = await import('./jgame-managed-development-deps.ts')
		const result = jgame_managed_dev_deps.pick_required_deps(KIT_DEV_DEPS)

		expect(result.prettier).toBe('^3.8.3')
		expect(result.eslint).toBe('^10.4.0')
	})

	it('caret-normalizes exact pins so consumers can receive patch/minor updates (#326)', async () => {
		// Regression for #326: game-kit exact-pins @joshuafolkken/kit (and @playwright/test)
		// for its own toolchain; copying those verbatim froze freshly-init'd projects on one
		// version while every other managed dep was caret-ranged.
		const { jgame_managed_dev_deps } = await import('./jgame-managed-development-deps.ts')
		const result = jgame_managed_dev_deps.pick_required_deps(KIT_DEV_DEPS)

		expect(result['@joshuafolkken/kit']).toBe('^0.162.0')
		expect(result['@playwright/test']).toBe('^1.60.0')
	})

	it('passes existing ranges through unchanged (#326)', async () => {
		const { jgame_managed_dev_deps } = await import('./jgame-managed-development-deps.ts')
		const source: Record<string, string> = {
			eslint: '^10.4.0',
			prettier: '~3.8.3',
			svelte: '>=5.0.0',
		}
		const result = jgame_managed_dev_deps.pick_required_deps(source)

		expect(result.eslint).toBe('^10.4.0')
		expect(result.prettier).toBe('~3.8.3')
		expect(result.svelte).toBe('>=5.0.0')
		// Missing deps still fall back to the wildcard, never to a caret-wrapped wildcard.
		expect(result.vite).toBe('*')
	})

	it('falls back to wildcard when the source is missing a required dep', async () => {
		const { jgame_managed_dev_deps } = await import('./jgame-managed-development-deps.ts')
		const partial: Record<string, string> = { prettier: '^3.8.3' }
		const result = jgame_managed_dev_deps.pick_required_deps(partial)

		expect(result.prettier).toBe('^3.8.3')
		expect(result.eslint).toBe('*')
	})

	it('emits every required key in the output', async () => {
		const { jgame_managed_dev_deps } = await import('./jgame-managed-development-deps.ts')
		const result = jgame_managed_dev_deps.pick_required_deps(KIT_DEV_DEPS)

		for (const key of jgame_managed_dev_deps.REQUIRED_DEV_DEPS) {
			expect(result[key]).toBeDefined()
		}
	})
})

describe('jgame_managed_dev_deps.read_required_deps_from_kit', () => {
	beforeEach(async () => {
		const { readFileSync } = await import('node:fs')

		vi.mocked(readFileSync).mockReset()
	})

	it('reads game-kit package.json from PACKAGE_DIR and resolves versions', async () => {
		const { readFileSync } = await import('node:fs')

		vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ devDependencies: KIT_DEV_DEPS }))
		const { jgame_managed_dev_deps } = await import('./jgame-managed-development-deps.ts')
		const result = jgame_managed_dev_deps.read_required_deps_from_kit()

		expect(readFileSync).toHaveBeenCalledWith('/pkg/package.json', 'utf8')
		expect(result.prettier).toBe('^3.8.3')
	})

	it('falls back to wildcard for every required dep when kit has no devDependencies', async () => {
		const { readFileSync } = await import('node:fs')

		vi.mocked(readFileSync).mockReturnValue(JSON.stringify({}))
		const { jgame_managed_dev_deps } = await import('./jgame-managed-development-deps.ts')
		const result = jgame_managed_dev_deps.read_required_deps_from_kit()

		for (const key of jgame_managed_dev_deps.REQUIRED_DEV_DEPS) {
			expect(result[key]).toBe('*')
		}
	})
})
