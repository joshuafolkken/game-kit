import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { jgame_install_bin_logic } from './jgame-install-bin-logic.ts'

const PKG_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const WRAPPER_MODE = 0o755

type InstallOptions = { force: boolean }

type InstallContext = {
	bin_directory: string
	bin_path: string
	wrapper_content: string
}

function build_install_context(): InstallContext {
	const home_directory = os.homedir()
	const bin_directory = jgame_install_bin_logic.resolve_local_bin_directory(home_directory)
	const bin_path = jgame_install_bin_logic.resolve_bin_path(home_directory)
	const wrapper_content = jgame_install_bin_logic.generate_wrapper_script({
		node_command: jgame_install_bin_logic.resolve_node_command(),
		jgame_script_path: jgame_install_bin_logic.resolve_jgame_script_path(PKG_DIR),
	})

	return { bin_directory, bin_path, wrapper_content }
}

function write_wrapper(bin_path: string, content: string): void {
	writeFileSync(bin_path, content)
	chmodSync(bin_path, WRAPPER_MODE)
}

function emit_path_hint_if_needed(bin_directory: string): void {
	const path_environment = process.env['PATH'] ?? ''
	if (jgame_install_bin_logic.is_bin_directory_on_path(bin_directory, path_environment)) return

	console.info(jgame_install_bin_logic.format_path_hint(bin_directory))
}

function should_block_overwrite(bin_path: string, force: boolean): boolean {
	if (force) return false
	if (!existsSync(bin_path)) return false

	const existing_content = readFileSync(bin_path, 'utf8')

	return !jgame_install_bin_logic.detect_existing_wrapper_is_jgame(existing_content)
}

function install_jgame_bin(options: InstallOptions): void {
	const init_cwd = process.env['INIT_CWD'] ?? ''
	const lifecycle_event = process.env['npm_lifecycle_event'] ?? ''
	if (jgame_install_bin_logic.is_dependency_install(PKG_DIR, init_cwd, lifecycle_event)) {
		console.info(jgame_install_bin_logic.format_skip())
		return
	}

	const ctx = build_install_context()
	if (should_block_overwrite(ctx.bin_path, options.force)) {
		console.error(jgame_install_bin_logic.format_overwrite_blocked(ctx.bin_path))
		process.exit(1)
	}

	mkdirSync(ctx.bin_directory, { recursive: true })
	write_wrapper(ctx.bin_path, ctx.wrapper_content)
	console.info(jgame_install_bin_logic.format_success(ctx.bin_path))
	emit_path_hint_if_needed(ctx.bin_directory)
}

const jgame_install_bin = { run: install_jgame_bin }

export { jgame_install_bin }
