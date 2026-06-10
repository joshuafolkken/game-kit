import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { jgame_running_binary } from './jgame-running-binary.ts'
import { jgame_version_api } from './jgame-version-api.ts'
import { jgame_version_check_logic, type RunningBinary } from './jgame-version-check-logic.ts'
import { jgame_version_targets } from './jgame-version-targets.ts'

const SELF_DIR = path.dirname(fileURLToPath(import.meta.url))

// The running binary is the single source of truth: report the version/path of the install that
// actually executed, alongside the global/project breakdown.
function read_running_binary(): RunningBinary | undefined {
	const version = jgame_running_binary.read_running_version(SELF_DIR)
	if (version === undefined) return undefined

	return { version, path: jgame_running_binary.running_package_directory(SELF_DIR) }
}

function run(): void {
	const global_version = jgame_version_targets.read_global_version()
	const project_version = jgame_version_targets.read_project_version(process.cwd())
	const running = read_running_binary()
	const latest = jgame_version_api.fetch_latest_version()

	if (latest === undefined) {
		console.warn(jgame_version_check_logic.FETCH_FAILED_WARNING)
		console.info(
			jgame_version_check_logic.format_offline_output(global_version, project_version, running),
		)

		return
	}

	console.info(
		jgame_version_check_logic.format_dual_version_output(
			global_version,
			project_version,
			latest,
			running,
		),
	)
}

const jgame_version_check = { run, read_running_binary }

export { jgame_version_check }
