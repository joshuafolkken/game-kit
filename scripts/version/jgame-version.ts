import type { UpstreamDescriptor, VersionCommandConfig } from '@joshuafolkken/kit/version'

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

// `@joshuafolkken/kit` is a devDependency, so a global `jgame` install (`pnpm add -g`) does NOT
// install it. `init`/`sync` must stay loadable without kit; only `version`/`version:upgrade` need
// it, and those run inside a project where kit is present. So load `@joshuafolkken/kit/version`
// LAZILY (dynamic `import()` inside each function) — a static top-level import would crash every
// command at module load when kit is absent (the global `jgame init` regression #356 introduced;
// the type-only import above is elided at build and does not load kit). See #357.

// `self_directory` is the running bin's own directory, so the report can show the running install.
// The CLI passes it from the bundled entry point (dist/scripts/jgame.js).
async function build_config(self_directory: string): Promise<VersionCommandConfig> {
	const { create_version_command_config, kit_package_descriptor } =
		await import('@joshuafolkken/kit/version')
	const app_kit_descriptor: UpstreamDescriptor = { package_name: APP_KIT_PACKAGE_NAME }

	return create_version_command_config({
		package_name: PACKAGE_NAME,
		upstreams: [app_kit_descriptor, kit_package_descriptor],
		self_directory,
	})
}

async function run_check(self_directory: string): Promise<void> {
	const { version_commands } = await import('@joshuafolkken/kit/version')

	version_commands.run_check(await build_config(self_directory))
}

async function run_upgrade(self_directory: string): Promise<number> {
	const { version_commands } = await import('@joshuafolkken/kit/version')

	return version_commands.run_upgrade(await build_config(self_directory))
}

const jgame_version = { PACKAGE_NAME, APP_KIT_PACKAGE_NAME, build_config, run_check, run_upgrade }

export { jgame_version }
