import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { jgame_root_files } from './init/jgame-root-files.ts'
import { jgame_sync } from './init/jgame-sync.ts'

// Contract guard for #333 / #355: game-kit's own tsconfig extends the app-kit SvelteKit
// preset directly (game-kit layers no preset of its own), and `jgame sync` delegates
// tsconfig normalization to a `josh sync` step that runs
// `strip_redundant_compiler_options` against the extended base — dropping compilerOptions
// keys whose value equals the base while preserving genuine overrides. These tests pin
// the data contract the delegation relies on, using real files only (no internal imports):
// if the app-kit preset flipped `noEmitOnError` to false, or game-kit dropped its override,
// the strip would silently change game-kit's effective config.

const APP_KIT_SVELTEKIT_PRESET = './node_modules/@joshuafolkken/app-kit/tsconfig/sveltekit.jsonc'
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const GAME_KIT_TSCONFIG_PATH = path.join(REPO_ROOT, 'tsconfig.json')
const APP_KIT_BASE_PRESET_PATH = path.join(
	REPO_ROOT,
	'node_modules/@joshuafolkken/app-kit/tsconfig/sveltekit.jsonc',
)

interface CompilerOptionsShape {
	noEmitOnError?: boolean
	[key: string]: unknown
}

interface TsconfigShape {
	extends?: string | ReadonlyArray<string>
	compilerOptions?: CompilerOptionsShape
}

// The kit base preset is JSONC: every comment sits on its own line, so dropping
// lines whose trimmed content starts with `//` is sufficient and string-safe.
function strip_line_comments(content: string): string {
	return content
		.split('\n')
		.filter((line) => !line.trim().startsWith('//'))
		.join('\n')
}

function extends_list(value: TsconfigShape['extends']): ReadonlyArray<string> {
	if (value === undefined) return []
	if (typeof value === 'string') return [value]

	return value
}

function find_redundant_keys(
	own_options: CompilerOptionsShape,
	base_options: CompilerOptionsShape,
): ReadonlyArray<string> {
	return Object.entries(own_options)
		.filter(
			([key, value]) =>
				Object.hasOwn(base_options, key) &&
				JSON.stringify(base_options[key]) === JSON.stringify(value),
		)
		.map(([key]) => key)
}

const game_kit_tsconfig = JSON.parse(readFileSync(GAME_KIT_TSCONFIG_PATH, 'utf8')) as TsconfigShape
const app_kit_base = JSON.parse(
	strip_line_comments(readFileSync(APP_KIT_BASE_PRESET_PATH, 'utf8')),
) as TsconfigShape

describe('consumer tsconfig normalization contract (#333 / #355)', () => {
	it('app-kit sveltekit preset sets noEmitOnError to true, so a consumer false override is divergent and preserved by josh sync', () => {
		// If the preset ever set this to false, game-kit's `noEmitOnError: false` would become
		// redundant and `strip_redundant_compiler_options` would drop it — silently breaking
		// the `svelte-package` emit that depends on it.
		expect(app_kit_base.compilerOptions?.noEmitOnError).toBe(true)
	})

	it("game-kit's own tsconfig extends the app-kit sveltekit preset and keeps noEmitOnError:false as a genuine override", () => {
		expect(extends_list(game_kit_tsconfig.extends)).toContain(APP_KIT_SVELTEKIT_PRESET)
		expect(game_kit_tsconfig.compilerOptions?.noEmitOnError).toBe(false)
	})

	it("game-kit's own compilerOptions carries no key redundant with the app-kit preset (already in the normalized state josh sync produces)", () => {
		const base_options = app_kit_base.compilerOptions ?? {}
		const own_options = game_kit_tsconfig.compilerOptions ?? {}

		expect(find_redundant_keys(own_options, base_options)).toEqual([])
	})
})

describe('jgame sync delegates consumer tsconfig normalization (#333)', () => {
	it('does not manage tsconfig.json among the templates-copied files (delegated to josh sync)', () => {
		// A verbatim copy here would shadow josh sync's strip and clobber consumer overrides.
		const managed_destinations = jgame_sync.SYNC_FILES.map((entry) => entry.dest)

		expect(managed_destinations).not.toContain('tsconfig.json')
	})

	it('does not byte-copy tsconfig.json from the package root', () => {
		expect(jgame_root_files.ROOT_COPY_FILES).not.toContain('tsconfig.json')
	})
})
