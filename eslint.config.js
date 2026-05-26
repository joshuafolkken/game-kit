import { create_sveltekit_config } from '@joshuafolkken/kit/eslint/sveltekit'
import svelteConfig from './svelte.config.js'

// PR-1 of #188: switched to kit's strict create_sveltekit_config. The rule
// disables below silence ALL categories that have violations so CI stays green
// with zero source changes. (An earlier attempt that ran `eslint --fix` caused
// semantic regressions in tests — e.g. `function() {}` → `() => {}` broke
// `new`-constructibility, `mockResolvedValue(undefined)` → `mockResolvedValue()`
// dropped a required argument. So PR-1 is config-only.)
// Each follow-up PR removes one disable, runs `--fix` for that rule, manually
// resolves any non-fixable cases, and verifies tests pass.
const PR1_TEMPORARY_RULE_DISABLES = {
	// TODO #188 follow-up: rename short identifiers
	'id-length': 'off',
	// TODO #188 follow-up: rename abbreviated identifiers
	'unicorn/prevent-abbreviations': 'off',
	// TODO #188 follow-up: replace `null` with `undefined` (Three.js uniforms / DOM contracts need per-case review; deferred until reviewer is awake)
	'unicorn/no-null': 'off',
	// TODO #188 follow-up: split oversize functions
	'max-lines-per-function': 'off',
	// TODO #188 follow-up: move exports to end of file
	'import/exports-last': 'off',
	// TODO #188 follow-up: extract magic numbers to UPPER_CASE constants
	'@typescript-eslint/no-magic-numbers': 'off',
	// TODO #188 follow-up: convert individual exports to namespace-object pattern
	'no-restricted-syntax': 'off',
	// TODO #188 follow-up: split functions with too many statements
	'max-statements': 'off',
	// TODO #188 follow-up: replace empty methods with explicit no-op or default
	'@typescript-eslint/no-empty-function': 'off',
	// TODO #188 follow-up: wrap void expressions in block syntax
	'@typescript-eslint/no-confusing-void-expression': 'off',
	// TODO #188 follow-up: extract duplicate string literals to constants
	'sonarjs/no-duplicate-string': 'off',
	// TODO #188 follow-up: align identifier names with snake_case / boolean prefix rules
	'@typescript-eslint/naming-convention': 'off',
	// TODO #188 follow-up: prefer `type` over `interface` consistently
	'@typescript-eslint/consistent-type-definitions': 'off',
	// TODO #188 follow-up: configure import/extensions allowList for Three.js .js deep imports + package.json + SvelteKit hooks.server (rule auto-fix is no-op; needs allowList in rule config — deferred for human review)
	'import/extensions': 'off',
	// TODO #188 follow-up: rename files to PascalCase for Svelte components / `.svelte.ts`
	'unicorn/filename-case': 'off',
	// TODO #188 follow-up: add explicit return types to exported functions
	'@typescript-eslint/explicit-function-return-type': 'off',
	// TODO #188 follow-up: simplify unnecessary nullish / boolean conditions
	'@typescript-eslint/no-unnecessary-condition': 'off',
	// TODO #188 follow-up: initialize all declared variables
	'init-declarations': 'off',
	// TODO #188 follow-up: tighten template-literal expression types
	'@typescript-eslint/restrict-template-expressions': 'off',
	// TODO #188 follow-up: add explicit return types at module boundaries
	'@typescript-eslint/explicit-module-boundary-types': 'off',
	// TODO #188 follow-up: reduce cognitive complexity of flagged functions
	'sonarjs/cognitive-complexity': 'off',
	// TODO #188 follow-up: drop bitwise operations in score hash
	'no-bitwise': 'off',
	// TODO #188 follow-up: reduce cyclomatic complexity of flagged functions
	complexity: 'off',
	// TODO #188 follow-up: split files exceeding the line-count budget
	'max-lines': 'off',
	// TODO #188 follow-up: replace `as T` assertions with annotated declarations
	'@typescript-eslint/consistent-type-assertions': 'off',
	// TODO #188 follow-up: bind methods instead of relying on auto-bound `this`
	'@typescript-eslint/unbound-method': 'off',
	// TODO #188 follow-up: tighten unknown-type call sites
	'@typescript-eslint/no-unsafe-call': 'off',
	// TODO #188 follow-up: consolidate duplicate imports per module
	'no-duplicate-imports': 'off',
	// TODO #188 follow-up: replace getElementById with querySelector
	'unicorn/prefer-query-selector': 'off',
	// TODO #188 follow-up: normalize text-encoding identifier casing (`utf8` vs `utf-8`)
	'unicorn/text-encoding-identifier-case': 'off',
	// TODO #188 follow-up: drop `async` from functions with no `await`
	'require-await': 'off',
	'@typescript-eslint/require-await': 'off',
	// TODO #188 follow-up: hoist helpers out of inner-function scope where safe
	'unicorn/consistent-function-scoping': 'off',
	// TODO #188 follow-up: split functions with too many parameters
	'max-params': 'off',
	// TODO #188 follow-up: replace Math.random with a vetted PRNG
	'sonarjs/pseudo-random': 'off',
	// TODO #188 follow-up: replace restricted relative imports (e.g. `../package.json`)
	'@typescript-eslint/no-restricted-imports': 'off',
	// TODO #188 follow-up: route diagnostics through a logger instead of console.*
	'no-console': 'off',
	// TODO #188 follow-up: replace `++` / `--` with `+= 1` / `-= 1`
	'no-plusplus': 'off',
	// TODO #188 follow-up: switch to addEventListener-based DOM event handlers
	'unicorn/prefer-add-event-listener': 'off',
	// TODO #188 follow-up: drop calls that ignore an explicit empty return
	'sonarjs/no-use-of-empty-return-value': 'off',
	// TODO #188 follow-up: adopt destructuring per the project style guide
	'prefer-destructuring': 'off',
	// TODO #188 follow-up: split multi-assignment expressions for clarity
	'no-multi-assign': 'off',
	// TODO #188 follow-up: respect the per-line length budget
	'max-len': 'off',
	// TODO #188 follow-up: tighten unknown-type assignment sites
	'@typescript-eslint/no-unsafe-assignment': 'off',
	// TODO #188 follow-up: tighten unknown-type member-access sites
	'@typescript-eslint/no-unsafe-member-access': 'off',
	// TODO #188 follow-up: remove commented-out code from src/app.d.ts
	'sonarjs/no-commented-code': 'off',
	// TODO #188 follow-up: convert `.then()` chains to `await`
	'promise/prefer-await-to-then': 'off',
	// TODO #188 follow-up: use RegExp.exec instead of String.match where possible
	'sonarjs/prefer-regexp-exec': 'off',
	// TODO #188 follow-up: harmonize return values across arrow-function branches
	'consistent-return': 'off',
	// TODO #188 follow-up: guard against race conditions in async state mutations
	'require-atomic-updates': 'off',
	// TODO #188 follow-up: add explicit default cases to switch statements
	'default-case': 'off',
	// TODO #188 follow-up: replace mutating Array#reverse with non-mutating Array#toReversed
	'unicorn/no-array-reverse': 'off',
	// TODO #188 follow-up: tighten unknown-type return sites
	'@typescript-eslint/no-unsafe-return': 'off',
	// TODO #188 follow-up: add canonical blank lines between statements
	'padding-line-between-statements': 'off',
	'@stylistic/padding-line-between-statements': 'off',
	// TODO #188 follow-up: convert `let` to `const` where never reassigned
	'prefer-const': 'off',
	// TODO #188 follow-up: simplify regex literals to their canonical form
	'unicorn/better-regex': 'off',
	// TODO #188 follow-up: prefer RegExp.exec over String.match where suitable
	'@typescript-eslint/prefer-regexp-exec': 'off',
	// TODO #188 follow-up: prefer spread over Array.from / apply
	'unicorn/prefer-spread': 'off',
	// TODO #188 follow-up: mark promise-returning functions explicitly async
	'@typescript-eslint/promise-function-async': 'off',
	// TODO #188 follow-up: use String.raw for backslash-heavy literals
	'unicorn/prefer-string-raw': 'off',
	// TODO #188 follow-up: use === -1 / !== -1 consistently for indexOf checks
	'unicorn/consistent-existence-index-check': 'off',
	// TODO #188 follow-up: prefer Element.append over Element.appendChild
	'unicorn/prefer-dom-node-append': 'off',
	// TODO #188 follow-up: drop unnecessary type assertions
	'@typescript-eslint/no-unnecessary-type-assertion': 'off',
	// TODO #188 follow-up: prefer arrow callbacks where `this` binding is not needed
	'prefer-arrow-callback': 'off',
	// TODO #188 follow-up: drop zero fractions (`1.0` → `1`)
	'unicorn/no-zero-fractions': 'off',
	// TODO #188 follow-up: drop redundant `undefined` arguments / values
	'unicorn/no-useless-undefined': 'off',
	// TODO #188 follow-up: add braces to single-statement if/for/while
	curly: 'off',
	// TODO #188 follow-up: prefer Array#for-of over Array#forEach
	'unicorn/no-array-for-each': 'off',
	// TODO #188 follow-up: drop inferrable type annotations
	'@typescript-eslint/no-inferrable-types': 'off',
	// TODO #188 follow-up: prefer property access over bracket access for valid identifiers
	'dot-notation': 'off',
	// TODO #188 follow-up: use Number.* instead of global parseInt / isNaN
	'unicorn/prefer-number-properties': 'off',
	// TODO #188 follow-up: add blank lines between class members
	'lines-between-class-members': 'off',
	// TODO #188 follow-up: lowercase hex literals consistently
	'unicorn/number-literal-case': 'off',
	// TODO #188 follow-up: consolidate import specifiers per module
	'unicorn/require-module-specifiers': 'off',
	// TODO #188 follow-up: prefer `import type` for type-only imports
	'@typescript-eslint/consistent-type-imports': 'off',
	// TODO #188 follow-up: use `globalThis` instead of `window` / `self`
	'unicorn/prefer-global-this': 'off',
	// TODO #188 follow-up: use Math.* modern APIs (e.g. Math.cbrt, Math.log2)
	'unicorn/prefer-modern-math-apis': 'off',
	// TODO #188 follow-up: use `**` operator instead of Math.pow
	'prefer-exponentiation-operator': 'off',
	// TODO #188 follow-up: prefer switch over long if/else chains
	'unicorn/prefer-switch': 'off',
	// TODO #188 follow-up: standardize method-signature shorthand vs property style
	'@typescript-eslint/method-signature-style': 'off',
	// TODO #188 follow-up: drop redundant default-assignment patterns
	'@typescript-eslint/no-useless-default-assignment': 'off',
	// TODO #188 follow-up: prefer String#replaceAll over String#replace with /g
	'unicorn/prefer-string-replace-all': 'off',
	// TODO #188 follow-up: prefer template literals over string concatenation
	'prefer-template': 'off',
	// TODO #188 follow-up: prefer Array#at over [length - 1]
	'unicorn/prefer-at': 'off',
}

// `scripts/` and `templates/` are not included in any tsconfig project here:
// - scripts/ runs as one-off CLI tools (jgame, version-check, etc.) and ships
//   compiled — adding it to the SvelteKit tsconfig would pull build-time tooling
//   into the runtime type-check graph. Linting it requires a separate tsconfig.
// - templates/ is scaffolding source copied verbatim by `jgame init`. The
//   destination project lints it under its own tsconfig; eslint here cannot
//   resolve the `$lib/game-config` import that exists only after scaffold.
// Both are tracked as #188 follow-ups (add a scripts tsconfig; restructure
// templates so they can be linted from this repo).
const PR1_TEMPORARY_FILE_IGNORES = ['scripts/**', 'templates/**']

export default create_sveltekit_config({
	gitignore_path: new URL('./.gitignore', import.meta.url),
	tsconfig_root_dir: import.meta.dirname,
	svelte_config: svelteConfig,
}).concat({ ignores: PR1_TEMPORARY_FILE_IGNORES }, { rules: PR1_TEMPORARY_RULE_DISABLES })
