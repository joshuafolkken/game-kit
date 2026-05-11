import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('node:fs', () => ({
	cpSync: vi.fn(),
	readFileSync: vi.fn(),
	writeFileSync: vi.fn(),
}))
vi.mock('node:child_process', () => ({ execSync: vi.fn() }))
vi.mock('./gk-paths.ts', () => ({
	gk_paths: {
		PACKAGE_DIR: '/pkg',
		TEMPLATES_DIR: '/pkg/templates',
		PROJECT_ROOT: '/project',
	},
}))

const MOCK_PKG = {
	version: '1.0.0',
	devDependencies: {
		'@joshuafolkken/kit': '0.162.0',
		'@sveltejs/kit': '^2.0.0',
		svelte: '^5.0.0',
		vite: '^6.0.0',
	},
	devEngines: { packageManager: { name: 'pnpm', version: '>=11.0.0-0', onFail: 'error' } },
	pnpm: { overrides: { cookie: '^0.7.0' } },
}

describe('gk_init.generate_package_json', () => {
	beforeEach(async () => {
		const { readFileSync } = await import('node:fs')
		vi.mocked(readFileSync).mockReturnValue(JSON.stringify(MOCK_PKG))
	})

	it('includes game-kit as dependency with current version', async () => {
		const { gk_init } = await import('./gk-init.ts')
		const result = JSON.parse(gk_init.generate_package_json())
		expect(result.dependencies['@joshuafolkken/game-kit']).toBe('^1.0.0')
	})

	it('includes kit in devDependencies', async () => {
		const { gk_init } = await import('./gk-init.ts')
		const result = JSON.parse(gk_init.generate_package_json())
		expect(result.devDependencies['@joshuafolkken/kit']).toBe('0.162.0')
	})

	it('preserves pnpm overrides', async () => {
		const { gk_init } = await import('./gk-init.ts')
		const result = JSON.parse(gk_init.generate_package_json())
		expect(result.pnpm.overrides['cookie']).toBe('^0.7.0')
	})

	it('includes required scripts', async () => {
		const { gk_init } = await import('./gk-init.ts')
		const result = JSON.parse(gk_init.generate_package_json())
		expect(result.scripts.dev).toBe('vite dev')
		expect(result.scripts.gk).toBe('gk')
		expect(result.scripts.josh).toBe('josh')
	})
})

describe('gk_init.generate_tsconfig', () => {
	it('extends .svelte-kit/tsconfig.json', async () => {
		const { gk_init } = await import('./gk-init.ts')
		const result = JSON.parse(gk_init.generate_tsconfig())
		expect(result.extends).toContain('./.svelte-kit/tsconfig.json')
	})

	it('enables strict mode', async () => {
		const { gk_init } = await import('./gk-init.ts')
		const result = JSON.parse(gk_init.generate_tsconfig())
		expect(result.compilerOptions.strict).toBe(true)
	})
})

describe('gk_init.run', () => {
	beforeEach(async () => {
		const { readFileSync } = await import('node:fs')
		vi.mocked(readFileSync).mockReturnValue(JSON.stringify(MOCK_PKG))
		vi.spyOn(console, 'info').mockImplementation(() => {})
	})

	it('writes package.json to PROJECT_ROOT', async () => {
		const { writeFileSync } = await import('node:fs')
		const { gk_init } = await import('./gk-init.ts')
		gk_init.run()
		expect(writeFileSync).toHaveBeenCalledWith(
			'/project/package.json',
			expect.stringContaining('"name": "my-game"'),
		)
	})

	it('copies templates to PROJECT_ROOT excluding tsconfig.json', async () => {
		const { cpSync } = await import('node:fs')
		const { gk_init } = await import('./gk-init.ts')
		gk_init.run()
		expect(cpSync).toHaveBeenCalledWith('/pkg/templates', '/project', {
			recursive: true,
			filter: expect.any(Function),
		})
	})

	it('writes tsconfig.json to PROJECT_ROOT', async () => {
		const { writeFileSync } = await import('node:fs')
		const { gk_init } = await import('./gk-init.ts')
		gk_init.run()
		expect(writeFileSync).toHaveBeenCalledWith(
			'/project/tsconfig.json',
			expect.stringContaining('.svelte-kit/tsconfig.json'),
		)
	})

	it('runs git init, pnpm install, and pnpm josh sync', async () => {
		const { execSync } = await import('node:child_process')
		const { gk_init } = await import('./gk-init.ts')
		gk_init.run()
		expect(execSync).toHaveBeenCalledWith('git init', expect.any(Object))
		expect(execSync).toHaveBeenCalledWith('pnpm install', expect.any(Object))
		expect(execSync).toHaveBeenCalledWith('pnpm josh sync', expect.any(Object))
	})
})
