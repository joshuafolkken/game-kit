import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('node:fs', () => ({ readFileSync: vi.fn() }))
vi.mock('./jgame-paths.ts', () => ({
	jgame_paths: { PACKAGE_DIR: '/pkg', TEMPLATES_DIR: '/pkg/templates', PROJECT_ROOT: '/project' },
}))

const CANONICAL_PREVIEW = 'wrangler dev .svelte-kit/cloudflare/_worker.js --port 4173'
const CANONICAL_PREPARE =
	"svelte-kit sync || echo ''; command -v lefthook >/dev/null 2>&1 && lefthook install; command -v tsx >/dev/null 2>&1 && tsx node_modules/@joshuafolkken/kit/scripts/fix-gh-packages.ts; true"

describe('jgame_managed_scripts.MANAGED_SCRIPT_KEYS', () => {
	it('includes preview as a managed key', async () => {
		const { jgame_managed_scripts } = await import('./jgame-managed-scripts.ts')

		expect(jgame_managed_scripts.MANAGED_SCRIPT_KEYS).toContain('preview')
	})

	it('includes prepare as a managed key so jgame sync self-heals it (#272)', async () => {
		const { jgame_managed_scripts } = await import('./jgame-managed-scripts.ts')

		expect(jgame_managed_scripts.MANAGED_SCRIPT_KEYS).toContain('prepare')
	})
})

describe('jgame_managed_scripts.pick_managed_scripts', () => {
	it('extracts only managed keys, ignoring unrelated scripts', async () => {
		const { jgame_managed_scripts } = await import('./jgame-managed-scripts.ts')
		const result = jgame_managed_scripts.pick_managed_scripts({
			preview: CANONICAL_PREVIEW,
			prepare: CANONICAL_PREPARE,
			dev: 'vite dev',
			build: 'vite build',
		})

		expect(result).toEqual({ preview: CANONICAL_PREVIEW, prepare: CANONICAL_PREPARE })
	})

	it('throws when the preview managed key is missing', async () => {
		const { jgame_managed_scripts } = await import('./jgame-managed-scripts.ts')

		expect(() => jgame_managed_scripts.pick_managed_scripts({})).toThrow(
			/missing scripts\.preview/u,
		)
	})

	it('throws when the prepare managed key is missing (#272)', async () => {
		const { jgame_managed_scripts } = await import('./jgame-managed-scripts.ts')

		expect(() =>
			jgame_managed_scripts.pick_managed_scripts({ preview: CANONICAL_PREVIEW }),
		).toThrow(/missing scripts\.prepare/u)
	})
})

describe('jgame_managed_scripts.read_canonical_scripts', () => {
	beforeEach(async () => {
		const { readFileSync } = await import('node:fs')

		vi.mocked(readFileSync).mockReset()
	})

	it('reads game-kit package.json under jgame_paths.PACKAGE_DIR', async () => {
		const { readFileSync } = await import('node:fs')

		vi.mocked(readFileSync).mockReturnValue(
			JSON.stringify({ scripts: { preview: CANONICAL_PREVIEW, prepare: CANONICAL_PREPARE } }),
		)
		const { jgame_managed_scripts } = await import('./jgame-managed-scripts.ts')
		const result = jgame_managed_scripts.read_canonical_scripts()

		expect(readFileSync).toHaveBeenCalledWith('/pkg/package.json', 'utf8')
		expect(result.preview).toBe(CANONICAL_PREVIEW)
		expect(result.prepare).toBe(CANONICAL_PREPARE)
	})

	it('throws when scripts field is absent in game-kit package.json', async () => {
		const { readFileSync } = await import('node:fs')

		vi.mocked(readFileSync).mockReturnValue(JSON.stringify({}))
		const { jgame_managed_scripts } = await import('./jgame-managed-scripts.ts')

		expect(() => jgame_managed_scripts.read_canonical_scripts()).toThrow(
			/missing scripts\.preview/u,
		)
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
		const real_package_json = real_read(path.join(this_directory, '..', 'package.json'), 'utf8')
		const { readFileSync } = await import('node:fs')

		vi.mocked(readFileSync).mockReturnValue(real_package_json)
		const { jgame_managed_scripts } = await import('./jgame-managed-scripts.ts')
		const result = jgame_managed_scripts.read_canonical_scripts()

		// Regression guard: game-kit's own preview MUST boot the Worker via wrangler dev;
		// silently reverting to `vite preview` would break consumer E2E for hooks.server.ts.
		expect(result.preview).toBe(CANONICAL_PREVIEW)
	})

	it('returns a guarded prepare that covers lefthook + tsx without failing install (#272)', async () => {
		// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- vi.importActual generic needs an inline import type
		const { readFileSync: real_read } = await vi.importActual<typeof import('node:fs')>('node:fs')
		// eslint-disable-next-line unicorn/import-style -- dynamic import is required after vi.resetModules in this test
		const path = await import('node:path')
		const { fileURLToPath } = await import('node:url')
		const this_directory = path.dirname(fileURLToPath(import.meta.url))
		const real_package_json = real_read(path.join(this_directory, '..', 'package.json'), 'utf8')
		const { readFileSync } = await import('node:fs')

		vi.mocked(readFileSync).mockReturnValue(real_package_json)
		const { jgame_managed_scripts } = await import('./jgame-managed-scripts.ts')
		const result = jgame_managed_scripts.read_canonical_scripts()

		// Regression for #272: each owner-only tool MUST be `command -v`-guarded so a
		// missing binary skips instead of aborting `pnpm install`, and the whole script
		// MUST end with a `true` fallback so the final command never propagates failure.
		expect(result.prepare).toMatch(/command -v lefthook >\/dev\/null 2>&1 && lefthook install/u)
		expect(result.prepare).toMatch(/command -v tsx >\/dev\/null 2>&1 && tsx /u)
		expect(result.prepare).toMatch(/fix-gh-packages/u)
		expect(result.prepare.trim()).toMatch(/;\s*true$/u)
	})
})
