import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const PACKAGE_JSON_PATH = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	'..',
	'package.json',
)

interface PackageJsonShape {
	name: string
	scripts: Record<string, string | undefined>
	devDependencies?: Record<string, string | undefined>
	bin?: Record<string, string | undefined>
	pnpm?: unknown
}

const package_ = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf8')) as PackageJsonShape

describe('package.json lifecycle scripts', () => {
	it('does not run developer-only commands on consumer install (no postinstall)', () => {
		expect(package_.scripts.postinstall).toBeUndefined()
	})

	it('orchestrates prepare from named prepare:* sub-scripts (#311)', () => {
		expect(package_.scripts.prepare).toBe(
			'pnpm prepare:gen && pnpm prepare:sync && pnpm prepare:lefthook && pnpm prepare:gh-packages',
		)
	})

	it('runs lefthook install in prepare:lefthook so it fires only for the package owner', () => {
		expect(package_.scripts['prepare:lefthook']).toMatch(/lefthook install/u)
	})

	it('runs fix-gh-packages in prepare:gh-packages so it fires only for the package owner', () => {
		expect(package_.scripts['prepare:gh-packages']).toMatch(/fix-gh-packages/u)
	})

	it('declares lefthook + tsx as direct devDeps so prepare is self-contained (#272)', () => {
		// Regression for #272: game-kit's prepare invokes lefthook + tsx. Relying on a
		// brew-global lefthook / transitive tsx leaves the version unpinned, and the
		// scaffolder's REQUIRED_DEV_DEPS sources its pins from these entries — a missing
		// entry would propagate an unpinned `*` into every scaffolded project.
		expect(package_.devDependencies?.lefthook).toBeDefined()
		expect(package_.devDependencies?.tsx).toBeDefined()
	})

	it('skips owner-only prepare:* steps in CI yet propagates a real local failure (#272/#323)', () => {
		// lefthook install / fix-gh-packages mutate git hooks + the lockfile — owner-machine-only
		// setup that cannot run in CI (lefthook install hits git "dubious ownership", exit 128). The
		// `[ -n "$CI" ] ||` guard skips them in CI/consumer-CI; the `! probe ||` guard skips on a
		// missing binary; otherwise the tool runs and a real failure propagates (no `; true` mask).
		const lefthook = package_.scripts['prepare:lefthook'] ?? ''
		const gh_packages = package_.scripts['prepare:gh-packages'] ?? ''

		expect(lefthook).toMatch(
			/\[ -n "\$CI" \] \|\| ! command -v lefthook >\/dev\/null 2>&1 \|\| lefthook install/u,
		)
		expect(gh_packages).toMatch(
			/\[ -n "\$CI" \] \|\| ! command -v tsx >\/dev\/null 2>&1 \|\| tsx /u,
		)
		expect(lefthook.trim()).not.toMatch(/;\s*true$/u)
		expect(gh_packages.trim()).not.toMatch(/;\s*true$/u)
	})

	it('guards prepare:gen on wrangler.jsonc but propagates a real gen failure, in CI too (#311/#323)', () => {
		// The scaffold's first `pnpm install` fires `prepare` BEFORE `josh sync` writes
		// wrangler.jsonc, so gen must skip until the config exists. The `[ ! -f … ] || pnpm gen`
		// form keeps that skip while letting a genuine `pnpm gen` failure fail install (#323).
		// Unlike the owner-only steps, gen generates types and is environment-agnostic, so it is
		// NOT `$CI`-guarded — wrangler-types breakage must surface in CI as well.
		const prepare_gen = package_.scripts['prepare:gen'] ?? ''

		expect(prepare_gen).toMatch(/\[ ! -f wrangler\.jsonc \] \|\| pnpm gen/u)
		expect(prepare_gen.trim()).not.toMatch(/;\s*true$/u)
		expect(prepare_gen).not.toMatch(/\$CI/u)
	})

	it('does not reference josh-game-install-bin in any lifecycle script', () => {
		expect(package_.scripts.prepare ?? '').not.toMatch(/josh-game-install-bin/u)
		expect(package_.scripts['prepare:gh-packages'] ?? '').not.toMatch(/josh-game-install-bin/u)
		expect(package_.scripts.postinstall ?? '').not.toMatch(/josh-game-install-bin/u)
	})

	it('keeps safe-chain in preinstall for consumer-side malware scanning', () => {
		expect(package_.scripts.preinstall).toMatch(/safe-chain/u)
	})

	it('does not declare a pnpm field (settings live in pnpm-workspace.yaml)', () => {
		expect(package_.pnpm).toBeUndefined()
	})

	it('exposes the CLI as josh-game and no longer as jgame (#365)', () => {
		expect(package_.bin?.['josh-game']).toBe('dist/scripts/josh-game.js')
		expect(package_.bin?.jgame).toBeUndefined()
	})
})

describe('package.json self-invocation of the josh-game CLI (#447)', () => {
	it('runs the source in this repository rather than whatever is on PATH', () => {
		// game-kit is not its own dependency, so pnpm links no `josh-game` into node_modules/.bin and
		// `pnpm josh-game` falls through to a global install. A stale global (0.187.0) once ran `sync`
		// here and overwrote the eslint profile and the pnpm-workspace.yaml overrides. kit and app-kit
		// both point their own CLI at their source for exactly this reason.
		expect(package_.scripts['josh-game']).toBe('tsx scripts/josh-game.ts')
	})
})

describe('the sync guard resolves its own package directory to this checkout (#447)', () => {
	it('points PACKAGE_DIR at this repository, from source and from the bundle alike', async () => {
		// The guard compares the package.json at PACKAGE_DIR with the one at PROJECT_ROOT. The mocked
		// suite covers that comparison; the half it cannot cover is whether PACKAGE_DIR really lands on
		// this package — from `scripts/init/../..` when run from source and from `dist/scripts/../..`
		// when run from the bundle. Deriving it wrongly would leave that suite green and disarm the
		// guard here.
		//
		// PROJECT_ROOT is process.cwd(), so it is deliberately not asserted: that would pin where
		// vitest was started rather than anything about this checkout.
		const { josh_game_paths } = await import('./init/josh-game-paths.ts')
		const own_package = JSON.parse(
			readFileSync(path.join(josh_game_paths.PACKAGE_DIR, 'package.json'), 'utf8'),
		) as PackageJsonShape

		expect(own_package.name).toBe(package_.name)
	})
})
