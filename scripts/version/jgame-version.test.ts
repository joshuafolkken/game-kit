import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { jgame_version } from './jgame-version.ts'

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
function throwing_resolver(): { resolve: (id: string) => string } {
	return {
		resolve(): string {
			throw new Error('module not found')
		},
	}
}

describe('jgame version commands', () => {
	it('builds a kit version-command config targeting game-kit', async () => {
		const config = await jgame_version.build_config(SELF_DIR)

		expect(config.package_name).toBe(PACKAGE_NAME)
		expect(config.versions_endpoint).toContain('game-kit/versions')
		expect(config.self_directory).toBe(SELF_DIR)
	})

	it('resolves the kit version library url from the current project (cwd)', () => {
		const url = jgame_version.resolve_kit_version_url()

		expect(url).toContain('kit')
		expect(url).toContain('version')
	})

	it('throws a clear error naming kit when the version library cannot be resolved', () => {
		expect(() => jgame_version.resolve_kit_version_url(throwing_resolver)).toThrow(KIT_PACKAGE_NAME)
	})

	it('routes the fix-gh-packages path to the centralized kit script', async () => {
		const config = await jgame_version.build_config(SELF_DIR)

		expect(config.fix_gh_packages_path).toContain(KIT_PACKAGE_NAME)
		expect(config.fix_gh_packages_path).toContain('fix-gh-packages')
	})

	it('includes the app-kit and kit upstreams, nearest first', async () => {
		const config = await jgame_version.build_config(SELF_DIR)

		expect(config.upstreams).toHaveLength(UPSTREAM_COUNT)
		expect(config.upstreams[0]?.package_name).toBe(APP_KIT_PACKAGE_NAME)
		expect(config.upstreams[1]?.package_name).toBe(KIT_PACKAGE_NAME)
	})

	it('derives each upstream versions endpoint from its package name', async () => {
		const config = await jgame_version.build_config(SELF_DIR)

		expect(config.upstreams[0]?.versions_endpoint).toContain('app-kit/versions')
		expect(config.upstreams[1]?.versions_endpoint).toContain('npm/kit/versions')
	})

	it('wires both effective-global hooks onto each upstream, sharing the upgrade command', async () => {
		const config = await jgame_version.build_config(SELF_DIR)

		for (const upstream of config.upstreams) {
			expect(typeof upstream.resolve_effective_version).toBe('function')
			expect(upstream.resolve_global_upgrade_command).toBe(
				jgame_version.build_global_upgrade_command,
			)
		}
	})

	it('reports the effective app-kit resolved relative to the running jgame', async () => {
		const config = await jgame_version.build_config(REAL_SELF_DIR)

		expect(config.upstreams[0]?.resolve_effective_version?.()).toBe(
			installed_version(APP_KIT_PACKAGE_NAME),
		)
	})

	it('reports the effective kit resolved through the app-kit chain', async () => {
		const config = await jgame_version.build_config(REAL_SELF_DIR)

		expect(config.upstreams[1]?.resolve_effective_version?.()).toMatch(SEMVER_PREFIX)
	})

	it('pins the global game-kit upgrade command to the latest from the kit context', () => {
		const command = jgame_version.build_global_upgrade_command({ latest: STUB_LATEST })

		expect(command).toBe(`pnpm add -g ${PACKAGE_NAME}@${STUB_LATEST}`)
	})

	it('falls back to an unpinned global install when no context latest is available', () => {
		const unpinned = `pnpm add -g ${PACKAGE_NAME}`

		expect(jgame_version.build_global_upgrade_command()).toBe(unpinned)
		expect(jgame_version.build_global_upgrade_command({ latest: '' })).toBe(unpinned)
	})

	it('returns undefined effective versions when the running bin resolves no chain', async () => {
		const config = await jgame_version.build_config(SELF_DIR)

		expect(config.upstreams[0]?.resolve_effective_version?.()).toBeUndefined()
		expect(config.upstreams[1]?.resolve_effective_version?.()).toBeUndefined()
	})
})
