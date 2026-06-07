import path from 'node:path'

const PACKAGE_NAME = '@joshuafolkken/game-kit'
const UPGRADE_COMMAND = 'pnpm'
const UPGRADE_ARGS_PREFIX = ['add', '-D'] as const
const GLOBAL_UPGRADE_ARGS_PREFIX = ['add', '-g'] as const
const LOCAL_MODULES_DIR = 'node_modules'

interface PackageJsonWithPnpmOverrides {
	pnpm?: { overrides?: Record<string, string> }
}

function is_overrides_record(value: unknown): value is Record<string, string> {
	if (typeof value !== 'object' || value === null) return false

	return Object.values(value).every((entry) => typeof entry === 'string')
}

function has_object_pnpm(value: object): value is { pnpm: object } {
	if (!('pnpm' in value)) return false

	return typeof value.pnpm === 'object' && value.pnpm !== null
}

function is_package_json_with_pnpm_overrides(
	value: unknown,
): value is PackageJsonWithPnpmOverrides {
	if (typeof value !== 'object' || value === null) return false
	if (!has_object_pnpm(value)) return true
	if (!('overrides' in value.pnpm)) return true

	return is_overrides_record(value.pnpm.overrides)
}

function parse_overrides_from_package(raw: string): Record<string, string> {
	const parsed: unknown = JSON.parse(raw)

	if (!is_package_json_with_pnpm_overrides(parsed)) {
		throw new Error('package.json pnpm.overrides has unexpected shape')
	}

	return parsed.pnpm?.overrides ?? {}
}

function extract_game_kit_override(overrides: Record<string, string>): string | undefined {
	return overrides[PACKAGE_NAME]
}

function format_capped_message(override_value: string): string {
	return [
		`⏭ Skipping upgrade: ${PACKAGE_NAME} is pinned in pnpm.overrides`,
		`  Override: ${PACKAGE_NAME} → ${override_value}`,
		'  Remove or relax the override before upgrading.',
	].join('\n')
}

function build_upgrade_args(latest: string): Array<string> {
	return [...UPGRADE_ARGS_PREFIX, `${PACKAGE_NAME}@${latest}`]
}

function format_upgrade_command(latest: string): string {
	return [UPGRADE_COMMAND, ...build_upgrade_args(latest)].join(' ')
}

// The running binary is the single source of truth, mirroring @joshuafolkken/kit:
// local (`pnpm jgame` / `node_modules/.bin/jgame`) when the executing binary lives under
// `<cwd>/node_modules` → update with `-D`; global (`jgame` from the pnpm global store)
// otherwise → update with `-g`. Keying off package.json contents misfires because
// `jgame init` scaffolds game-kit into devDependencies, so it is always listed.
function is_local_install(cwd: string, self_directory: string): boolean {
	const local_modules = path.resolve(cwd, LOCAL_MODULES_DIR)
	const normalized_self = path.resolve(self_directory)

	return normalized_self === local_modules || normalized_self.startsWith(local_modules + path.sep)
}

function build_global_upgrade_args(latest: string): Array<string> {
	return [...GLOBAL_UPGRADE_ARGS_PREFIX, `${PACKAGE_NAME}@${latest}`]
}

function format_global_upgrade_command(latest: string): string {
	return [UPGRADE_COMMAND, ...build_global_upgrade_args(latest)].join(' ')
}

function is_enoent_error(value: unknown): boolean {
	if (typeof value !== 'object' || value === null) return false
	if (!('code' in value)) return false

	return value.code === 'ENOENT'
}

const jgame_version_upgrade_logic = {
	PACKAGE_NAME,
	UPGRADE_COMMAND,
	parse_overrides_from_package,
	extract_game_kit_override,
	format_capped_message,
	build_upgrade_args,
	format_upgrade_command,
	is_local_install,
	build_global_upgrade_args,
	format_global_upgrade_command,
	is_enoent_error,
}

export { jgame_version_upgrade_logic }
