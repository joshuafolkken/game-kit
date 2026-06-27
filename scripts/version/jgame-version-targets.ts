import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const PACKAGE_NAME = '@joshuafolkken/game-kit'
const NODE_MODULES = 'node_modules'
const PACKAGE_JSON = 'package.json'
const PNPM_LS_ARGUMENTS = ['ls', '-g', '--json', PACKAGE_NAME] as const

function safe_json_parse(raw: string): unknown {
	try {
		return JSON.parse(raw)
	} catch {
		return undefined
	}
}

function read_string_property(value: unknown, key: string): string | undefined {
	if (typeof value !== 'object' || value === null) return undefined
	if (!Object.hasOwn(value, key)) return undefined
	const property: unknown = (value as Record<string, unknown>)[key]

	return typeof property === 'string' ? property : undefined
}

function read_object_property(value: unknown, key: string): unknown {
	if (typeof value !== 'object' || value === null) return undefined

	return Object.hasOwn(value, key) ? (value as Record<string, unknown>)[key] : undefined
}

// Read the globally installed version from `pnpm ls -g --json` output. The command prints an array
// whose first entry holds a `dependencies` map keyed by package name. Undefined when the package is
// absent or the output cannot be parsed (e.g. pnpm missing, empty stdout).
function parse_global_version(stdout: string): string | undefined {
	const parsed = safe_json_parse(stdout)
	if (!Array.isArray(parsed)) return undefined
	const dependencies = read_object_property(parsed[0], 'dependencies')
	const entry = read_object_property(dependencies, PACKAGE_NAME)

	return read_string_property(entry, 'version')
}

// Read the version field of a node_modules package.json string. Undefined when the file is missing
// (raw is undefined) or malformed.
function parse_project_version(raw: string | undefined): string | undefined {
	if (raw === undefined) return undefined

	return read_string_property(safe_json_parse(raw), 'version')
}

function read_global_version(): string | undefined {
	try {
		const stdout = execFileSync('pnpm', [...PNPM_LS_ARGUMENTS]).toString()

		return parse_global_version(stdout)
	} catch {
		return undefined
	}
}

function project_package_path(cwd: string): string {
	return path.join(cwd, NODE_MODULES, PACKAGE_NAME, PACKAGE_JSON)
}

function read_project_version(cwd: string): string | undefined {
	const package_path = project_package_path(cwd)
	const raw = existsSync(package_path) ? readFileSync(package_path, 'utf8') : undefined

	return parse_project_version(raw)
}

const jgame_version_targets = {
	parse_global_version,
	parse_project_version,
	read_global_version,
	read_project_version,
	project_package_path,
}

export { jgame_version_targets }
