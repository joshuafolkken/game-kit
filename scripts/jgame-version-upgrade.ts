import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { jgame_version_api } from './jgame-version-api.ts'
import { jgame_version_upgrade_logic } from './jgame-version-upgrade-logic.ts'

const PROJECT_PACKAGE_JSON = path.join(process.cwd(), 'package.json')

function read_project_overrides(): Record<string, string> {
	const raw = readFileSync(PROJECT_PACKAGE_JSON, 'utf8')

	return jgame_version_upgrade_logic.parse_overrides_from_package(raw)
}

function exec_pnpm_add(latest: string): number {
	const args = jgame_version_upgrade_logic.build_upgrade_args(latest)
	console.info(`▶ ${jgame_version_upgrade_logic.format_upgrade_command(latest)}`)
	const result = spawnSync(jgame_version_upgrade_logic.UPGRADE_COMMAND, args, {
		stdio: 'inherit',
		shell: false,
	})

	return result.status ?? 1
}

function run(): void {
	const overrides = read_project_overrides()
	const capped_value = jgame_version_upgrade_logic.extract_game_kit_override(overrides)
	if (capped_value !== undefined) {
		console.info(jgame_version_upgrade_logic.format_capped_message(capped_value))

		return
	}

	const latest = jgame_version_api.fetch_latest_version()
	if (latest === undefined) {
		console.warn('⚠ Failed to fetch latest version (is `gh` authenticated?)')

		return
	}

	const status = exec_pnpm_add(latest)
	if (status !== 0) process.exit(status)
}

const jgame_version_upgrade = { run, read_project_overrides, exec_pnpm_add }

export { jgame_version_upgrade }
