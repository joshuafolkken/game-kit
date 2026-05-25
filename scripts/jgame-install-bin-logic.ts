import path from 'node:path'

const BIN_NAME = 'jgame'
const LOCAL_BIN_DIRNAME = '.local/bin'
const NODE_COMMAND = 'node'
const DOUBLE_QUOTE = '"'
const WRAPPER_MARKER = '# game-kit jgame wrapper — managed by `jgame install`'
const TRAILING_SLASHES_PATTERN = /\/+$/

type WrapperPaths = {
	node_command: string
	jgame_script_path: string
}

function resolve_local_bin_directory(home_directory: string): string {
	return path.join(home_directory, LOCAL_BIN_DIRNAME)
}

function resolve_bin_path(home_directory: string): string {
	return path.join(resolve_local_bin_directory(home_directory), BIN_NAME)
}

function resolve_jgame_script_path(package_directory: string): string {
	return path.join(package_directory, 'dist', 'scripts', 'jgame.js')
}

function resolve_package_directory(script_directory: string): string {
	const segments = script_directory.split(path.sep)
	const is_dist = segments.at(-2) === 'dist' && segments.at(-1) === 'scripts'
	const levels_up = is_dist ? 2 : 1

	return path.join(script_directory, ...Array.from({ length: levels_up }, () => '..'))
}

function resolve_node_command(): string {
	return NODE_COMMAND
}

function has_embedded_quote(file_path: string): boolean {
	return file_path.includes(DOUBLE_QUOTE)
}

function strip_trailing_slashes(value: string): string {
	return value.replace(TRAILING_SLASHES_PATTERN, '')
}

function generate_wrapper_script(paths: WrapperPaths): string {
	if (has_embedded_quote(paths.node_command) || has_embedded_quote(paths.jgame_script_path)) {
		throw new Error('Wrapper path must not contain embedded double-quotes')
	}

	return `#!/bin/sh\n${WRAPPER_MARKER}\nexec "${paths.node_command}" "${paths.jgame_script_path}" "$@"\n`
}

function is_dependency_install(
	package_directory: string,
	init_cwd: string,
	lifecycle_event: string,
): boolean {
	if (lifecycle_event !== 'postinstall') return false
	if (init_cwd === '') return false

	return strip_trailing_slashes(init_cwd) !== strip_trailing_slashes(package_directory)
}

function is_bin_directory_on_path(bin_directory: string, path_environment: string): boolean {
	const normalized_bin_directory = strip_trailing_slashes(bin_directory)

	return path_environment
		.split(':')
		.some((entry) => strip_trailing_slashes(entry) === normalized_bin_directory)
}

function detect_existing_wrapper_is_jgame(file_content: string): boolean {
	return file_content.includes(WRAPPER_MARKER)
}

function format_success(bin_path: string): string {
	return `  ✔ ${bin_path} installed`
}

function format_path_hint(bin_directory: string): string {
	return `  💡 Add to ~/.zshrc or ~/.zprofile:\n     export PATH="${bin_directory}:$PATH"`
}

function format_skip(): string {
	return '  ⏭ jgame install skipped (installed as dependency)'
}

function format_overwrite_blocked(bin_path: string): string {
	return `  ✖ Refusing to overwrite ${bin_path} (file exists and was not created by jgame). Pass --force to override.`
}

const jgame_install_bin_logic = {
	BIN_NAME,
	WRAPPER_MARKER,
	resolve_local_bin_directory,
	resolve_bin_path,
	resolve_jgame_script_path,
	resolve_package_directory,
	resolve_node_command,
	generate_wrapper_script,
	strip_trailing_slashes,
	is_dependency_install,
	is_bin_directory_on_path,
	detect_existing_wrapper_is_jgame,
	format_success,
	format_path_hint,
	format_skip,
	format_overwrite_blocked,
}

export { jgame_install_bin_logic }
