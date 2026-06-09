import { readFileSync } from 'node:fs'
import path from 'node:path'
import { jgame_paths } from './jgame-paths.ts'

// Keys in a consumer project's package.json#scripts that game-kit owns. Both
// `jgame init` and `jgame sync` write their canonical values for every key here;
// sync iterates this list to self-heal existing consumers.
//
// `preview` is included because game-kit projects use `@sveltejs/adapter-cloudflare`:
// only `wrangler dev .svelte-kit/cloudflare/_worker.js` boots the Worker runtime
// that executes `hooks.server.ts` (CSP headers, redirects, HTML injection).
// `vite preview` silently bypasses the Worker and breaks Worker-runtime E2E.
//
// `prepare` is included so the scaffold inherits game-kit's own developer-setup hook
// verbatim. It is an ORCHESTRATOR that delegates to named `prepare:*` sub-scripts
// (`prepare:gen`, `prepare:sync`, `prepare:lefthook`, `prepare:gh-packages`), so those
// sub-scripts — plus `gen` / `gen:pre` that `prepare:gen` calls — are managed too: the
// scaffold's `prepare` references them by name and would break `pnpm install` if they
// were absent. `prepare` (not `postinstall`) is correct because these are owner-only
// setup steps, and each sub-script is guarded (`command -v` for lefthook/tsx, a
// `[ -f wrangler.jsonc ]` test for gen) so a missing tool or config skips instead of
// failing install. Making them managed keys lets `jgame sync` write the canonical
// values to existing consumers; sync also deletes their superseded unconditional
// `postinstall` (see jgame-sync.ts), so the self-heal is complete rather than additive.
// See #272 (prepare hook) and #311 (orchestrated sub-scripts + guarded gen).
const MANAGED_SCRIPT_KEYS = [
	'preview',
	'prepare',
	'prepare:gen',
	'prepare:sync',
	'prepare:lefthook',
	'prepare:gh-packages',
	'gen',
	'gen:pre',
] as const

type ManagedScriptKey = (typeof MANAGED_SCRIPT_KEYS)[number]
type ManagedScripts = Record<ManagedScriptKey, string>

// Managed keys whose canonical value SURVIVES `pnpm pack` and is therefore read back
// from game-kit's own published package.json (single source, no drift). Only the bare
// `prepare` lifecycle key is stripped on publish (verified via `pnpm pack`) — every
// colon-namespaced `prepare:*` plus `gen` / `gen:pre` survives, so all of them are
// published-sourced and `prepare` alone is deliberately excluded (see CANONICAL_PREPARE).
const PUBLISHED_SCRIPT_KEYS = [
	'preview',
	'prepare:gen',
	'prepare:sync',
	'prepare:lefthook',
	'prepare:gh-packages',
	'gen',
	'gen:pre',
] as const satisfies ReadonlyArray<ManagedScriptKey>

// npm/pnpm STRIPS the bare `prepare` lifecycle script from the published package.json
// (verified via `pnpm pack`), so reading it back from the installed package always
// fails — that was the `jgame init` crash in 0.131.0 (#279). Its canonical value is
// pinned here as a constant instead; a tripwire test asserts it stays byte-identical
// to the repo-root package.json#scripts.prepare so the dev-time source and this copy
// cannot drift. Same publish-strip class as the `packageManager` field in jgame-init.ts.
// The orchestrated sub-scripts it delegates to are NOT stripped (they are published-
// sourced via PUBLISHED_SCRIPT_KEYS above); only this orchestrator string is pinned.
const CANONICAL_PREPARE =
	'pnpm prepare:gen && pnpm prepare:sync && pnpm prepare:lefthook && pnpm prepare:gh-packages'

const CONSTANT_SCRIPTS: Pick<ManagedScripts, 'prepare'> = { prepare: CANONICAL_PREPARE }

function pick_managed_scripts(scripts: Record<string, string>): ManagedScripts {
	const out: Partial<ManagedScripts> = { ...CONSTANT_SCRIPTS }

	for (const key of PUBLISHED_SCRIPT_KEYS) {
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
	CANONICAL_PREPARE,
	pick_managed_scripts,
	read_canonical_scripts,
}

export { jgame_managed_scripts }
export type { ManagedScriptKey, ManagedScripts }
