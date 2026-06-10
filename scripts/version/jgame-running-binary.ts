import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const PACKAGE_JSON = 'package.json'

// This module is bundled to dist/scripts/jgame.js and also runs from source at
// scripts/version/jgame-running-binary.ts. In BOTH layouts package.json sits exactly two
// directory levels above this file's directory, so resolve it from that fixed depth.
const SCRIPT_DEPTH_FROM_ROOT = ['..', '..'] as const

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

function safe_parse_version(raw: string): string | undefined {
	try {
		return parse_version(raw)
	} catch {
		return undefined
	}
}

function resolve_package_json_path(script_directory: string): string {
	return path.join(script_directory, ...SCRIPT_DEPTH_FROM_ROOT, PACKAGE_JSON)
}

// Absolute directory of the running binary's package root — the path reported as the source of the
// version that actually ran.
function running_package_directory(script_directory: string): string {
	return path.resolve(script_directory, ...SCRIPT_DEPTH_FROM_ROOT)
}

// Read the version declared in the running binary's own package.json. Undefined only when the file
// is missing or malformed (should not happen for a real install, but kept total for safety).
function read_running_version(script_directory: string): string | undefined {
	const package_path = resolve_package_json_path(script_directory)
	if (!existsSync(package_path)) return undefined

	return safe_parse_version(readFileSync(package_path, 'utf8'))
}

const jgame_running_binary = {
	parse_version,
	resolve_package_json_path,
	running_package_directory,
	read_running_version,
}

export { jgame_running_binary }
