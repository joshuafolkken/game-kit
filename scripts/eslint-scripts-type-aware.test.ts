import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const ESLINT_CONFIG_PATH = path.join(REPO_ROOT, 'eslint.config.js')
const SCRIPTS_TSCONFIG_PATH = path.join(REPO_ROOT, 'scripts', 'tsconfig.json')
const FLOATING_PROMISE_FIXTURE = path.join(
	REPO_ROOT,
	'scripts',
	'__fixtures__',
	'floating-promise.ts',
)
// Building the type-aware TS program for scripts/tsconfig.json takes several seconds,
// which exceeds vitest's 5s default on cold CI runners.
const ESLINT_PROGRAM_TIMEOUT_MS = 30_000

const eslint_config_source = readFileSync(ESLINT_CONFIG_PATH, 'utf8')

describe('scripts/ ESLint type-aware coverage (regression for #240)', () => {
	it('no longer disables type-aware linting for scripts/', () => {
		// SCRIPTS_NON_TYPED used disableTypeChecked + project:false to turn off every
		// type-aware rule for scripts/. Restoring coverage means that block is gone.
		expect(eslint_config_source).not.toContain('SCRIPTS_NON_TYPED')
	})

	it('points scripts/ at a dedicated tsconfig so type-aware rules resolve', () => {
		expect(eslint_config_source).toContain("project: './scripts/tsconfig.json'")
	})

	it('keeps sonarjs/no-duplicate-string off for scripts/ (path/fixture strings are not a smell)', () => {
		expect(eslint_config_source).toContain("'sonarjs/no-duplicate-string': 'off'")
		// no-os-command-from-path moved to kit 0.199.0's shared scripts block (#442), so it is no
		// longer declared locally — kit now owns it for every consumer with a scripts/ dir.
		expect(eslint_config_source).not.toContain("'sonarjs/no-os-command-from-path'")
	})

	it('disables naming-convention for CLI glue (external names cannot be renamed)', () => {
		// naming-convention: Node imports / package_ / external keys cannot be renamed.
		expect(eslint_config_source).toContain("'@typescript-eslint/naming-convention': 'off'")
		// unbound-method moved to kit 0.199.0's shared scripts block (#442); no longer local.
		expect(eslint_config_source).not.toContain("'@typescript-eslint/unbound-method'")
	})

	it('relaxes no-unsafe rules only for scripts test files (mock/JSON.parse any)', () => {
		// Source keeps full type-safety; only vi.mock / JSON.parse inspection in tests is relaxed.
		expect(eslint_config_source).toContain("files: ['scripts/**/*.test.ts']")
		expect(eslint_config_source).toContain("'@typescript-eslint/no-unsafe-assignment': 'off'")
		expect(eslint_config_source).toContain("'@typescript-eslint/no-base-to-string': 'off'")
	})

	it(
		'enforces type-aware rules on scripts/ — no-floating-promises fires on a fixture',
		async () => {
			// Behavioral proof (not just config strings): lint a fixture that floats a Promise and
			// assert the type-aware rule reports it, exercising the scripts/tsconfig.json project.
			const eslint = new ESLint({ cwd: REPO_ROOT, ignore: false })
			const results = await eslint.lintFiles([FLOATING_PROMISE_FIXTURE])
			const rule_ids = results.flatMap((result) => result.messages).map((message) => message.ruleId)

			expect(rule_ids).toContain('@typescript-eslint/no-floating-promises')
		},
		ESLINT_PROGRAM_TIMEOUT_MS,
	)
})

describe('eslint.config.js block ordering (regression for #244)', () => {
	it('GAME_COMPLEXITY_OVERRIDES appears after TEMPLATES_NON_TYPED in the concat call', () => {
		// GAME_COMPLEXITY_OVERRIDES must win over TEMPLATES_NON_TYPED for templates/src/lib/game/**
		// because both blocks match that glob. Placing it last guarantees the cap always takes
		// precedence regardless of what future NON_TYPED blocks do with the complexity family.
		const templates_pos = eslint_config_source.indexOf('TEMPLATES_NON_TYPED,')
		const complexity_pos = eslint_config_source.indexOf('GAME_COMPLEXITY_OVERRIDES,')

		expect(templates_pos).toBeGreaterThan(0)
		expect(complexity_pos).toBeGreaterThan(templates_pos)
	})
})

describe('eslint.config.js size-cap tiers (regression for #252)', () => {
	// The size-cap literals (50/20/400 source, 130/25/600 test) and complexity 7 were extracted
	// to named constants and a lines_cap() helper. These assert the MERGED config ESLint resolves
	// per file, so a typo'd constant or a wrong helper wiring would surface here — string checks
	// alone could not catch that. (calculateConfigForFile returns rules as [severity, ...options].)
	const eslint = new ESLint({ cwd: REPO_ROOT, ignore: false })

	it('applies SOURCE-tier size caps to source files (50 / 20 / 400)', async () => {
		const config = await eslint.calculateConfigForFile(
			path.join(REPO_ROOT, 'src/lib/game/game-name.ts'),
		)

		expect(config.rules['max-lines-per-function'][1].max).toBe(50)
		expect(config.rules['max-statements'][1]).toBe(20)
		expect(config.rules['max-lines'][1].max).toBe(400)
	})

	it('gives test files the higher TEST-tier size budget (130 / 25 / 600)', async () => {
		const config = await eslint.calculateConfigForFile(
			path.join(REPO_ROOT, 'scripts', 'eslint-scripts-type-aware.test.ts'),
		)

		expect(config.rules['max-lines-per-function'][1].max).toBe(130)
		expect(config.rules['max-statements'][1]).toBe(25)
		expect(config.rules['max-lines'][1].max).toBe(600)
	})

	it('raises the complexity cap to 7 for game dirs', async () => {
		const config = await eslint.calculateConfigForFile(
			path.join(REPO_ROOT, 'src/lib/game/game-name.ts'),
		)

		expect(config.rules.complexity[1]).toBe(7)
		expect(config.rules['sonarjs/cognitive-complexity'][1]).toBe(7)
	})
})

describe('scripts/tsconfig.json (regression for #240)', () => {
	const scripts_tsconfig_source = readFileSync(SCRIPTS_TSCONFIG_PATH, 'utf8')

	it('includes the scripts sources', () => {
		expect(scripts_tsconfig_source).toContain('**/*.ts')
	})

	it('extends the root tsconfig to inherit rewriteRelativeImportExtensions (.ts imports)', () => {
		expect(scripts_tsconfig_source).toContain('"extends": "../tsconfig.json"')
	})
})
