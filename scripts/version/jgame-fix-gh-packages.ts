import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { jgame_fix_gh_packages_logic, type LockfilePackage } from './jgame-fix-gh-packages-logic.ts'
import { jgame_fix_gh_packages_patch } from './jgame-fix-gh-packages-patch.ts'

const LOCKFILE = 'pnpm-lock.yaml'
const NPMRC = '.npmrc'
const FETCH_TIMEOUT_MS = 10_000

function read_file(file_path: string): string {
	return existsSync(file_path) ? readFileSync(file_path, 'utf8') : ''
}

function get_gh_cli_token(): string | undefined {
	try {
		const token = execFileSync('gh', ['auth', 'token']).toString().trim()

		return token.length > 0 ? token : undefined
	} catch {
		return undefined
	}
}

function get_effective_auth_token(npmrc: string): string | undefined {
	const environment_token = process.env['NODE_AUTH_TOKEN']?.trim()
	const npmrc_token = jgame_fix_gh_packages_logic.parse_npmrc_auth_token(npmrc)

	return jgame_fix_gh_packages_logic.resolve_token(environment_token, npmrc_token, get_gh_cli_token)
}

function read_object_property(value: unknown, key: string): unknown {
	if (typeof value !== 'object' || value === null) return undefined

	return Object.hasOwn(value, key) ? (value as Record<string, unknown>)[key] : undefined
}

// Navigate the npm packument JSON (versions → <version> → dist → tarball) without a schema library.
function extract_tarball_url(packument: unknown, version: string): string | undefined {
	const versions = read_object_property(packument, 'versions')
	const distribution = read_object_property(read_object_property(versions, version), 'dist')
	const tarball = read_object_property(distribution, 'tarball')

	return typeof tarball === 'string' ? tarball : undefined
}

async function fetch_tarball_url(
	package_path: string,
	version: string,
	token: string,
): Promise<string | undefined> {
	const url = `https://${jgame_fix_gh_packages_logic.GH_PACKAGES_HOST}/${package_path}`
	const response = await fetch(url, {
		headers: { Authorization: `Bearer ${token}` },
		signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
	})

	if (!response.ok) {
		console.warn(`fix-gh-packages: fetch failed for ${package_path} (${String(response.status)})`)

		return undefined
	}

	return extract_tarball_url(await response.json(), version)
}

async function process_package_entry(
	key: string,
	entry: LockfilePackage,
	scopes: Set<string>,
	token: string,
): Promise<[string, string] | undefined> {
	if (!jgame_fix_gh_packages_logic.needs_tarball_fix(key, entry, scopes)) return undefined
	const tarball = await fetch_tarball_url(
		jgame_fix_gh_packages_logic.package_path_from_key(key),
		jgame_fix_gh_packages_logic.package_version_from_key(key),
		token,
	)

	return tarball === undefined ? undefined : [key, tarball]
}

async function collect_fixes(
	packages: Record<string, LockfilePackage>,
	scopes: Set<string>,
	token: string,
): Promise<Map<string, string>> {
	const fixes = new Map<string, string>()

	for (const [key, entry] of Object.entries(packages)) {
		const pair = await process_package_entry(key, entry, scopes, token)
		if (pair !== undefined) fixes.set(pair[0], pair[1])
	}

	return fixes
}

async function apply_fixes(cwd: string, scopes: Set<string>, token: string): Promise<void> {
	const lockfile_path = path.join(cwd, LOCKFILE)
	if (!existsSync(lockfile_path)) return
	const raw = readFileSync(lockfile_path, 'utf8')
	const packages = jgame_fix_gh_packages_logic.parse_lockfile_packages(raw)
	const fixes = await collect_fixes(packages, scopes, token)
	if (fixes.size === 0) return
	writeFileSync(lockfile_path, jgame_fix_gh_packages_patch.patch_lockfile(raw, fixes))
	console.info('fix-gh-packages: restored GitHub Packages tarball URLs in pnpm-lock.yaml')
}

async function run_main(cwd: string): Promise<void> {
	const npmrc = read_file(path.join(cwd, NPMRC))
	const scopes = jgame_fix_gh_packages_logic.parse_gh_scopes(npmrc)
	if (scopes.size === 0) return
	const token = get_effective_auth_token(npmrc)

	if (token === undefined) {
		console.warn(
			'fix-gh-packages: no auth token found — run `gh auth login` or set NODE_AUTH_TOKEN',
		)

		return
	}

	await apply_fixes(cwd, scopes, token)
}

async function run(cwd: string): Promise<void> {
	try {
		await run_main(cwd)
	} catch (error) {
		console.warn(`fix-gh-packages: skipped due to error: ${String(error)}`)
	}
}

const jgame_fix_gh_packages = {
	run,
	get_gh_cli_token,
	get_effective_auth_token,
	extract_tarball_url,
}

export { jgame_fix_gh_packages }
