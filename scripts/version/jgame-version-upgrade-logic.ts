const PACKAGE_NAME = '@joshuafolkken/game-kit'
const UPGRADE_ARGS_PREFIX = ['add', '-D'] as const
const GLOBAL_UPGRADE_ARGS_PREFIX = ['add', '-g'] as const

// pnpm >= 11 reads dependency overrides from pnpm-workspace.yaml, not the package.json
// `pnpm.overrides` field (which it ignores). The upgrade cap therefore inspects the
// YAML `overrides:` block. We parse only that block by hand — no YAML dependency is on
// the critical install path, mirroring jgame-fix-gh-packages-logic's lock-file parsing.
// Matches a TOP-LEVEL `overrides:` header (no leading indentation, so a nested key is not
// mistaken for it), tolerating a trailing YAML inline comment like `overrides: # pinned`.
const OVERRIDES_HEADER_PATTERN = /^overrides:\s*(?:#.*)?$/u

function is_indented(line: string): boolean {
	return /^\s/u.test(line)
}

// Returns the non-blank member lines of the top-level `overrides:` block: everything
// indented under the header up to the next top-level (non-indented) line.
function extract_overrides_block(raw: string): Array<string> {
	const lines = raw.split('\n')
	const start = lines.findIndex((line) => OVERRIDES_HEADER_PATTERN.test(line))
	if (start === -1) return []

	const rest = lines.slice(start + 1)
	const end = rest.findIndex((line) => line.trim() !== '' && !is_indented(line))
	const members = end === -1 ? rest : rest.slice(0, end)

	return members.filter((line) => line.trim() !== '')
}

function strip_quotes(token: string): string {
	const first = token.at(0)
	const is_quoted = (first === "'" || first === '"') && token.at(-1) === first

	return is_quoted ? token.slice(1, -1) : token
}

// Drops a trailing `# comment` from an unquoted value; a quoted value is returned as-is
// so a `#` inside quotes is preserved.
function strip_value_comment(value: string): string {
	if (value.startsWith("'") || value.startsWith('"')) return value
	const hash = value.indexOf('#')

	return hash === -1 ? value : value.slice(0, hash).trim()
}

function parse_override_line(line: string): [string, string] | undefined {
	const trimmed = line.trim()
	if (trimmed === '' || trimmed.startsWith('#')) return undefined
	const colon = trimmed.indexOf(':')
	if (colon === -1) return undefined
	const key = strip_quotes(trimmed.slice(0, colon).trim())
	const value = strip_quotes(strip_value_comment(trimmed.slice(colon + 1).trim()))

	return [key, value]
}

// A key with no value (`pkg:`) is YAML null, not a usable override — dropping such pairs
// keeps an empty string out of the overrides map, so the upgrade cap is not falsely
// triggered by `extract_game_kit_override` returning '' (which is !== undefined).
function is_usable_override(entry: [string, string] | undefined): entry is [string, string] {
	return entry !== undefined && entry[0] !== '' && entry[1] !== ''
}

function parse_overrides_from_workspace(raw: string): Record<string, string> {
	const entries = extract_overrides_block(raw)
		.map((line) => parse_override_line(line))
		.filter(is_usable_override)

	return Object.fromEntries(entries)
}

function extract_game_kit_override(overrides: Record<string, string>): string | undefined {
	return overrides[PACKAGE_NAME]
}

function format_capped_message(override_value: string): string {
	return [
		`⏭ Skipping upgrade: ${PACKAGE_NAME} is pinned in pnpm-workspace.yaml overrides`,
		`  Override: ${PACKAGE_NAME} → ${override_value}`,
		'  Remove or relax the override before upgrading.',
	].join('\n')
}

function build_upgrade_args(latest: string): Array<string> {
	return [...UPGRADE_ARGS_PREFIX, `${PACKAGE_NAME}@${latest}`]
}

function build_global_upgrade_args(latest: string): Array<string> {
	return [...GLOBAL_UPGRADE_ARGS_PREFIX, `${PACKAGE_NAME}@${latest}`]
}

function is_enoent_error(value: unknown): boolean {
	if (typeof value !== 'object' || value === null) return false
	if (!('code' in value)) return false

	return value.code === 'ENOENT'
}

const jgame_version_upgrade_logic = {
	PACKAGE_NAME,
	parse_overrides_from_workspace,
	extract_game_kit_override,
	format_capped_message,
	build_upgrade_args,
	build_global_upgrade_args,
	is_enoent_error,
}

export { jgame_version_upgrade_logic }
