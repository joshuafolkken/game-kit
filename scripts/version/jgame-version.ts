import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type {
	EffectiveUpstreamOptions,
	UpstreamDescriptor,
	UpstreamHookContext,
	VersionCommandConfig,
	VersionCommandConfigOptions,
} from '@joshuafolkken/kit/version'

// jgame consumes kit's parameterized version-command library (kit#604) rather than copying it —
// game-kit's only local input is its own package name; kit derives the GitHub Packages versions
// endpoint from it (kit#632). Everything else (read global/project/running version, fetch latest,
// format the report, upgrade) is single-sourced from `@joshuafolkken/kit/version`. See #356.
const PACKAGE_NAME = '@joshuafolkken/game-kit'

// game-kit's upstream chain is `@joshuafolkken/app-kit` → `@joshuafolkken/kit` (nearest first), so
// `jgame v` / `vu` cover the whole chain (#391). The kit descriptor is single-sourced from kit's
// own export (kit#632). app-kit exports none, so its descriptor is named here — a bare package
// name, not a hardcoded endpoint (kit derives the endpoint from the name via kit#632).
const APP_KIT_PACKAGE_NAME = '@joshuafolkken/app-kit'
const KIT_PACKAGE_NAME = '@joshuafolkken/kit'

// Node-resolvable subpath markers. app-kit's / kit's `.` exports expose only `svelte` / `types`
// conditions, so `createRequire().resolve(<bare package name>)` throws ERR_PACKAGE_PATH_NOT_EXPORTED.
// Resolve a plain-JS / config subpath instead and let kit's resolver walk up to the package root
// (kit#651). These markers are stable published exports of each package.
const APP_KIT_RESOLVE_MARKER = '@joshuafolkken/app-kit/eslint/sveltekit'
const KIT_RESOLVE_MARKER = '@joshuafolkken/kit/config-merge'

// The running bin file inside `self_directory` (dist/scripts/jgame.js). Its URL is the base against
// which the effective (running-relative) upstream chain is resolved: `createRequire(base).resolve`
// walks the running install's dependency closure, NOT `pnpm ls -g` (#393). The file need not exist
// for `.resolve()` — only its directory drives resolution — but the running bin does live here.
const RUNNING_BIN_FILE = 'jgame.js'

// `jgame vu` upgrades a stale effective upstream by bumping the *global game-kit*, which re-bundles
// the whole app-kit → kit chain. A bare `pnpm add -g @joshuafolkken/app-kit` / `... /kit` would be
// shadowed by game-kit's own resolution and never change what jgame runs, so both upstreams share
// this game-kit-targeted command (#393).
const GLOBAL_UPGRADE_COMMAND = `pnpm add -g ${PACKAGE_NAME}`

// `@joshuafolkken/kit` is a devDependency, so a global `jgame` install (`pnpm add -g`) does NOT
// install it. `init`/`sync` must stay loadable without kit; only `version`/`version:upgrade` need
// it. So load `@joshuafolkken/kit/version` LAZILY (never a static top-level value import — that
// would crash every command at module load when kit is absent, the global `jgame init` regression
// #356; the type-only import above is elided at build and does not load kit). See #357.
//
// Resolve the library relative to the PROJECT (cwd), NOT this bundled binary (#395): a global jgame
// carries no kit, so a binary-relative `import('@joshuafolkken/kit/version')` would fall through to
// an unrelated/stale ambient kit (observed: a home-dir kit predating endpoint derivation kit#632,
// yielding `gh api undefined`). Version commands are meant to run inside a project, which provides
// a modern kit; resolve it from cwd and fail with a clear message when run outside one.
const KIT_VERSION_MODULE = '@joshuafolkken/kit/version'

// The subset of `@joshuafolkken/kit/version` jgame consumes, typed from kit's exported types so the
// cwd-resolved dynamic import (whose static type is otherwise lost) stays checked. Function
// signatures are declared here rather than via `typeof import(...)`, which lint forbids.
interface KitVersionCommands {
	run_check: (config: VersionCommandConfig) => void
	run_upgrade: (config: VersionCommandConfig) => number
}

type ResolveEffectiveUpstream = (
	base_url: string,
	package_name: string,
	options?: EffectiveUpstreamOptions,
) => string | undefined

interface KitVersionModule {
	create_version_command_config: (options: VersionCommandConfigOptions) => VersionCommandConfig
	kit_package_descriptor: UpstreamDescriptor
	resolve_effective_upstream_version: ResolveEffectiveUpstream
	version_commands: KitVersionCommands
}

// Narrow structural type of the `createRequire` factory (only `.resolve` is used), injectable so the
// resolution-failure path is testable — vitest's shared module registry makes real base-relative
// resolution always succeed, so cwd manipulation can't reproduce the missing-kit case deterministically.
interface ModuleResolver {
	resolve: (id: string) => string
}

type CreateModuleResolver = (from: string) => ModuleResolver

function resolve_kit_version_url(create_resolver: CreateModuleResolver = createRequire): string {
	const cwd_manifest_url = pathToFileURL(path.join(process.cwd(), 'package.json')).href
	const require_from_cwd = create_resolver(cwd_manifest_url)

	try {
		return pathToFileURL(require_from_cwd.resolve(KIT_VERSION_MODULE)).href
	} catch {
		throw new Error(
			`jgame version needs ${KIT_PACKAGE_NAME}. Run \`jgame v\` / \`jgame vu\` inside a game project that depends on it.`,
		)
	}
}

// The resolved kit must be recent enough to expose `resolve_effective_upstream_version` (kit#651).
// An older kit resolvable from cwd would otherwise be accepted and then crash mid-report (missing
// hook) or silently render blank effective versions — so validate the capability and fail clearly,
// mirroring the missing-kit message. This guard doubles as the module-boundary type narrowing (no
// blind `as KitVersionModule`).
function has_effective_resolver(value: unknown): value is KitVersionModule {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as Partial<KitVersionModule>).resolve_effective_upstream_version === 'function'
	)
}

async function load_kit_version(): Promise<KitVersionModule> {
	const loaded: unknown = await import(resolve_kit_version_url())
	if (has_effective_resolver(loaded)) return loaded

	throw new Error(
		`${KIT_PACKAGE_NAME} in this project is too old for jgame version. Upgrade it (e.g. \`jgame sync\`).`,
	)
}

function running_bin_base_url(self_directory: string): string {
	return pathToFileURL(path.join(self_directory, RUNNING_BIN_FILE)).href
}

// The effective app-kit is the one the running jgame resolves — its direct dependency, present even
// in a global install (kit is not, hence the chain must route kit through app-kit below).
function make_app_kit_effective_resolver(
	self_directory: string,
	resolve_effective: ResolveEffectiveUpstream,
): () => string | undefined {
	return function resolve_app_kit_effective(): string | undefined {
		return resolve_effective(running_bin_base_url(self_directory), APP_KIT_PACKAGE_NAME, {
			resolve_marker: APP_KIT_RESOLVE_MARKER,
		})
	}
}

// The effective kit is resolved relative to the *effective app-kit*, not the running jgame: a global
// jgame carries no kit of its own, so the kit it actually runs is the one bundled under app-kit and
// reached through app-kit's dependency closure (#357, #393). Resolve app-kit's location first, then
// hand that base to kit's resolver. Any failure (kit-less install) yields `undefined` — no crash.
function resolve_app_kit_base_url(self_directory: string): string | undefined {
	try {
		const require_from_bin = createRequire(running_bin_base_url(self_directory))

		return pathToFileURL(require_from_bin.resolve(APP_KIT_RESOLVE_MARKER)).href
	} catch {
		return undefined
	}
}

function make_kit_effective_resolver(
	self_directory: string,
	resolve_effective: ResolveEffectiveUpstream,
): () => string | undefined {
	return function resolve_kit_effective(): string | undefined {
		const app_kit_base = resolve_app_kit_base_url(self_directory)
		if (app_kit_base === undefined) return undefined

		return resolve_effective(app_kit_base, KIT_PACKAGE_NAME, { resolve_marker: KIT_RESOLVE_MARKER })
	}
}

// kit 1.11.0 hands each effective-global hook a typed `UpstreamHookContext`, whose `latest` is
// game-kit's own already-fetched primary latest (kit builds it from the primary snapshot). Reusing
// it for the upgrade command keeps that hint consistent with the reported `Latest:` line and avoids
// a redundant fetch. `context` is optional in our signature only so the unpinned fallback and the
// direct unit tests can call it without one; a missing/empty `latest` degrades to an unpinned install.
function build_global_upgrade_command(context?: UpstreamHookContext): string {
	const latest = context?.latest

	return latest ? `${GLOBAL_UPGRADE_COMMAND}@${latest}` : GLOBAL_UPGRADE_COMMAND
}

function build_app_kit_upstream(
	self_directory: string,
	resolve_effective: ResolveEffectiveUpstream,
): UpstreamDescriptor {
	return {
		package_name: APP_KIT_PACKAGE_NAME,
		resolve_effective_version: make_app_kit_effective_resolver(self_directory, resolve_effective),
		resolve_global_upgrade_command: build_global_upgrade_command,
	}
}

function build_kit_upstream(
	kit_descriptor: UpstreamDescriptor,
	self_directory: string,
	resolve_effective: ResolveEffectiveUpstream,
): UpstreamDescriptor {
	return {
		...kit_descriptor,
		resolve_effective_version: make_kit_effective_resolver(self_directory, resolve_effective),
		resolve_global_upgrade_command: build_global_upgrade_command,
	}
}

// `self_directory` is the running bin's own directory, so the report can show the running install
// and resolve the effective chain relative to it. The CLI passes it from the bundled entry point
// (dist/scripts/jgame.js).
async function build_config(self_directory: string): Promise<VersionCommandConfig> {
	const {
		create_version_command_config,
		kit_package_descriptor,
		resolve_effective_upstream_version,
	} = await load_kit_version()

	return create_version_command_config({
		package_name: PACKAGE_NAME,
		upstreams: [
			build_app_kit_upstream(self_directory, resolve_effective_upstream_version),
			build_kit_upstream(
				kit_package_descriptor,
				self_directory,
				resolve_effective_upstream_version,
			),
		],
		self_directory,
	})
}

async function run_check(self_directory: string): Promise<void> {
	const { version_commands } = await load_kit_version()

	version_commands.run_check(await build_config(self_directory))
}

async function run_upgrade(self_directory: string): Promise<number> {
	const { version_commands } = await load_kit_version()

	return version_commands.run_upgrade(await build_config(self_directory))
}

const jgame_version = {
	PACKAGE_NAME,
	APP_KIT_PACKAGE_NAME,
	KIT_PACKAGE_NAME,
	build_config,
	build_global_upgrade_command,
	has_effective_resolver,
	resolve_kit_version_url,
	run_check,
	run_upgrade,
}

export { jgame_version }
export type { ModuleResolver }
