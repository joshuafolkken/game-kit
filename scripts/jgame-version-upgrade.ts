import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { jgame_version_api } from './jgame-version-api.ts'
import { jgame_version_upgrade_logic } from './jgame-version-upgrade-logic.ts'

const PROJECT_PACKAGE_JSON = path.join(process.cwd(), 'package.json')

function read_project_package_json_or_undefined(): string | undefined {
	try {
		return readFileSync(PROJECT_PACKAGE_JSON, 'utf8')
	} catch (error) {
		if (jgame_version_upgrade_logic.is_enoent_error(error)) return undefined
		throw error
	}
}

function read_project_overrides(): Record<string, string> {
	const raw = readFileSync(PROJECT_PACKAGE_JSON, 'utf8')

	return jgame_version_upgrade_logic.parse_overrides_from_package(raw)
}

function exec_pnpm(args: Array<string>, display_command: string): number {
	console.info(`▶ ${display_command}`)
	const result = spawnSync(jgame_version_upgrade_logic.UPGRADE_COMMAND, args, {
		stdio: 'inherit',
		shell: false,
	})

	return result.status ?? 1
}

function exec_pnpm_add(latest: string): number {
	return exec_pnpm(
		jgame_version_upgrade_logic.build_upgrade_args(latest),
		jgame_version_upgrade_logic.format_upgrade_command(latest),
	)
}

function exec_pnpm_global_add(latest: string): number {
	return exec_pnpm(
		jgame_version_upgrade_logic.build_global_upgrade_args(latest),
		jgame_version_upgrade_logic.format_global_upgrade_command(latest),
	)
}

function fetch_and_exec(exec: (latest: string) => number): void {
	const latest = jgame_version_api.fetch_latest_version()
	if (latest === undefined) {
		console.warn('⚠ Failed to fetch latest version (is `gh` authenticated?)')

		return
	}
	const status = exec(latest)
	if (status !== 0) process.exit(status)
}

function run_consumer_upgrade(raw: string): void {
	const overrides = jgame_version_upgrade_logic.parse_overrides_from_package(raw)
	const capped_value = jgame_version_upgrade_logic.extract_game_kit_override(overrides)
	if (capped_value !== undefined) {
		console.info(jgame_version_upgrade_logic.format_capped_message(capped_value))

		return
	}
	fetch_and_exec(exec_pnpm_add)
}

function run(): void {
	const raw = read_project_package_json_or_undefined()
	if (jgame_version_upgrade_logic.is_consumer_project_context(raw)) {
		run_consumer_upgrade(raw)

		return
	}
	fetch_and_exec(exec_pnpm_global_add)
}

const jgame_version_upgrade = { run, read_project_overrides, exec_pnpm_add, exec_pnpm_global_add }

export { jgame_version_upgrade }
