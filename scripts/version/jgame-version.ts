import { create_version_command_config, version_commands } from '@joshuafolkken/kit/version'

// jgame consumes kit's parameterized version-command library (kit#604) rather than copying it —
// these are the only game-kit-specific inputs: the package name and its GitHub Packages versions
// endpoint. Everything else (read global/project/running version, fetch latest, format the report,
// upgrade) is single-sourced from `@joshuafolkken/kit/version`. See #356.
const PACKAGE_NAME = '@joshuafolkken/game-kit'
const VERSIONS_ENDPOINT = '/users/joshuafolkken/packages/npm/game-kit/versions?per_page=1'

// `self_directory` is the running bin's own directory, so the report can show the running install.
// The CLI passes it from the bundled entry point (dist/scripts/jgame.js).
function build_config(self_directory: string): ReturnType<typeof create_version_command_config> {
	return create_version_command_config({
		package_name: PACKAGE_NAME,
		versions_endpoint: VERSIONS_ENDPOINT,
		self_directory,
	})
}

function run_check(self_directory: string): void {
	version_commands.run_check(build_config(self_directory))
}

function run_upgrade(self_directory: string): number {
	return version_commands.run_upgrade(build_config(self_directory))
}

const jgame_version = { PACKAGE_NAME, VERSIONS_ENDPOINT, build_config, run_check, run_upgrade }

export { jgame_version }
