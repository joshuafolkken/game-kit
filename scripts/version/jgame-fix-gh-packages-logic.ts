const GH_PACKAGES_HOST = 'npm.pkg.github.com'
const NPMRC_AUTH_TOKEN_PREFIX = `//${GH_PACKAGES_HOST}/:_authToken=`
const REGISTRY_KEY = ':registry='
const PACKAGES_SECTION_HEADER = '\npackages:\n'
// A package entry header is a line indented exactly two spaces whose key (scoped keys are quoted,
// simple ones are bare) ends the line with a colon. Deeper-nested lines (4+ spaces) never match.
const ENTRY_HEADER_PATTERN = /^ {2}(\S.*?):\s*$/gmu
const TARBALL_KEY_PATTERN = /\btarball\s*:/u
const NEXT_TOP_LEVEL_KEY_PATTERN = /\n\S/u
const SURROUNDING_QUOTES_PATTERN = /^['"]|['"]$/gu
const KEY_CAPTURE_GROUP = 1

interface LockfilePackage {
	has_tarball: boolean
}

function is_gh_registry_line(line: string): string | undefined {
	const trimmed = line.trim()
	if (!trimmed.startsWith('@')) return undefined
	const eq_index = trimmed.indexOf(REGISTRY_KEY)
	if (eq_index === -1) return undefined
	const registry = trimmed
		.slice(eq_index + REGISTRY_KEY.length)
		.trim()
		.replace(/\/$/u, '')
	if (registry !== `https://${GH_PACKAGES_HOST}`) return undefined

	return trimmed.slice(0, eq_index)
}

function parse_gh_scopes(npmrc: string): Set<string> {
	const scopes = new Set<string>()

	for (const line of npmrc.split('\n')) {
		const scope = is_gh_registry_line(line)
		if (scope !== undefined) scopes.add(scope)
	}

	return scopes
}

function extract_auth_token_from_line(line: string): string | undefined {
	const trimmed = line.trim()
	if (!trimmed.startsWith(NPMRC_AUTH_TOKEN_PREFIX)) return undefined
	const value = trimmed.slice(NPMRC_AUTH_TOKEN_PREFIX.length)
	if (value.startsWith('${') || value.length === 0) return undefined

	return value
}

function parse_npmrc_auth_token(npmrc: string): string | undefined {
	for (const line of npmrc.split('\n')) {
		const token = extract_auth_token_from_line(line)
		if (token !== undefined) return token
	}

	return undefined
}

function scope_from_key(key: string): string {
	return key.startsWith('@') ? (key.split('/', 1)[0] ?? '') : ''
}

function package_path_from_key(key: string): string {
	const start = key.startsWith('@') ? 1 : 0
	const at_index = key.indexOf('@', start)

	return at_index === -1 ? key : key.slice(0, at_index)
}

function package_version_from_key(key: string): string {
	const start = key.startsWith('@') ? 1 : 0
	const at_index = key.indexOf('@', start)
	if (at_index === -1) return ''

	return key.slice(at_index + 1).split('(', 1)[0] ?? ''
}

// pnpm 11 writes pnpm-lock.yaml as a multi-document YAML stream (the @pnpm/exe self-management
// document precedes the project document), so there can be more than one `packages:` block. Isolate
// every block — each runs from its header to the next top-level key — so entry enumeration never
// strays into `snapshots:` (which reuses the same 2-space-indented key shape).
function extract_packages_sections(raw: string): Array<string> {
	const sections: Array<string> = []
	let cursor = raw.indexOf(PACKAGES_SECTION_HEADER)

	while (cursor !== -1) {
		const body_start = cursor + PACKAGES_SECTION_HEADER.length
		const body = raw.slice(body_start)
		const next = NEXT_TOP_LEVEL_KEY_PATTERN.exec(body)
		const end = next === null ? raw.length : body_start + next.index

		sections.push(raw.slice(body_start, end))
		cursor = raw.indexOf(PACKAGES_SECTION_HEADER, end)
	}

	return sections
}

// Enumerate the 2-space-indented package keys in a single section and record whether each already
// declares a tarball (in either expanded or flow `resolution` form), without a YAML parser.
function entry_block(section: string, matches: Array<RegExpMatchArray>, index: number): string {
	const block_start = matches[index]?.index ?? 0
	const block_end = matches[index + 1]?.index ?? section.length

	return section.slice(block_start, block_end)
}

function collect_section_packages(
	section: string,
	packages: Record<string, LockfilePackage>,
): void {
	const matches = section.matchAll(ENTRY_HEADER_PATTERN).toArray()

	for (const [index, match] of matches.entries()) {
		const raw_key = match[KEY_CAPTURE_GROUP]

		if (raw_key !== undefined) {
			const key = raw_key.replaceAll(SURROUNDING_QUOTES_PATTERN, '')

			packages[key] = {
				has_tarball: TARBALL_KEY_PATTERN.test(entry_block(section, matches, index)),
			}
		}
	}
}

function parse_lockfile_packages(raw: string): Record<string, LockfilePackage> {
	const packages: Record<string, LockfilePackage> = {}

	for (const section of extract_packages_sections(raw)) {
		collect_section_packages(section, packages)
	}

	return packages
}

function needs_tarball_fix(key: string, entry: LockfilePackage, scopes: Set<string>): boolean {
	if (entry.has_tarball) return false
	const scope = scope_from_key(key)

	return scope.length > 0 && scopes.has(scope)
}

function resolve_token(
	environment_token: string | undefined,
	npmrc_token: string | undefined,
	get_fallback_token: () => string | undefined,
): string | undefined {
	if (environment_token !== undefined && environment_token.length > 0) return environment_token
	if (npmrc_token !== undefined) return npmrc_token

	return get_fallback_token()
}

const jgame_fix_gh_packages_logic = {
	GH_PACKAGES_HOST,
	parse_gh_scopes,
	parse_npmrc_auth_token,
	scope_from_key,
	package_path_from_key,
	package_version_from_key,
	extract_packages_sections,
	parse_lockfile_packages,
	needs_tarball_fix,
	resolve_token,
}

export type { LockfilePackage }
export { jgame_fix_gh_packages_logic }
