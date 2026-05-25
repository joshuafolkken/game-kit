import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { jgame_version_check_logic } from './jgame-version-check-logic.ts'

const CONFIG_PKG_PATH = path.join(
	process.cwd(),
	'node_modules',
	'@joshuafolkken',
	'game-kit',
	'package.json',
)
const GH_API_PATH = '/users/joshuafolkken/packages/npm/game-kit/versions?per_page=1'

function is_package_json_with_version(value: unknown): value is { version: string } {
	if (typeof value !== 'object' || value === null) return false
	if (!('version' in value)) return false

	return typeof value.version === 'string'
}

function parse_version(raw: string): string {
	const parsed: unknown = JSON.parse(raw)
	if (!is_package_json_with_version(parsed)) {
		throw new Error('package.json does not contain a string "version" field')
	}

	return parsed.version
}

function read_current_version(): string {
	const raw = readFileSync(CONFIG_PKG_PATH, 'utf8')

	return parse_version(raw)
}

function fetch_latest_version(): string | undefined {
	try {
		const output = execFileSync('gh', ['api', GH_API_PATH, '--jq', '.[0].name'])

		return output.toString().trim()
	} catch {
		return undefined
	}
}

function run(): void {
	const current = read_current_version()
	const latest = fetch_latest_version()

	if (latest === undefined) {
		console.warn(`Current: ${current}`)
		console.warn('⚠ Failed to fetch latest version (is `gh` authenticated?)')

		return
	}

	console.info(jgame_version_check_logic.format_version_output(current, latest))
}

const jgame_version_check = { run, parse_version }

export { jgame_version_check }
