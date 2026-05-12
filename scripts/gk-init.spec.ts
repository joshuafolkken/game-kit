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
		const result = JSON.parse(gk_init.generate_package_json('my-game'))
		expect(result.dependencies['@joshuafolkken/game-kit']).toBe('^1.0.0')
	})

	it('uses supplied game name as package name', async () => {
		const { gk_init } = await import('./gk-init.ts')
		const result = JSON.parse(gk_init.generate_package_json('tic-tac-toe'))
		expect(result.name).toBe('tic-tac-toe')
	})

	it('includes kit in devDependencies', async () => {
		const { gk_init } = await import('./gk-init.ts')
		const result = JSON.parse(gk_init.generate_package_json('my-game'))
		expect(result.devDependencies['@joshuafolkken/kit']).toBe('0.162.0')
	})

	it('preserves pnpm overrides', async () => {
		const { gk_init } = await import('./gk-init.ts')
		const result = JSON.parse(gk_init.generate_package_json('my-game'))
		expect(result.pnpm.overrides['cookie']).toBe('^0.7.0')
	})

	it('includes required scripts', async () => {
		const { gk_init } = await import('./gk-init.ts')
		const result = JSON.parse(gk_init.generate_package_json('my-game'))
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

describe('gk_init.derive_names', () => {
	it('derives all name forms from kebab input', async () => {
		const { gk_init } = await import('./gk-init.ts')
		const result = gk_init.derive_names('tic-tac-toe')
		expect(result.kebab).toBe('tic-tac-toe')
		expect(result.display).toBe('Tic Tac Toe')
		expect(result.upper).toBe('TIC TAC TOE')
		expect(result.description).toBe('A Tic Tac Toe game')
		expect(result.app_label).toBe('Tic Tac Toe game')
	})

	it('normalizes space-separated input to kebab', async () => {
		const { gk_init } = await import('./gk-init.ts')
		const result = gk_init.derive_names('my game')
		expect(result.kebab).toBe('my-game')
		expect(result.display).toBe('My Game')
	})

	it('normalizes uppercase input', async () => {
		const { gk_init } = await import('./gk-init.ts')
		const result = gk_init.derive_names('MyGame')
		expect(result.kebab).toBe('mygame')
		expect(result.display).toBe('Mygame')
	})

	it('falls back to game-kit for empty input', async () => {
		const { gk_init } = await import('./gk-init.ts')
		const result = gk_init.derive_names('')
		expect(result.kebab).toBe('game-kit')
		expect(result.display).toBe('Game Kit')
	})

	it('strips invalid characters', async () => {
		const { gk_init } = await import('./gk-init.ts')
		const result = gk_init.derive_names('my_game!')
		expect(result.kebab).toBe('mygame')
	})
})

describe('gk_init.generate_game_config', () => {
	it('produces valid TypeScript with correct values', async () => {
		const { gk_init } = await import('./gk-init.ts')
		const names = {
			kebab: 'tic-tac-toe',
			display: 'Tic Tac Toe',
			upper: 'TIC TAC TOE',
			description: 'A Tic Tac Toe game',
			app_label: 'Tic Tac Toe game',
		}
		const result = gk_init.generate_game_config(names)
		expect(result).toContain("const GAME_NAME = 'tic-tac-toe'")
		expect(result).toContain("const GAME_NAME_DISPLAY = 'Tic Tac Toe'")
		expect(result).toContain("const GAME_NAME_UPPER = 'TIC TAC TOE'")
		expect(result).toContain("const GAME_DESCRIPTION = 'A Tic Tac Toe game'")
		expect(result).toContain("const GAME_APP_LABEL = 'Tic Tac Toe game'")
		expect(result).toContain('export { game_config }')
	})

	it('produces Game Kit defaults for game-kit name', async () => {
		const { gk_init } = await import('./gk-init.ts')
		const names = gk_init.derive_names('game-kit')
		const result = gk_init.generate_game_config(names)
		expect(result).toContain("const GAME_NAME = 'game-kit'")
		expect(result).toContain("const GAME_NAME_DISPLAY = 'Game Kit'")
		expect(result).toContain("const GAME_NAME_UPPER = 'GAME KIT'")
	})
})

describe('gk_init.run', () => {
	beforeEach(async () => {
		const { readFileSync } = await import('node:fs')
		vi.mocked(readFileSync).mockReturnValue(JSON.stringify(MOCK_PKG))
		vi.spyOn(console, 'info').mockImplementation(() => {})
	})

	it('uses game name in package.json when provided', async () => {
		const { writeFileSync } = await import('node:fs')
		const { gk_init } = await import('./gk-init.ts')
		gk_init.run('tic-tac-toe')
		expect(writeFileSync).toHaveBeenCalledWith(
			'/project/package.json',
			expect.stringContaining('"name": "tic-tac-toe"'),
		)
	})

	it('uses game-kit as default name when no argument given', async () => {
		const { writeFileSync } = await import('node:fs')
		const { gk_init } = await import('./gk-init.ts')
		gk_init.run()
		expect(writeFileSync).toHaveBeenCalledWith(
			'/project/package.json',
			expect.stringContaining('"name": "game-kit"'),
		)
	})

	it('writes game-config.ts to src/lib/', async () => {
		const { writeFileSync } = await import('node:fs')
		const { gk_init } = await import('./gk-init.ts')
		gk_init.run('tic-tac-toe')
		expect(writeFileSync).toHaveBeenCalledWith(
			'/project/src/lib/game-config.ts',
			expect.stringContaining("const GAME_NAME = 'tic-tac-toe'"),
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
