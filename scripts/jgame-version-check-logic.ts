const PACKAGE_NAME = '@joshuafolkken/game-kit'
const UPDATE_COMMAND_PREFIX = 'pnpm add -D'

function format_version_status(current: string, latest: string): string {
	if (current === latest) return '✓ Up to date'

	return `⚠ Update available: ${current} → ${latest}`
}

function format_update_command(latest: string): string {
	return `${UPDATE_COMMAND_PREFIX} ${PACKAGE_NAME}@${latest}`
}

function format_version_output(current: string, latest: string): string {
	const lines = [
		`Current: ${current}`,
		`Latest:  ${latest}`,
		format_version_status(current, latest),
	]

	if (current !== latest) {
		lines.push('', `Run: ${format_update_command(latest)}`)
	}

	return lines.join('\n')
}

const jgame_version_check_logic = {
	PACKAGE_NAME,
	format_version_status,
	format_update_command,
	format_version_output,
}

export { jgame_version_check_logic }
