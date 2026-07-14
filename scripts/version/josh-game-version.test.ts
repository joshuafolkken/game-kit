import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { josh_game_version, type ModuleResolver } from './josh-game-version.ts'

const PACKAGE_NAME = '@joshuafolkken/game-kit'
const APP_KIT_PACKAGE_NAME = '@joshuafolkken/app-kit'
const KIT_PACKAGE_NAME = '@joshuafolkken/kit'
const SELF_DIR = '/workspace/game-kit/dist/scripts'
const UPSTREAM_COUNT = 2
const STUB_LATEST = '9.9.9'
const SEMVER_PREFIX = /^\d+\.\d+\.\d+/u

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
		const command = josh_game_version.build_global_upgrade_command({ latest: STUB_LATEST })

		expect(command).toBe(`pnpm add -g ${PACKAGE_NAME}@${STUB_LATEST}`)
	})

	it('falls back to an unpinned global install when no context latest is available', () => {
		const unpinned = `pnpm add -g ${PACKAGE_NAME}`

		expect(josh_game_version.build_global_upgrade_command()).toBe(unpinned)
		expect(josh_game_version.build_global_upgrade_command({ latest: '' })).toBe(unpinned)
	})

	it('returns undefined effective versions when the running bin resolves no chain', async () => {
		const config = await josh_game_version.build_config(SELF_DIR)

		expect(config.upstreams[0]?.resolve_effective_version?.()).toBeUndefined()
		expect(config.upstreams[1]?.resolve_effective_version?.()).toBeUndefined()
	})
})
