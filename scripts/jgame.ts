import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { jgame_init } from './jgame-init.ts'
import { jgame_sync } from './jgame-sync.ts'
import { jgame_version_check } from './jgame-version-check.ts'
import { jgame_version_upgrade } from './jgame-version-upgrade.ts'

const USAGE = 'Usage: jgame <init|sync|version|v|version:upgrade|vu> [name]'

const COMMAND_ARG_INDEX = 2
const NAME_ARG_INDEX = 3

const COMMAND_HANDLERS: Record<string, (argument?: string) => void> = {
	init: (argument) => {
		jgame_init.run(argument)
	},
	sync: () => {
		jgame_sync.run()
	},
	version: () => {
		jgame_version_check.run()
	},
	'version:upgrade': () => {
		jgame_version_upgrade.run()
	},
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

function route_command(command: string | undefined, argument?: string): void {
	const resolved = resolve_command(command)
	const handler = resolved === undefined ? undefined : COMMAND_HANDLERS[resolved]

	if (handler) {
		handler(argument)

		return
	}

	console.error(`Unknown command: ${command ?? '(none)'}`)
	console.error(USAGE)
	process.exit(1)
}

const jgame = { route_command, is_invoked_directly, resolve_command }

export { jgame }

if (is_invoked_directly(process.argv[1] ?? '', fileURLToPath(import.meta.url))) {
	route_command(process.argv[COMMAND_ARG_INDEX], process.argv[NAME_ARG_INDEX])
}
