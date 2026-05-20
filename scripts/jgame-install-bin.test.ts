import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('node:fs', () => ({
	chmodSync: vi.fn(),
	existsSync: vi.fn(),
	mkdirSync: vi.fn(),
	readFileSync: vi.fn(),
	writeFileSync: vi.fn(),
}))
vi.mock('node:os', () => ({ default: { homedir: vi.fn(() => '/home/u') } }))

const ORIGINAL_ENV_SNAPSHOT = { ...process.env }
const ORIGINAL_ENV_REF = process.env

function reset_env_then_apply(overrides: Record<string, string | undefined>): void {
	process.env = { ...ORIGINAL_ENV_SNAPSHOT }
	delete process.env['INIT_CWD']
	for (const [key, value] of Object.entries(overrides)) {
		if (value === undefined) delete process.env[key]
		else process.env[key] = value
	}
}

describe('jgame_install_bin.run', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.spyOn(console, 'info').mockImplementation(() => {})
		vi.spyOn(console, 'error').mockImplementation(() => {})
		vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit called')
		})
		reset_env_then_apply({ PATH: '/home/u/.local/bin:/usr/bin' })
	})

	afterEach(() => {
		process.env = ORIGINAL_ENV_REF
	})

	it('skips installation when INIT_CWD differs from package directory (dependency install)', async () => {
		const { writeFileSync } = await import('node:fs')
		reset_env_then_apply({ INIT_CWD: '/some/consumer/project' })
		const { jgame_install_bin } = await import('./jgame-install-bin.ts')
		jgame_install_bin.run({ force: false })
		expect(writeFileSync).not.toHaveBeenCalled()
		expect(console.info).toHaveBeenCalledWith(expect.stringContaining('skipped'))
	})

	it('writes wrapper with mode 0o755 when target does not exist', async () => {
		const { chmodSync, existsSync, writeFileSync } = await import('node:fs')
		vi.mocked(existsSync).mockReturnValue(false)
		const { jgame_install_bin } = await import('./jgame-install-bin.ts')
		jgame_install_bin.run({ force: false })
		expect(writeFileSync).toHaveBeenCalledWith(
			'/home/u/.local/bin/jgame',
			expect.stringContaining('#!/bin/sh'),
		)
		expect(writeFileSync).toHaveBeenCalledWith(
			'/home/u/.local/bin/jgame',
			expect.stringContaining('exec "node"'),
		)
		expect(chmodSync).toHaveBeenCalledWith('/home/u/.local/bin/jgame', 0o755)
	})

	it('overwrites when existing file carries the jgame marker', async () => {
		const { existsSync, readFileSync, writeFileSync } = await import('node:fs')
		const { jgame_install_bin_logic } = await import('./jgame-install-bin-logic.ts')
		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockReturnValue(
			`#!/bin/sh\n${jgame_install_bin_logic.WRAPPER_MARKER}\nexec ...`,
		)
		const { jgame_install_bin } = await import('./jgame-install-bin.ts')
		jgame_install_bin.run({ force: false })
		expect(writeFileSync).toHaveBeenCalled()
	})

	it('refuses to overwrite a non-jgame existing file and exits non-zero', async () => {
		const { existsSync, readFileSync, writeFileSync } = await import('node:fs')
		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockReturnValue('#!/bin/sh\nexec /usr/local/bin/other-tool "$@"\n')
		const { jgame_install_bin } = await import('./jgame-install-bin.ts')
		expect(() => jgame_install_bin.run({ force: false })).toThrow('process.exit called')
		expect(writeFileSync).not.toHaveBeenCalled()
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Refusing to overwrite'))
		expect(process.exit).toHaveBeenCalledWith(1)
	})

	it('overwrites a non-jgame existing file when --force is passed', async () => {
		const { existsSync, readFileSync, writeFileSync } = await import('node:fs')
		vi.mocked(existsSync).mockReturnValue(true)
		vi.mocked(readFileSync).mockReturnValue('#!/bin/sh\nexec /usr/local/bin/other-tool "$@"\n')
		const { jgame_install_bin } = await import('./jgame-install-bin.ts')
		jgame_install_bin.run({ force: true })
		expect(writeFileSync).toHaveBeenCalled()
	})

	it('emits a PATH hint when ~/.local/bin is not on PATH', async () => {
		const { existsSync } = await import('node:fs')
		vi.mocked(existsSync).mockReturnValue(false)
		reset_env_then_apply({ PATH: '/usr/bin:/usr/local/bin' })
		const { jgame_install_bin } = await import('./jgame-install-bin.ts')
		jgame_install_bin.run({ force: false })
		expect(console.info).toHaveBeenCalledWith(expect.stringContaining('export PATH='))
	})

	it('does not emit a PATH hint when ~/.local/bin is already on PATH', async () => {
		const { existsSync } = await import('node:fs')
		vi.mocked(existsSync).mockReturnValue(false)
		reset_env_then_apply({ PATH: '/home/u/.local/bin:/usr/bin' })
		const { jgame_install_bin } = await import('./jgame-install-bin.ts')
		jgame_install_bin.run({ force: false })
		const hint_calls = vi
			.mocked(console.info)
			.mock.calls.flat()
			.filter((c) => String(c).includes('export PATH='))
		expect(hint_calls).toHaveLength(0)
	})
})
