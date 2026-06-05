import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { jgame_version_api } from './jgame-version-api.ts'
import { jgame_version_check_logic } from './jgame-version-check-logic.ts'

// This module is bundled to dist/scripts/jgame.js and also runs from source at
// scripts/version/jgame-version-check.ts. In BOTH layouts package.json sits exactly two
// directory levels above this file's directory, so resolve it from that fixed depth
// (path.join normalizes any trailing separator on the input).
const PACKAGE_ROOT_DEPTH = 2

function resolve_package_json_path(script_directory: string): string {
	const ascent = Array.from({ length: PACKAGE_ROOT_DEPTH }, () => '..')

	return path.join(script_directory, ...ascent, 'package.json')
}

const PACKAGE_JSON_PATH = resolve_package_json_path(path.dirname(fileURLToPath(import.meta.url)))

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
	const raw = readFileSync(PACKAGE_JSON_PATH, 'utf8')

	return parse_version(raw)
}

function run(): void {
	const current = read_current_version()
	const latest = jgame_version_api.fetch_latest_version()

	if (latest === undefined) {
		console.warn(`Current: ${current}`)
		console.warn('⚠ Failed to fetch latest version (is `gh` authenticated?)')

		return
	}

	console.info(jgame_version_check_logic.format_version_output(current, latest))
}

const jgame_version_check = { run, parse_version, resolve_package_json_path }

export { jgame_version_check }
