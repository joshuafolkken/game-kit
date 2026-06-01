import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const ESLINT_CONFIG_PATH = path.join(REPO_ROOT, 'eslint.config.js')
const TEMPLATE_GAME_TS = path.join(REPO_ROOT, 'templates/src/lib/game/board-config.ts')
const TEMPLATE_ROUTE = path.join(REPO_ROOT, 'templates/src/routes/+page.ts')
const TEMPLATE_HOOKS = path.join(REPO_ROOT, 'templates/src/hooks.server.ts')
const DIST_TYPES = path.join(REPO_ROOT, 'dist/index.d.ts')
// Type-aware linting of templates resolves the package self-import to dist/index.d.ts, so it builds the
// templates/tsconfig.json program — several seconds, beyond vitest's 5s default on cold CI runners.
const ESLINT_PROGRAM_TIMEOUT_MS = 30_000

const eslint_config_source = readFileSync(ESLINT_CONFIG_PATH, 'utf8')
const eslint = new ESLint({ cwd: REPO_ROOT, ignore: false })

describe('templates/ ESLint type-aware coverage (regression for #261)', () => {
	it('points template game/route files at templates/tsconfig.json for type-aware rules', async () => {
		const config = await eslint.calculateConfigForFile(TEMPLATE_GAME_TS)

		expect(config.languageOptions.parserOptions.project).toBe('./templates/tsconfig.json')
		expect(config.languageOptions.parserOptions.projectService).toBe(false)
	})

	it('enables the #260-class type-aware rules on template game files', async () => {
		const config = await eslint.calculateConfigForFile(TEMPLATE_GAME_TS)

		// These rules only fire when type information is available — proving the typed block is active.
		expect(config.rules['@typescript-eslint/no-unnecessary-type-assertion'][0]).toBe(2)
		expect(config.rules['@typescript-eslint/no-unsafe-call'][0]).toBe(2)
		expect(config.rules['@typescript-eslint/no-confusing-void-expression'][0]).toBe(2)
	})

	it('reuses the existing game-dir override profile on template game files (no template-specific rules)', async () => {
		const config = await eslint.calculateConfigForFile(TEMPLATE_GAME_TS)

		// These come from the existing PERMANENT_OVERRIDES + GAME_COMPLEXITY_OVERRIDES (which already list
		// templates/src/lib/game/**), not a template-specific block — the typed block only adds the project.
		expect(config.rules['unicorn/no-null'][0]).toBe(0)
		expect(config.rules['import/exports-last'][0]).toBe(0)
		expect(config.rules['max-statements'][1]).toBe(20)
		expect(config.rules.complexity[1]).toBe(7)
	})

	it('type-aware-lints template routes but keeps the strict defaults (game relaxations scope to the game dir)', async () => {
		const config = await eslint.calculateConfigForFile(TEMPLATE_ROUTE)

		// Routes get type-awareness (catches #260 route bugs) but not the game-dir relaxations, mirroring
		// a scaffolded project where game_overrides scopes to src/lib/game/** only.
		expect(config.languageOptions.parserOptions.project).toBe('./templates/tsconfig.json')
		expect(config.rules['@typescript-eslint/no-unnecessary-type-assertion'][0]).toBe(2)
		// Strict kit default, not the relaxed game-dir cap of 7 (toBeLessThan keeps this robust to kit
		// default bumps from the frequent `josh latest` updates).
		expect(config.rules.complexity[1]).toBeLessThan(7)
	})

	it('keeps hooks.server.ts non-type-aware (its ../package.json import does not resolve here)', async () => {
		const config = await eslint.calculateConfigForFile(TEMPLATE_HOOKS)

		expect(config.languageOptions.parserOptions.project).toBe(false)
		expect(config.rules['@typescript-eslint/no-unnecessary-type-assertion'][0]).toBe(0)
	})

	it.skipIf(!existsSync(DIST_TYPES))(
		'lints the real template game/route source clean — a reintroduced #260 bug would fail here',
		async () => {
			// Behavioral end-to-end proof: builds the templates/tsconfig.json type-aware program (needs
			// dist/; CI builds before tests). If a future template edit reintroduces an unnecessary `as`,
			// an unsafe call, or an unbraced void arrow, this lint reports it — the #261 regression guard.
			const results = await eslint.lintFiles([
				path.join(REPO_ROOT, 'templates/src/lib/game'),
				path.join(REPO_ROOT, 'templates/src/routes'),
			])
			const messages = results.flatMap((result) => result.messages)

			expect(messages).toEqual([])
		},
		ESLINT_PROGRAM_TIMEOUT_MS,
	)
})

describe('eslint.config.js template blocks (regression for #261)', () => {
	it('enables type-aware linting for templates against templates/tsconfig.json', () => {
		expect(eslint_config_source).toContain("project: './templates/tsconfig.json'")
		expect(eslint_config_source).toContain('TEMPLATES_TYPED')
	})
})
