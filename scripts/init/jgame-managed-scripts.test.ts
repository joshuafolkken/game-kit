import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('node:fs', () => ({ readFileSync: vi.fn() }))
vi.mock('./jgame-paths.ts', () => ({
	jgame_paths: { PACKAGE_DIR: '/pkg', TEMPLATES_DIR: '/pkg/templates', PROJECT_ROOT: '/project' },
}))

const CANONICAL_PREVIEW = 'wrangler dev .svelte-kit/cloudflare/_worker.js --port 4173'
const CANONICAL_PREPARE =
	'pnpm prepare:gen && pnpm prepare:sync && pnpm prepare:lefthook && pnpm prepare:gh-packages'
// The orchestrated sub-scripts `prepare` delegates to. All of these SURVIVE `pnpm pack`
// (only the bare `prepare` lifecycle key is stripped), so they are published-sourced and
// must be present in any input that read_canonical_scripts / pick_managed_scripts accept.
const PUBLISHED_SUB_SCRIPTS = {
	'prepare:gen': '[ ! -f wrangler.jsonc ] || pnpm gen',
	'prepare:sync': "svelte-kit sync || echo ''",
	'prepare:lefthook': '[ -n "$CI" ] || ! command -v lefthook >/dev/null 2>&1 || lefthook install',
	'prepare:gh-packages':
		'[ -n "$CI" ] || ! command -v tsx >/dev/null 2>&1 || tsx node_modules/@joshuafolkken/kit/scripts/fix-gh-packages.ts',
	gen: 'pnpm gen:pre && wrangler types',
	'gen:pre': 'node -e "clean .svelte-kit/cloudflare/_worker.*"',
}
// The full published-script shape init reads through (everything except the stripped
// bare `prepare`). pick_managed_scripts adds the pinned `prepare` from the constant.
const PUBLISHED_SCRIPTS = { preview: CANONICAL_PREVIEW, ...PUBLISHED_SUB_SCRIPTS }
const EXPECTED_MANAGED = { ...PUBLISHED_SCRIPTS, prepare: CANONICAL_PREPARE }

describe('jgame_managed_scripts.MANAGED_SCRIPT_KEYS', () => {
	it('includes preview as a managed key', async () => {
		const { jgame_managed_scripts } = await import('./jgame-managed-scripts.ts')

		expect(jgame_managed_scripts.MANAGED_SCRIPT_KEYS).toContain('preview')
	})

	it('includes prepare as a managed key so jgame sync self-heals it (#272)', async () => {
		const { jgame_managed_scripts } = await import('./jgame-managed-scripts.ts')

		expect(jgame_managed_scripts.MANAGED_SCRIPT_KEYS).toContain('prepare')
	})

	it('includes the orchestrated prepare:* sub-scripts + gen so the scaffold has them (#311)', async () => {
		const { jgame_managed_scripts } = await import('./jgame-managed-scripts.ts')

		for (const key of [
			'prepare:gen',
			'prepare:sync',
			'prepare:lefthook',
			'prepare:gh-packages',
			'gen',
			'gen:pre',
		] as const) {
			expect(jgame_managed_scripts.MANAGED_SCRIPT_KEYS).toContain(key)
		}
	})
})

describe('jgame_managed_scripts.pick_managed_scripts', () => {
	it('extracts only managed keys, ignoring unrelated scripts', async () => {
		const { jgame_managed_scripts } = await import('./jgame-managed-scripts.ts')
		const result = jgame_managed_scripts.pick_managed_scripts({
			...PUBLISHED_SCRIPTS,
			dev: 'vite dev',
			build: 'vite build',
		})

		expect(result).toEqual(EXPECTED_MANAGED)
	})

	it('throws when the preview managed key is missing', async () => {
		const { jgame_managed_scripts } = await import('./jgame-managed-scripts.ts')

		expect(() => jgame_managed_scripts.pick_managed_scripts({})).toThrow(
			/missing scripts\.preview/u,
		)
	})

	// Regression for #279: `pnpm pack` STRIPS the bare `prepare` from the published
	// package.json, so the runtime must NOT require it in the input — it comes from
	// the CANONICAL_PREPARE constant. The pre-#279 code threw here, crashing init.
	it('supplies the canonical prepare from the constant when the input omits it (#279)', async () => {
		const { jgame_managed_scripts } = await import('./jgame-managed-scripts.ts')
		const result = jgame_managed_scripts.pick_managed_scripts(PUBLISHED_SCRIPTS)

		expect(result).toEqual(EXPECTED_MANAGED)
	})
})

describe('jgame_managed_scripts.read_canonical_scripts', () => {
	beforeEach(async () => {
		const { readFileSync } = await import('node:fs')

		vi.mocked(readFileSync).mockReset()
	})

	it('reads game-kit package.json under jgame_paths.PACKAGE_DIR', async () => {
		const { readFileSync } = await import('node:fs')

		vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ scripts: PUBLISHED_SCRIPTS }))
		const { jgame_managed_scripts } = await import('./jgame-managed-scripts.ts')
		const result = jgame_managed_scripts.read_canonical_scripts()

		expect(readFileSync).toHaveBeenCalledWith('/pkg/package.json', 'utf8')
		expect(result.preview).toBe(CANONICAL_PREVIEW)
		expect(result.prepare).toBe(CANONICAL_PREPARE)
		expect(result['prepare:gen']).toBe(PUBLISHED_SUB_SCRIPTS['prepare:gen'])
	})

	it('throws when scripts field is absent in game-kit package.json', async () => {
		const { readFileSync } = await import('node:fs')

		vi.mocked(readFileSync).mockReturnValue(JSON.stringify({}))
		const { jgame_managed_scripts } = await import('./jgame-managed-scripts.ts')

		expect(() => jgame_managed_scripts.read_canonical_scripts()).toThrow(
			/missing scripts\.preview/u,
		)
	})

	// Regression for #279: the published package.json has the bare `prepare` STRIPPED by
	// `pnpm pack`. Reading that real published shape must succeed and fill `prepare`
	// from the constant — not throw the way 0.131.0 did.
	it('reads a published manifest with prepare stripped without throwing (#279)', async () => {
		const { readFileSync } = await import('node:fs')

		vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ scripts: PUBLISHED_SCRIPTS }))
		const { jgame_managed_scripts } = await import('./jgame-managed-scripts.ts')
		const result = jgame_managed_scripts.read_canonical_scripts()

		expect(result.preview).toBe(CANONICAL_PREVIEW)
		expect(result.prepare).toBe(CANONICAL_PREPARE)
	})
})

describe('jgame_managed_scripts.CANONICAL_PREPARE (drift tripwire)', () => {
	// The bare `prepare` cannot be read from the published package.json (stripped on
	// publish), so its canonical value is pinned as a constant. This tripwire fails if
	// the constant ever drifts from the repo-root package.json#scripts.prepare — keeping
	// game-kit's own developer hook and the scaffolded one byte-identical. See #279/#311.
	it('stays byte-identical to the repo-root package.json prepare', async () => {
		// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- vi.importActual generic needs an inline import type
		const { readFileSync: real_read } = await vi.importActual<typeof import('node:fs')>('node:fs')
		// eslint-disable-next-line unicorn/import-style -- dynamic import is required after vi.resetModules in this test
		const path = await import('node:path')
		const { fileURLToPath } = await import('node:url')
		const this_directory = path.dirname(fileURLToPath(import.meta.url))
		const raw = real_read(path.join(this_directory, '..', '..', 'package.json'), 'utf8')
		const root_prepare = (JSON.parse(raw) as { scripts: Record<string, string> }).scripts.prepare
		const { jgame_managed_scripts } = await import('./jgame-managed-scripts.ts')

		expect(jgame_managed_scripts.CANONICAL_PREPARE).toBe(root_prepare)
		expect(jgame_managed_scripts.CANONICAL_PREPARE).toBe(CANONICAL_PREPARE)
	})
})

describe('jgame_managed_scripts canonical value (integration with real package.json)', () => {
	it('returns the wrangler-based preview script from the real game-kit package.json', async () => {
		// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- vi.importActual generic needs an inline import type
		const { readFileSync: real_read } = await vi.importActual<typeof import('node:fs')>('node:fs')
		// eslint-disable-next-line unicorn/import-style -- dynamic import is required after vi.resetModules in this test
		const path = await import('node:path')
		const { fileURLToPath } = await import('node:url')
		const this_directory = path.dirname(fileURLToPath(import.meta.url))
		const real_package_json = real_read(
			path.join(this_directory, '..', '..', 'package.json'),
			'utf8',
		)
		const { readFileSync } = await import('node:fs')

		vi.mocked(readFileSync).mockReturnValue(real_package_json)
		const { jgame_managed_scripts } = await import('./jgame-managed-scripts.ts')
		const result = jgame_managed_scripts.read_canonical_scripts()

		// Regression guard: game-kit's own preview MUST boot the Worker via wrangler dev;
		// silently reverting to `vite preview` would break consumer E2E for hooks.server.ts.
		expect(result.preview).toBe(CANONICAL_PREVIEW)
	})

	it('returns guarded prepare:* sub-scripts covering lefthook + tsx + gen without failing install (#272/#311)', async () => {
		// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- vi.importActual generic needs an inline import type
		const { readFileSync: real_read } = await vi.importActual<typeof import('node:fs')>('node:fs')
		// eslint-disable-next-line unicorn/import-style -- dynamic import is required after vi.resetModules in this test
		const path = await import('node:path')
		const { fileURLToPath } = await import('node:url')
		const this_directory = path.dirname(fileURLToPath(import.meta.url))
		const real_package_json = real_read(
			path.join(this_directory, '..', '..', 'package.json'),
			'utf8',
		)
		const { readFileSync } = await import('node:fs')

		vi.mocked(readFileSync).mockReturnValue(real_package_json)
		const { jgame_managed_scripts } = await import('./jgame-managed-scripts.ts')
		const result = jgame_managed_scripts.read_canonical_scripts()

		// Regression for #272/#311/#323: owner-only steps (lefthook/gh-packages) carry a
		// `[ -n "$CI" ] ||` guard so they skip in CI yet propagate a real local failure; gen
		// stays `$CI`-agnostic so wrangler-types breakage surfaces everywhere. No `; true` mask.
		expect(result['prepare:lefthook']).toMatch(
			/\[ -n "\$CI" \] \|\| ! command -v lefthook >\/dev\/null 2>&1 \|\| lefthook install/u,
		)
		expect(result['prepare:gh-packages']).toMatch(
			/\[ -n "\$CI" \] \|\| ! command -v tsx >\/dev\/null 2>&1 \|\| tsx /u,
		)
		expect(result['prepare:gh-packages']).toMatch(/fix-gh-packages/u)
		expect(result['prepare:gen']).toMatch(/\[ ! -f wrangler\.jsonc \] \|\| pnpm gen/u)
		expect(result['prepare:gen']).not.toMatch(/\$CI/u)
		expect(result['prepare:lefthook'].trim()).not.toMatch(/;\s*true$/u)
		expect(result['prepare:gh-packages'].trim()).not.toMatch(/;\s*true$/u)
		expect(result['prepare:gen'].trim()).not.toMatch(/;\s*true$/u)
	})
})
