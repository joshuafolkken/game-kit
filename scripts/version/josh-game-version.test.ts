import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { KIT_PACKAGE_NAME, type UpstreamHookContext } from '@joshuafolkken/kit/version'
import { describe, expect, it } from 'vitest'
import { josh_game_version, type ModuleResolver } from './josh-game-version.ts'

const PACKAGE_NAME = '@joshuafolkken/game-kit'
const APP_KIT_PACKAGE_NAME = '@joshuafolkken/app-kit'
const SELF_DIR = '/workspace/game-kit/dist/scripts'
const UPSTREAM_COUNT = 2
const STUB_LATEST = '9.9.9'
const STUB_UPSTREAM_LATEST = '8.8.8'
const SEMVER_PREFIX = /^\d+\.\d+\.\d+/u
const REMOVE_COMMAND = `pnpm remove -g ${PACKAGE_NAME}`
const ADD_COMMAND = `pnpm add -g ${PACKAGE_NAME}`
const INSTALL_DOC = 'docs/install.md'
// The form the fresh-root fix replaces: it bumps game-kit alone and leaves the peer-pinned
// app-kit / kit behind, which is the whole symptom of #414.
const STALE_UPDATE_HINT = `pnpm up -g ${PACKAGE_NAME}`

// The shared hook context kit passes to the effective-global hooks: `latest` is game-kit's own latest,
// already fetched by kit for the primary report; `upstream_latest` is the upstream's own, added by
// kit#697. The command is built from `latest` — the upstream is never named in it (kit#648).
const CONTEXT: UpstreamHookContext = {
	latest: STUB_LATEST,
	upstream_latest: STUB_UPSTREAM_LATEST,
}

// A real directory inside this repo, so the running-relative resolvers (#393) can resolve app-kit
// and kit through the project's node_modules; the fake SELF_DIR above keeps the project-scope
// assertions independent of the local install.
const REAL_SELF_DIR = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(REAL_SELF_DIR, '..', '..')

interface Manifest {
	version?: unknown
}

function is_manifest(value: unknown): value is Manifest {
	return typeof value === 'object' && value !== null
}

function installed_version(package_name: string): string {
	const manifest_path = path.join(PROJECT_ROOT, 'node_modules', package_name, 'package.json')
	const parsed: unknown = JSON.parse(readFileSync(manifest_path, 'utf8'))
	if (is_manifest(parsed) && typeof parsed.version === 'string') return parsed.version

	throw new Error(`missing version for ${package_name}`)
}

// A createRequire stand-in whose `.resolve` always throws — simulates kit being unresolvable from
// the project so the clear-error path is covered deterministically (real resolution can't fail
// under vitest's shared module registry).
function throwing_resolver(): ModuleResolver {
	return {
		resolve(): string {
			throw new Error('module not found')
		},
	}
}

function noop_effective_resolver(): undefined {
	return undefined
}

describe('josh-game version commands', () => {
	it('builds a kit version-command config targeting game-kit', async () => {
		const config = await josh_game_version.build_config(SELF_DIR)

		expect(config.package_name).toBe(PACKAGE_NAME)
		expect(config.versions_endpoint).toContain('game-kit/versions')
		expect(config.self_directory).toBe(SELF_DIR)
	})

	it('resolves the kit version library to a real on-disk module in the project', () => {
		const url = josh_game_version.resolve_kit_version_url()
		const file = fileURLToPath(url)

		expect(url.startsWith('file://')).toBe(true)
		expect(file).toContain(path.join('node_modules', KIT_PACKAGE_NAME))
		expect(existsSync(file)).toBe(true)
	})

	it('anchors kit resolution on the project package.json (cwd), not the running binary', () => {
		const seen: Array<string> = []

		function recording_resolver(from: string): ModuleResolver {
			seen.push(from)

			return {
				resolve(id: string): string {
					return id
				},
			}
		}

		josh_game_version.resolve_kit_version_url(recording_resolver)

		const cwd_manifest_url = pathToFileURL(path.join(process.cwd(), 'package.json')).href

		expect(seen[0]).toBe(cwd_manifest_url)
	})

	it('throws a clear error naming kit when the version library cannot be resolved', () => {
		expect(() => josh_game_version.resolve_kit_version_url(throwing_resolver)).toThrow(
			KIT_PACKAGE_NAME,
		)
	})

	it('accepts a modern kit and rejects one missing the effective-upstream resolver', () => {
		expect(josh_game_version.has_effective_resolver({})).toBe(false)
		expect(josh_game_version.has_effective_resolver(null)).toBe(false)
		expect(
			josh_game_version.has_effective_resolver({
				resolve_effective_upstream_version: 'not-a-function',
			}),
		).toBe(false)
		expect(
			josh_game_version.has_effective_resolver({
				resolve_effective_upstream_version: noop_effective_resolver,
			}),
		).toBe(true)
	})

	it('routes the fix-gh-packages path to the centralized kit script', async () => {
		const config = await josh_game_version.build_config(SELF_DIR)

		expect(config.fix_gh_packages_path).toContain(KIT_PACKAGE_NAME)
		expect(config.fix_gh_packages_path).toContain('fix-gh-packages')
	})

	it('includes the app-kit and kit upstreams, nearest first', async () => {
		const config = await josh_game_version.build_config(SELF_DIR)

		expect(config.upstreams).toHaveLength(UPSTREAM_COUNT)
		expect(config.upstreams[0]?.package_name).toBe(APP_KIT_PACKAGE_NAME)
		expect(config.upstreams[1]?.package_name).toBe(KIT_PACKAGE_NAME)
	})

	it('derives each upstream versions endpoint from its package name', async () => {
		const config = await josh_game_version.build_config(SELF_DIR)

		expect(config.upstreams[0]?.versions_endpoint).toContain('app-kit/versions')
		expect(config.upstreams[1]?.versions_endpoint).toContain('npm/kit/versions')
	})

	it('wires both effective-global hooks onto each upstream, sharing the upgrade command', async () => {
		const config = await josh_game_version.build_config(SELF_DIR)

		for (const upstream of config.upstreams) {
			expect(typeof upstream.resolve_effective_version).toBe('function')
			expect(upstream.resolve_global_upgrade_command).toBe(
				josh_game_version.build_global_upgrade_command,
			)
		}
	})

	it('reports the effective app-kit resolved relative to the running josh-game', async () => {
		const config = await josh_game_version.build_config(REAL_SELF_DIR)

		expect(config.upstreams[0]?.resolve_effective_version?.()).toBe(
			installed_version(APP_KIT_PACKAGE_NAME),
		)
	})

	it('reports the effective kit resolved through the app-kit chain', async () => {
		const config = await josh_game_version.build_config(REAL_SELF_DIR)

		expect(config.upstreams[1]?.resolve_effective_version?.()).toMatch(SEMVER_PREFIX)
	})

	it('pins the global game-kit upgrade command to the latest from the kit context', () => {
		const command = josh_game_version.build_global_upgrade_command(CONTEXT)

		expect(command).toBe(`${REMOVE_COMMAND}; ${ADD_COMMAND}@${STUB_LATEST}`)
	})

	it('falls back to an unpinned global install when no context latest is available', () => {
		const unpinned = `${REMOVE_COMMAND}; ${ADD_COMMAND}`

		expect(josh_game_version.build_global_upgrade_command()).toBe(unpinned)
		expect(josh_game_version.build_global_upgrade_command({ ...CONTEXT, latest: '' })).toBe(
			unpinned,
		)
	})

	it('returns undefined effective versions when the running bin resolves no chain', async () => {
		const config = await josh_game_version.build_config(SELF_DIR)

		expect(config.upstreams[0]?.resolve_effective_version?.()).toBeUndefined()
		expect(config.upstreams[1]?.resolve_effective_version?.()).toBeUndefined()
	})
})

// Read the hint each upstream actually emits, failing loudly when a hook is missing — the assertions
// below are about the command's shape, so an absent hook must not silently pass as "not contains".
// The length assertion guards every caller at once: the shape checks below are `for…of` loops and a
// two-element destructure, all of which pass vacuously (or compare `undefined` to `undefined`) on an
// empty list, so an upstream that stopped being wired would read as green.
async function read_global_upgrade_commands(): Promise<Array<string>> {
	const config = await josh_game_version.build_config(SELF_DIR)
	const commands = config.upstreams.map(function read_command(upstream): string {
		const command = upstream.resolve_global_upgrade_command?.(CONTEXT)
		if (command === undefined) throw new Error(`${upstream.package_name} emits no upgrade command`)

		return command
	})

	expect(commands).toHaveLength(UPSTREAM_COUNT)

	return commands
}

describe('josh-game version — fresh global root for the upstream peers (#414)', () => {
	it('removes the global game-kit before re-adding it so the peer chain re-resolves', async () => {
		// The regression this guards: game-kit already at latest while the bundled app-kit / kit are
		// stale. A plain `pnpm add -g game-kit@<latest>` bumps game-kit and leaves both upstreams
		// pinned there, so the removal must come first — only a fresh global root re-resolves them.
		const commands = await read_global_upgrade_commands()

		for (const command of commands) {
			// `startsWith` rather than an index comparison: a missing removal yields index -1, which
			// would still compare as "before" the add and let the regression through.
			expect(command.startsWith(REMOVE_COMMAND)).toBe(true)
			expect(command).toContain(`; ${ADD_COMMAND}@`)
		}
	})

	it('keeps the command re-runnable after a failed re-install', async () => {
		// `;` keeps the hint recoverable: re-running it after a failed `add` still repairs the install,
		// whereas `&&` would let the now-failing `remove` block that `add`.
		const commands = await read_global_upgrade_commands()

		for (const command of commands) {
			expect(command).not.toContain('&&')
		}
	})

	it('never names an upstream in the global command (kit#648)', async () => {
		// app-kit is an auto-installed peer of the global game-kit, and kit is app-kit's own — neither
		// is ever installed standalone, and the fresh root resolves both on its own, so the emitted
		// command must name only game-kit.
		const commands = await read_global_upgrade_commands()

		for (const command of commands) {
			expect(command).not.toContain(APP_KIT_PACKAGE_NAME)
			expect(command).not.toContain(KIT_PACKAGE_NAME)
		}
	})

	it('emits one identical command for both upstreams so kit can de-duplicate it (kit#697)', async () => {
		const [app_kit_command, kit_command] = await read_global_upgrade_commands()

		expect(app_kit_command).toBe(kit_command)
	})

	it('documents the same fresh-root command the upgrade hint emits, not the stale bump (#414)', () => {
		// The install guide restated the update command in prose, so it drifted into documenting the
		// very bug this issue fixes. Assert it against the builder rather than against a second copy
		// of the string, so the doc can only go stale by failing here.
		const install_document = readFileSync(path.join(PROJECT_ROOT, INSTALL_DOC), 'utf8')

		expect(install_document).toContain(josh_game_version.build_global_upgrade_command())
		expect(install_document).not.toContain(STALE_UPDATE_HINT)
	})

	it('keeps the no-op upgrade-hint guard opted out on both upstreams (kit#697)', async () => {
		const config = await josh_game_version.build_config(SELF_DIR)

		// kit suppresses a hint whose every version pin already matches what is installed. The
		// fresh-root command pins game-kit at a version that is typically already installed — that is
		// the point, not a no-op — so opting in would hide the very command that fixes the stale chain.
		for (const upstream of config.upstreams) {
			expect(upstream.is_global_upgrade_command_pinned).toBe(false)
		}
	})
})
