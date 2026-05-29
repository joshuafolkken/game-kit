import { readFileSync } from 'node:fs'
import path from 'node:path'
import { jgame_paths } from './jgame-paths.ts'

// Keys in a consumer project's package.json#scripts that game-kit owns. Both
// `jgame init` and `jgame sync` derive their canonical values from this list
// and from game-kit's own package.json so the two paths cannot drift.
//
// `preview` is included because game-kit projects use `@sveltejs/adapter-cloudflare`:
// only `wrangler dev .svelte-kit/cloudflare/_worker.js` boots the Worker runtime
// that executes `hooks.server.ts` (CSP headers, redirects, HTML injection).
// `vite preview` silently bypasses the Worker and breaks Worker-runtime E2E.
const MANAGED_SCRIPT_KEYS = ['preview'] as const

type ManagedScriptKey = (typeof MANAGED_SCRIPT_KEYS)[number]
type ManagedScripts = Record<ManagedScriptKey, string>

function pick_managed_scripts(scripts: Record<string, string>): ManagedScripts {
	const out: Partial<ManagedScripts> = {}

	for (const key of MANAGED_SCRIPT_KEYS) {
		const value = scripts[key]

		if (typeof value !== 'string') {
			throw new TypeError(`game-kit package.json is missing scripts.${key}`)
		}

		out[key] = value
	}

	return out as ManagedScripts
}

function read_canonical_scripts(): ManagedScripts {
	const raw = readFileSync(path.join(jgame_paths.PACKAGE_DIR, 'package.json'), 'utf8')
	const package_ = JSON.parse(raw) as { scripts?: Record<string, string> }

	return pick_managed_scripts(package_.scripts ?? {})
}

const jgame_managed_scripts = {
	MANAGED_SCRIPT_KEYS,
	pick_managed_scripts,
	read_canonical_scripts,
}

export { jgame_managed_scripts }
export type { ManagedScriptKey, ManagedScripts }
