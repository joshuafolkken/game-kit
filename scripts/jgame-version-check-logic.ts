const PACKAGE_NAME = '@joshuafolkken/game-kit'
const UPGRADE_COMMAND_HINT = 'jgame vu'

function format_version_status(current: string, latest: string): string {
	if (current === latest) return '✓ Up to date'

	return `⚠ Update available: ${current} → ${latest}`
}

function format_version_output(current: string, latest: string): string {
	const lines = [
		`Current: ${current}`,
		`Latest:  ${latest}`,
		format_version_status(current, latest),
	]

	if (current !== latest) {
		lines.push('', `Run: ${UPGRADE_COMMAND_HINT}`)
	}

	return lines.join('\n')
}

const jgame_version_check_logic = {
	PACKAGE_NAME,
	UPGRADE_COMMAND_HINT,
	format_version_status,
	format_version_output,
}

export { jgame_version_check_logic }
