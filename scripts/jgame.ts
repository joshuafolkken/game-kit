import { realpathSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { jgame_init } from './init/jgame-init.ts'
import { jgame_sync } from './init/jgame-sync.ts'
import { jgame_version } from './version/jgame-version.ts'

// `[name]` is the init project name; `sync` accepts `--force` to overwrite locally-modified
// free-form files (e.g. layout.css) instead of skipping them (game-kit#375).
const USAGE = 'Usage: jgame <init|sync|version|v|version:upgrade|vu> [name|--force]'

const COMMAND_ARG_INDEX = 2
const NAME_ARG_INDEX = 3

const ROUTING_FAILURE_EXIT_CODE = 1

// The running bin's own directory, passed to kit's version library so the report can show the
// running install. This module is bundled to dist/scripts/jgame.js (the published bin entry).
const SELF_DIR = path.dirname(fileURLToPath(import.meta.url))

async function run_version(): Promise<void> {
	await jgame_version.run_check(SELF_DIR)
}

// run_upgrade returns the exit code; the CLI owns the process exit. (jgame_version loads kit's
// version library lazily, so init/sync never require kit — see jgame-version.ts.)
async function run_version_upgrade(): Promise<void> {
	const code = await jgame_version.run_upgrade(SELF_DIR)
	if (code !== 0) process.exit(code)
}

const COMMAND_HANDLERS: Record<string, (argument?: string) => void | Promise<void>> = {
	init: jgame_init.run,
	sync: jgame_sync.run,
	version: run_version,
	'version:upgrade': run_version_upgrade,
}

function resolve_command(input: string | undefined): string | undefined {
	if (input === 'v') return 'version'
	if (input === 'vu') return 'version:upgrade'

	return input
}

function is_invoked_directly(argv_path: string, module_path: string): boolean {
	try {
		return realpathSync(argv_path) === module_path
	} catch {
		return false
	}
}

// All handlers are async: `init` / `sync` await pnpm subprocesses, and `version` /
// `version:upgrade` await the lazily-imported kit version library. `await` covers them all so a
// failure surfaces instead of floating.
async function route_command(command: string | undefined, argument?: string): Promise<void> {
	const resolved = resolve_command(command)
	const handler = resolved === undefined ? undefined : COMMAND_HANDLERS[resolved]

	if (handler) {
		await handler(argument)

		return
	}

	console.error(`Unknown command: ${command ?? '(none)'}`)
	console.error(USAGE)
	process.exit(1)
}

const jgame = { route_command, is_invoked_directly, resolve_command }

export { jgame }

if (is_invoked_directly(process.argv[1] ?? '', fileURLToPath(import.meta.url))) {
	try {
		await route_command(process.argv[COMMAND_ARG_INDEX], process.argv[NAME_ARG_INDEX])
	} catch (error) {
		console.error(error)
		process.exit(ROUTING_FAILURE_EXIT_CODE)
	}
}
