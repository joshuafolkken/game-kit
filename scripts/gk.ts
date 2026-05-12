import { fileURLToPath } from 'node:url'
import { gk_init } from './gk-init.ts'
import { gk_sync } from './gk-sync.ts'

const USAGE = 'Usage: gk <init|sync> [name]'

export function route_command(command: string | undefined, game_name?: string): void {
	if (command === 'init') return gk_init.run(game_name)
	if (command === 'sync') return gk_sync.run()
	console.error(`Unknown command: ${command ?? '(none)'}`)
	console.error(USAGE)
	process.exit(1)
}

if (process.argv[1] === fileURLToPath(import.meta.url))
	route_command(process.argv[2], process.argv[3])
