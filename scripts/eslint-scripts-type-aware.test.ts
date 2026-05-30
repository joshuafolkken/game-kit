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

	it('keeps the CLI-specific sonarjs rules off for scripts/', () => {
		expect(eslint_config_source).toContain("'sonarjs/no-os-command-from-path': 'off'")
		expect(eslint_config_source).toContain("'sonarjs/no-duplicate-string': 'off'")
	})

	it('disables the two rules that cannot apply to CLI glue (external names, namespace pattern)', () => {
		// naming-convention: Node imports / package_ / external keys cannot be renamed.
		// unbound-method: the export { module } pattern never uses `this`.
		expect(eslint_config_source).toContain("'@typescript-eslint/naming-convention': 'off'")
		expect(eslint_config_source).toContain("'@typescript-eslint/unbound-method': 'off'")
	})

	it('relaxes no-unsafe rules only for scripts test files (mock/JSON.parse any)', () => {
		// Source keeps full type-safety; only vi.mock / JSON.parse inspection in tests is relaxed.
		expect(eslint_config_source).toContain("files: ['scripts/**/*.test.ts']")
		expect(eslint_config_source).toContain("'@typescript-eslint/no-unsafe-assignment': 'off'")
		expect(eslint_config_source).toContain("'@typescript-eslint/no-base-to-string': 'off'")
	})

	it('enforces type-aware rules on scripts/ — no-floating-promises fires on a fixture', async () => {
		// Behavioral proof (not just config strings): lint a fixture that floats a Promise and
		// assert the type-aware rule reports it, exercising the scripts/tsconfig.json project.
		const eslint = new ESLint({ cwd: REPO_ROOT, ignore: false })
		const results = await eslint.lintFiles([FLOATING_PROMISE_FIXTURE])
		const rule_ids = results.flatMap((result) => result.messages).map((message) => message.ruleId)

		expect(rule_ids).toContain('@typescript-eslint/no-floating-promises')
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
