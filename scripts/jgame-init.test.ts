import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('node:fs', () => ({
	cpSync: vi.fn(),
	mkdirSync: vi.fn(),
	readFileSync: vi.fn(),
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

const MOCK_PKG = {
	version: '1.0.0',
	scripts: { preview: CANONICAL_PREVIEW },
	devDependencies: {
		'@joshuafolkken/kit': '0.162.0',
		'@sveltejs/kit': '^2.0.0',
		svelte: '^5.0.0',
		vite: '^6.0.0',
	},
	devEngines: { packageManager: { name: 'pnpm', version: '>=11.0.0-0', onFail: 'error' } },
}

describe('jgame_init.generate_package_json', () => {
	beforeEach(async () => {
		const { readFileSync } = await import('node:fs')
		vi.mocked(readFileSync).mockReturnValue(JSON.stringify(MOCK_PKG))
	})

	it('includes game-kit as dependency with current version', async () => {
		const { jgame_init } = await import('./jgame-init.ts')
		const result = JSON.parse(jgame_init.generate_package_json('my-game'))
		expect(result.dependencies['@joshuafolkken/game-kit']).toBe('^1.0.0')
	})

	it('uses supplied game name as package name', async () => {
		const { jgame_init } = await import('./jgame-init.ts')
		const result = JSON.parse(jgame_init.generate_package_json('tic-tac-toe'))
		expect(result.name).toBe('tic-tac-toe')
	})

	it('includes kit in devDependencies', async () => {
		const { jgame_init } = await import('./jgame-init.ts')
		const result = JSON.parse(jgame_init.generate_package_json('my-game'))
		expect(result.devDependencies['@joshuafolkken/kit']).toBe('0.162.0')
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

describe('jgame_init.generate_tsconfig', () => {
	it('extends .svelte-kit/tsconfig.json', async () => {
		const { jgame_init } = await import('./jgame-init.ts')
		const result = JSON.parse(jgame_init.generate_tsconfig())
		expect(result.extends).toContain('./.svelte-kit/tsconfig.json')
	})

	it('enables strict mode', async () => {
		const { jgame_init } = await import('./jgame-init.ts')
		const result = JSON.parse(jgame_init.generate_tsconfig())
		expect(result.compilerOptions.strict).toBe(true)
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
})

describe('jgame_init.run', () => {
	beforeEach(async () => {
		const { readFileSync } = await import('node:fs')
		vi.mocked(readFileSync).mockReturnValue(JSON.stringify(MOCK_PKG))
		vi.spyOn(console, 'info').mockImplementation(() => {})
		vi.spyOn(console, 'error').mockImplementation(() => {})
		vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit called')
		})
	})

	it('exits with code 1 when no name is given', async () => {
		const { jgame_init } = await import('./jgame-init.ts')
		expect(() => jgame_init.run()).toThrow('process.exit called')
		expect(process.exit).toHaveBeenCalledWith(1)
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining('game name is required'))
	})

	it('exits with code 1 when name normalizes to empty', async () => {
		const { jgame_init } = await import('./jgame-init.ts')
		expect(() => jgame_init.run('!@#')).toThrow('process.exit called')
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

	it('writes tsconfig.json into project subdirectory', async () => {
		const { writeFileSync } = await import('node:fs')
		const { jgame_init } = await import('./jgame-init.ts')
		jgame_init.run('tic-tac-toe')
		expect(writeFileSync).toHaveBeenCalledWith(
			'/project/tic-tac-toe/tsconfig.json',
			expect.stringContaining('.svelte-kit/tsconfig.json'),
		)
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
		const recursive_call = vi.mocked(cpSync).mock.calls.find(([src]) => src === '/pkg/templates')
		const filter = recursive_call?.[2]?.filter
		if (typeof filter !== 'function') throw new Error('filter must be a function')
		expect(filter('/pkg/templates/tsconfig.json', '/project/tic-tac-toe/tsconfig.json')).toBe(false)
		expect(filter('/pkg/templates/npmrc', '/project/tic-tac-toe/npmrc')).toBe(false)
		expect(filter('/pkg/templates/svelte.config.js', '/project/tic-tac-toe/svelte.config.js')).toBe(
			true,
		)
	})

	it('writes .npmrc from templates/npmrc to bypass npm dotfile exclusion', async () => {
		const { cpSync } = await import('node:fs')
		const { jgame_init } = await import('./jgame-init.ts')
		jgame_init.run('tic-tac-toe')
		expect(cpSync).toHaveBeenCalledWith('/pkg/templates/npmrc', '/project/tic-tac-toe/.npmrc')
	})

	it('runs git init, pnpm install, and pnpm josh sync with project cwd', async () => {
		const { execSync } = await import('node:child_process')
		const { jgame_init } = await import('./jgame-init.ts')
		jgame_init.run('tic-tac-toe')
		const opts = expect.objectContaining({ cwd: '/project/tic-tac-toe' })
		expect(execSync).toHaveBeenCalledWith('git init', opts)
		expect(execSync).toHaveBeenCalledWith('pnpm install', opts)
		expect(execSync).toHaveBeenCalledWith('pnpm josh sync', opts)
	})

	it('prints next-steps message with cd and pnpm dev', async () => {
		const { jgame_init } = await import('./jgame-init.ts')
		jgame_init.run('tic-tac-toe')
		const calls = vi.mocked(console.info).mock.calls.flat().join('\n')
		expect(calls).toContain('cd tic-tac-toe')
		expect(calls).toContain('pnpm dev')
	})
})
