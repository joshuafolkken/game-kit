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
// `prepare` is included so the scaffold inherits game-kit's own developer-setup
// hook verbatim — `command -v`-guarded `lefthook install` + `tsx fix-gh-packages.ts`.
// `prepare` (not `postinstall`) is correct because these are owner-only setup steps,
// and the guards keep `pnpm install` from failing when a tool is absent. Making it a
// managed key lets `jgame sync` write the canonical `prepare` to existing consumers;
// sync also deletes their superseded unconditional `postinstall` (see jgame-sync.ts),
// so the self-heal is complete rather than additive. See #272.
const MANAGED_SCRIPT_KEYS = ['preview', 'prepare'] as const

type ManagedScriptKey = (typeof MANAGED_SCRIPT_KEYS)[number]
type ManagedScripts = Record<ManagedScriptKey, string>

// Managed keys whose canonical value SURVIVES `pnpm pack` and is therefore read
// back from game-kit's own published package.json (single source, no drift).
// `prepare` is deliberately excluded — see CANONICAL_PREPARE below.
const PUBLISHED_SCRIPT_KEYS = ['preview'] as const satisfies ReadonlyArray<ManagedScriptKey>

// npm/pnpm STRIPS the `prepare` lifecycle script from the published package.json
// (verified via `pnpm pack`), so reading it back from the installed package always
// fails — that was the `jgame init` crash in 0.131.0 (#279). Its canonical value is
// pinned here as a constant instead; a tripwire test asserts it stays byte-identical
// to the repo-root package.json#scripts.prepare so the dev-time source and this copy
// cannot drift. Same publish-strip class as the `packageManager` field in jgame-init.ts.
const CANONICAL_PREPARE =
	"svelte-kit sync || echo ''; command -v lefthook >/dev/null 2>&1 && lefthook install; command -v tsx >/dev/null 2>&1 && tsx node_modules/@joshuafolkken/kit/scripts/fix-gh-packages.ts; true"

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
