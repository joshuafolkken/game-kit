import { describe, expect, it } from 'vitest'
import { jgame_install_bin_logic } from './jgame-install-bin-logic.ts'

describe('jgame_install_bin_logic.resolve_local_bin_directory', () => {
	it('returns <home>/.local/bin', () => {
		expect(jgame_install_bin_logic.resolve_local_bin_directory('/home/u')).toBe(
			'/home/u/.local/bin',
		)
	})
})

describe('jgame_install_bin_logic.resolve_bin_path', () => {
	it('returns <home>/.local/bin/jgame', () => {
		expect(jgame_install_bin_logic.resolve_bin_path('/home/u')).toBe('/home/u/.local/bin/jgame')
	})
})

describe('jgame_install_bin_logic.resolve_jgame_script_path', () => {
	it('returns <pkg>/dist/scripts/jgame.js', () => {
		expect(jgame_install_bin_logic.resolve_jgame_script_path('/pkg')).toBe(
			'/pkg/dist/scripts/jgame.js',
		)
	})
})

describe('jgame_install_bin_logic.resolve_node_command', () => {
	it('returns the bare node command (resolved via PATH at runtime)', () => {
		expect(jgame_install_bin_logic.resolve_node_command()).toBe('node')
	})
})

describe('jgame_install_bin_logic.generate_wrapper_script', () => {
	it('produces a sh shebang followed by the managed marker and exec line', () => {
		const result = jgame_install_bin_logic.generate_wrapper_script({
			node_command: 'node',
			jgame_script_path: '/pkg/dist/scripts/jgame.js',
		})
		expect(result).toContain('#!/bin/sh')
		expect(result).toContain(jgame_install_bin_logic.WRAPPER_MARKER)
		expect(result).toContain('exec "node" "/pkg/dist/scripts/jgame.js" "$@"')
		expect(result.endsWith('\n')).toBe(true)
	})

	it('throws when node_command contains a double quote', () => {
		expect(() =>
			jgame_install_bin_logic.generate_wrapper_script({
				node_command: 'no"de',
				jgame_script_path: '/ok/jgame.js',
			}),
		).toThrow('embedded double-quotes')
	})

	it('throws when jgame_script_path contains a double quote', () => {
		expect(() =>
			jgame_install_bin_logic.generate_wrapper_script({
				node_command: 'node',
				jgame_script_path: '/pkg/with"quote/jgame.js',
			}),
		).toThrow('embedded double-quotes')
	})
})

describe('jgame_install_bin_logic.is_dependency_install', () => {
	it('returns false when INIT_CWD is empty (no info)', () => {
		expect(jgame_install_bin_logic.is_dependency_install('/pkg', '')).toBe(false)
	})

	it('returns false when INIT_CWD equals package directory (source repo install)', () => {
		expect(jgame_install_bin_logic.is_dependency_install('/pkg', '/pkg')).toBe(false)
	})

	it('returns true when INIT_CWD differs from package directory (dependency install)', () => {
		expect(jgame_install_bin_logic.is_dependency_install('/pkg', '/some/consumer')).toBe(true)
	})
})

describe('jgame_install_bin_logic.is_bin_directory_on_path', () => {
	it('returns true on exact match within colon-split PATH', () => {
		expect(
			jgame_install_bin_logic.is_bin_directory_on_path(
				'/home/u/.local/bin',
				'/usr/bin:/home/u/.local/bin:/usr/local/bin',
			),
		).toBe(true)
	})

	it('returns false on substring match without colon boundary', () => {
		expect(
			jgame_install_bin_logic.is_bin_directory_on_path(
				'/home/u/.local/bin',
				'/home/u/.local/bin-extra:/usr/bin',
			),
		).toBe(false)
	})

	it('returns false on empty PATH', () => {
		expect(jgame_install_bin_logic.is_bin_directory_on_path('/home/u/.local/bin', '')).toBe(false)
	})
})

describe('jgame_install_bin_logic.detect_existing_wrapper_is_jgame', () => {
	it('returns true when content carries the managed marker', () => {
		const content = `#!/bin/sh\n${jgame_install_bin_logic.WRAPPER_MARKER}\nexec ...`
		expect(jgame_install_bin_logic.detect_existing_wrapper_is_jgame(content)).toBe(true)
	})

	it('returns false when the marker is absent', () => {
		expect(
			jgame_install_bin_logic.detect_existing_wrapper_is_jgame('#!/bin/sh\nexec something\n'),
		).toBe(false)
	})
})

describe('jgame_install_bin_logic message formatters', () => {
	it('format_success includes the bin path', () => {
		expect(jgame_install_bin_logic.format_success('/home/u/.local/bin/jgame')).toContain(
			'/home/u/.local/bin/jgame',
		)
	})

	it('format_path_hint includes the bin directory and an export PATH snippet', () => {
		const hint = jgame_install_bin_logic.format_path_hint('/home/u/.local/bin')
		expect(hint).toContain('/home/u/.local/bin')
		expect(hint).toContain('export PATH=')
	})

	it('format_skip mentions dependency install', () => {
		expect(jgame_install_bin_logic.format_skip()).toContain('dependency')
	})

	it('format_overwrite_blocked includes the bin path and a --force hint', () => {
		const msg = jgame_install_bin_logic.format_overwrite_blocked('/home/u/.local/bin/jgame')
		expect(msg).toContain('/home/u/.local/bin/jgame')
		expect(msg).toContain('--force')
	})
})
