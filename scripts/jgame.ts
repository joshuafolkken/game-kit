import { fileURLToPath } from 'node:url'
import { jgame_init } from './jgame-init.ts'
import { jgame_install_bin } from './jgame-install-bin.ts'
import { jgame_sync } from './jgame-sync.ts'
import { jgame_version_check } from './jgame-version-check.ts'
import { jgame_version_upgrade } from './jgame-version-upgrade.ts'

const USAGE = 'Usage: jgame <init|sync|install|version|version:upgrade> [name|--force]'

export function route_command(command: string | undefined, argument?: string): void {
	if (command === 'init') return jgame_init.run(argument)
	if (command === 'sync') return jgame_sync.run()
	if (command === 'install') return jgame_install_bin.run({ force: argument === '--force' })
	if (command === 'version') return jgame_version_check.run()
	if (command === 'version:upgrade') return jgame_version_upgrade.run()
	console.error(`Unknown command: ${command ?? '(none)'}`)
	console.error(USAGE)
	process.exit(1)
}

if (process.argv[1] === fileURLToPath(import.meta.url))
	route_command(process.argv[2], process.argv[3])
