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
	cspell: '^10.0.0',
	eslint: '^10.4.0',
	prettier: '^3.8.3',
	'prettier-plugin-svelte': '^4.0.1',
	'prettier-plugin-tailwindcss': '^0.8.0',
	'@ianvs/prettier-plugin-sort-imports': '^4.7.1',
	'@sveltejs/kit': '^2.0.0',
	svelte: '^5.0.0',
	vite: '^6.0.0',
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
		expect(result['@joshuafolkken/kit']).toBe('0.162.0')
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
