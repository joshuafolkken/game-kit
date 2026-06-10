import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { jgame_fix_gh_packages } from './jgame-fix-gh-packages.ts'
import { jgame_version_api } from './jgame-version-api.ts'
import { jgame_version_check_logic } from './jgame-version-check-logic.ts'
import { jgame_version_targets } from './jgame-version-targets.ts'
import { jgame_version_upgrade_logic } from './jgame-version-upgrade-logic.ts'

const PROJECT_WORKSPACE_YAML = path.join(process.cwd(), 'pnpm-workspace.yaml')
const FAILURE_EXIT_CODE = 1
const ALREADY_UP_TO_DATE = '✓ Up to date'
const PNPM = 'pnpm'

function read_workspace_yaml_or_undefined(): string | undefined {
	try {
		return readFileSync(PROJECT_WORKSPACE_YAML, 'utf8')
	} catch (error) {
		if (jgame_version_upgrade_logic.is_enoent_error(error)) return undefined
		throw error
	}
}

function read_project_overrides(): Record<string, string> {
	const raw = read_workspace_yaml_or_undefined()
	if (raw === undefined) return {}

	return jgame_version_upgrade_logic.parse_overrides_from_workspace(raw)
}

function find_override_cap(): string | undefined {
	const overrides = read_project_overrides()

	return jgame_version_upgrade_logic.extract_game_kit_override(overrides)
}

function exec_pnpm(args: Array<string>, is_local: boolean, latest: string): number {
	console.info(`▶ ${jgame_version_check_logic.format_update_command(latest, is_local)}`)
	const result = spawnSync(PNPM, args, { stdio: 'inherit', shell: false })

	return result.status ?? FAILURE_EXIT_CODE
}

function exec_global_upgrade(latest: string): number {
	return exec_pnpm(jgame_version_upgrade_logic.build_global_upgrade_args(latest), false, latest)
}

function exec_project_upgrade(latest: string): number {
	return exec_pnpm(jgame_version_upgrade_logic.build_upgrade_args(latest), true, latest)
}

// Upgrade the project (local) install unless it is pinned in pnpm-workspace.yaml overrides; on success repair the
// lockfile's GitHub Packages tarball URLs in-process (mirrors kit's fix-gh-packages chain).
async function upgrade_project(latest: string): Promise<number> {
	const capped = find_override_cap()

	if (capped !== undefined) {
		console.info(jgame_version_upgrade_logic.format_capped_message(capped))

		return 0
	}

	const status = exec_project_upgrade(latest)
	if (status === 0) await jgame_fix_gh_packages.run(process.cwd())

	return status
}

async function run_upgrades(
	global_stale: boolean,
	project_stale: boolean,
	latest: string,
): Promise<number> {
	const global_status = global_stale ? exec_global_upgrade(latest) : 0
	const project_status = project_stale ? await upgrade_project(latest) : 0

	return global_status === 0 ? project_status : global_status
}

async function run(): Promise<void> {
	const latest = jgame_version_api.fetch_latest_version()

	if (latest === undefined) {
		console.warn(jgame_version_check_logic.FETCH_FAILED_WARNING)

		return
	}

	const global_version = jgame_version_targets.read_global_version()
	const project_version = jgame_version_targets.read_project_version(process.cwd())
	const global_stale = jgame_version_check_logic.is_target_stale(global_version, latest)
	const project_stale = jgame_version_check_logic.is_target_stale(project_version, latest)

	if (!global_stale && !project_stale) {
		console.info(ALREADY_UP_TO_DATE)

		return
	}

	const status = await run_upgrades(global_stale, project_stale, latest)
	if (status !== 0) process.exit(status)
}

const jgame_version_upgrade = {
	run,
	read_project_overrides,
	exec_global_upgrade,
	exec_project_upgrade,
}

export { jgame_version_upgrade }
