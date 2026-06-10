const PACKAGE_NAME = '@joshuafolkken/game-kit'

const GLOBAL_LABEL = 'Global: '
const PROJECT_LABEL = 'Project:'
const LATEST_LABEL = 'Latest: '
const RUNNING_LABEL = 'Running:'
const NOT_INSTALLED = 'not installed'
const STATUS_PAD_WIDTH = 12
const FETCH_FAILED_WARNING = '⚠ Failed to fetch latest version (is `gh` authenticated?)'

// The install that is actually executing (resolved from import.meta.url): its declared version
// plus the package directory it was loaded from. Mirrors kit's running-binary-as-source-of-truth.
interface RunningBinary {
	version: string
	path: string
}

function update_scope_flag(is_local: boolean): string {
	return is_local ? '-D' : '-g'
}

function format_update_command(latest: string, is_local: boolean): string {
	return `pnpm add ${update_scope_flag(is_local)} ${PACKAGE_NAME}@${latest}`
}

// A target needs upgrading only when it is installed (defined) and behind the latest.
function is_target_stale(version: string | undefined, latest: string): boolean {
	return version !== undefined && version !== latest
}

function format_target_status(version: string | undefined, latest: string): string {
	if (version === undefined) return NOT_INSTALLED
	if (version === latest) return `${version.padEnd(STATUS_PAD_WIDTH)}✓`

	return `${version.padEnd(STATUS_PAD_WIDTH)}⚠ → ${latest}`
}

function format_target_line(label: string, version: string | undefined, latest: string): string {
	return `  ${label} ${format_target_status(version, latest)}`
}

function format_running_line(running: RunningBinary | undefined): Array<string> {
	if (running === undefined) return []

	return [`  ${RUNNING_LABEL} ${running.version.padEnd(STATUS_PAD_WIDTH)}(${running.path})`]
}

// Build the upgrade commands for whichever of the two targets are installed and stale.
// Order: global first, then project (mirrors the display order).
function build_dual_upgrade_commands(
	global_version: string | undefined,
	project_version: string | undefined,
	latest: string,
): Array<string> {
	const commands: Array<string> = []

	if (is_target_stale(global_version, latest)) commands.push(format_update_command(latest, false))
	if (is_target_stale(project_version, latest)) commands.push(format_update_command(latest, true))

	return commands
}

function build_report_lines(
	global_version: string | undefined,
	project_version: string | undefined,
	latest: string,
	running: RunningBinary | undefined,
): Array<string> {
	return [
		PACKAGE_NAME,
		format_target_line(GLOBAL_LABEL, global_version, latest),
		format_target_line(PROJECT_LABEL, project_version, latest),
		`  ${LATEST_LABEL} ${latest}`,
		...format_running_line(running),
	]
}

function format_dual_version_output(
	global_version: string | undefined,
	project_version: string | undefined,
	latest: string,
	running?: RunningBinary,
): string {
	const lines = build_report_lines(global_version, project_version, latest, running)
	const hints = build_dual_upgrade_commands(global_version, project_version, latest).map(
		(command) => `Run: ${command}`,
	)
	if (hints.length > 0) lines.push('', ...hints)

	return lines.join('\n')
}

function format_known_version(version: string | undefined): string {
	return version ?? NOT_INSTALLED
}

// Compact report used when the latest version could not be fetched: show the installed targets
// without staleness markers or upgrade hints (there is nothing to compare against).
function format_offline_output(
	global_version: string | undefined,
	project_version: string | undefined,
	running?: RunningBinary,
): string {
	return [
		PACKAGE_NAME,
		`  ${GLOBAL_LABEL} ${format_known_version(global_version)}`,
		`  ${PROJECT_LABEL} ${format_known_version(project_version)}`,
		...format_running_line(running),
	].join('\n')
}

const jgame_version_check_logic = {
	PACKAGE_NAME,
	FETCH_FAILED_WARNING,
	update_scope_flag,
	format_update_command,
	is_target_stale,
	format_target_status,
	format_target_line,
	format_running_line,
	build_dual_upgrade_commands,
	format_dual_version_output,
	format_offline_output,
}

export type { RunningBinary }
export { jgame_version_check_logic }
