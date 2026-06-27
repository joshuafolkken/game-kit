import { execSync } from 'node:child_process'
import {
	cpSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	statSync,
	writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { jgame_cspell_config } from './jgame-cspell-config.ts'
import { jgame_eslint_config } from './jgame-eslint-config.ts'
import { jgame_managed_dev_deps as jgame_managed_development_deps } from './jgame-managed-development-deps.ts'
import { jgame_paths } from './jgame-paths.ts'
import { jgame_root_files } from './jgame-root-files.ts'

const SPAWN_OPTIONS = { stdio: 'inherit' as const }
// templates/tsconfig.json only type-checks the templates/ directory inside game-kit
// itself; the scaffolded project's tsconfig.json is owned by `pnpm josh init` (an
// extends-only config reaching the kit base), so the template must never be copied —
// its compilerOptions would survive the kit's extends-merge and contradict the base
// (e.g. noEmitOnError). See #326.
const TSCONFIG_FILE_NAME = 'tsconfig.json'
const GAME_KIT_PACKAGE_NAME = '@joshuafolkken/game-kit'
// npm strips `.npmrc` from published packages regardless of the `files` field,
// so the template is shipped under a non-dotfile name and renamed on copy.
const NPMRC_SRC_NAME = 'npmrc'
const NPMRC_DEST_NAME = '.npmrc'

interface PackageManagerEngine {
	name: string
	version: string
	onFail?: string
}

interface DevelopmentEngines {
	packageManager: PackageManagerEngine
}

interface GameKitPackage {
	version: string
	scripts: Record<string, string>
	devDependencies: Record<string, string>
	devEngines: DevelopmentEngines
}

interface GameNames {
	kebab: string
	display: string
	upper: string
	description: string
	app_label: string
}

function to_kebab(raw: string): string {
	return raw
		.toLowerCase()
		.trim()
		.replaceAll(/\s+/gu, '-')
		.replaceAll(/[^\da-z-]/gu, '')
		.replaceAll(/^-+/gu, '')
		.replaceAll(/(?<=[^-]|^)-+$/gu, '')
}

function build_done_message(kebab: string): string {
	return [
		'\n✅ Done.',
		'',
		'Next steps:',
		`  cd ${kebab}`,
		`  gh repo create ${kebab} --private --source=. --push`,
		'  pnpm dev',
		'',
	].join('\n')
}

function to_display(kebab: string): string {
	return kebab
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
}

function derive_names(raw: string): GameNames {
	const kebab = to_kebab(raw)
	const display = to_display(kebab)
	const upper = display.toUpperCase()

	return { kebab, display, upper, description: `A ${display} game`, app_label: `${display} game` }
}

function read_game_kit_package(): GameKitPackage {
	const raw = readFileSync(path.join(jgame_paths.PACKAGE_DIR, 'package.json'), 'utf8')

	return JSON.parse(raw) as GameKitPackage
}

// `pnpm pack` strips the `packageManager` field from the published `package.json`,
// so the kit cannot supply its own pin to scaffolded projects. Falling back to the
// host pnpm gives an exact-semver value that Node v25 / pnpm 11 accept for the
// generated `packageManager`, paired with a host-floor `devEngines` (see below).
function detect_host_pnpm_version(): string {
	return execSync('pnpm --version').toString().trim()
}

// The scaffold's `packageManager` is pinned to the host's exact pnpm. game-kit's own
// `devEngines` pins an EXACT version (its internal toolchain), so copying it verbatim
// made the scaffold's `pnpm install` abort under `onFail: error` whenever the host pnpm
// differed by even a patch (e.g. host 11.5.1 vs copied 11.5.0). Emitting a host-floor
// range instead keeps the generated `packageManager` (pnpm@<host>) always satisfying the
// generated `devEngines` (>=<host>), independent of game-kit's internal pin. See #283.
function build_development_engines(
	source: DevelopmentEngines,
	host_pnpm_version: string,
): DevelopmentEngines {
	return {
		packageManager: { ...source.packageManager, version: `>=${host_pnpm_version}` },
	}
}

// Only the game-specific scripts. The Cloudflare lifecycle (`preview`, `prepare`,
// `prepare:gen`, `prepare:sync`, `prepare:lefthook`, `prepare:gh-packages`, `gen`,
// `gen:pre`) is owned by app-kit and merged in by `josh-app init`'s overlay (#357,
// app-kit#27) — game-kit no longer redefines those keys. They are absent from this
// initial package.json, so the scaffold's first `pnpm install` has no CF `prepare` to
// run before `josh-app init` seeds wrangler.jsonc; the overlay adds the lifecycle
// afterward, and a later install runs the (fail-loud) `prepare:gen` against the now-valid
// seeded config (app-kit#56).
function build_scripts(): Record<string, string> {
	return {
		preinstall: 'pnpm dlx @aikidosec/safe-chain setup-ci',
		dev: 'vite dev',
		build: 'vite build',
		jgame: 'jgame',
		josh: 'josh',
	}
}

// Generated games are SvelteKit apps that bundle game-kit at build time (it is not
// re-published as a library), so game-kit belongs in `devDependencies` — and `jgame vu`
// already enforces this via `pnpm add -D`. Scaffolding it here too means the first
// `jgame vu` produces no dependency-field churn. Keys are sorted lexicographically so
// game-kit lands in the same slot `pnpm add -D` would place it (right before
// `@joshuafolkken/kit`), avoiding key-order churn as well. See #301.
function build_development_dependencies(package_: GameKitPackage): Record<string, string> {
	const merged = {
		...jgame_managed_development_deps.pick_required_deps(package_.devDependencies),
		[GAME_KIT_PACKAGE_NAME]: `^${package_.version}`,
	}

	return Object.fromEntries(
		Object.entries(merged).toSorted(([left], [right]) => (left < right ? -1 : 1)),
	)
}

function build_package_json(package_: GameKitPackage, game_name: string): object {
	const host_pnpm_version = detect_host_pnpm_version()

	return {
		name: game_name,
		version: '0.1.0',
		private: true,
		type: 'module',
		scripts: build_scripts(),
		devDependencies: build_development_dependencies(package_),
		packageManager: `pnpm@${host_pnpm_version}`,
		devEngines: build_development_engines(package_.devEngines, host_pnpm_version),
	}
}

function generate_package_json(game_name: string): string {
	return JSON.stringify(build_package_json(read_game_kit_package(), game_name), null, '\t')
}

function generate_game_config(names: GameNames): string {
	return [
		`const GAME_NAME = '${names.kebab}'`,
		`const GAME_NAME_DISPLAY = '${names.display}'`,
		`const GAME_NAME_UPPER = '${names.upper}'`,
		`const GAME_DESCRIPTION = '${names.description}'`,
		`const GAME_APP_LABEL = '${names.app_label}'`,
		'',
		'const game_config = {',
		'\tGAME_NAME,',
		'\tGAME_NAME_DISPLAY,',
		'\tGAME_NAME_UPPER,',
		'\tGAME_DESCRIPTION,',
		'\tGAME_APP_LABEL,',
		'}',
		'export { game_config }',
		'',
	].join('\n')
}

function write_package_json(game_name: string, project_directory: string): void {
	writeFileSync(path.join(project_directory, 'package.json'), generate_package_json(game_name))
	console.info('  ✔ wrote    package.json')
}

function write_game_config(names: GameNames, project_directory: string): void {
	const destination = path.join(project_directory, 'src', 'lib', 'game-config.ts')

	writeFileSync(destination, generate_game_config(names))
	console.info('  ✔ wrote    src/lib/game-config.ts')
}

function should_copy_template(source: string): boolean {
	const name = path.basename(source)

	return name !== TSCONFIG_FILE_NAME && name !== NPMRC_SRC_NAME
}

function copy_templates(project_directory: string): void {
	cpSync(jgame_paths.TEMPLATES_DIR, project_directory, {
		recursive: true,
		filter: should_copy_template,
	})
	console.info('  ✔ copied   templates')
}

// Byte-identical files live only at the repo root (single source) and are copied
// straight from the installed package, not duplicated into templates/. See
// jgame-root-files.ts.
function copy_root_files(project_directory: string): void {
	for (const relative_path of jgame_root_files.ROOT_COPY_FILES) {
		jgame_root_files.copy_root_file(relative_path, jgame_paths.PACKAGE_DIR, project_directory)
	}

	console.info('  ✔ copied   root-sourced files')
}

function write_npmrc(project_directory: string): void {
	const source = path.join(jgame_paths.TEMPLATES_DIR, NPMRC_SRC_NAME)
	const destination = path.join(project_directory, NPMRC_DEST_NAME)

	cpSync(source, destination)
	console.info(`  ✔ wrote    ${NPMRC_DEST_NAME}`)
}

// Preflight guard (#273): refuse to scaffold onto an existing target so a stray name
// collision cannot silently overwrite real user files. Must run BEFORE any mkdirSync /
// writeFileSync / cpSync / execSync touches the target. An existing EMPTY directory is
// fine (the common "I made the folder first" case); an existing file or a non-empty
// directory is refused. The `isDirectory()` short-circuit keeps readdirSync from
// throwing ENOTDIR when the path is a file.
function assert_empty_target(project_directory: string, kebab: string): void {
	if (!existsSync(project_directory)) return

	const is_empty_directory =
		statSync(project_directory).isDirectory() && readdirSync(project_directory).length === 0
	if (is_empty_directory) return

	console.error(`Error: "${kebab}" already exists. Remove it or choose a different name.`)
	process.exit(1)
}

// eslint-disable-next-line max-statements -- CLI entry point: a linear validate -> scaffold -> write sequence that reads better as one run() than fragmented. See #250.
function run(game_name_raw?: string): void {
	if (!game_name_raw) {
		console.error('Error: game name is required.\nUsage: jgame init <name>')
		process.exit(1)
	}

	const names = derive_names(game_name_raw)

	if (!names.kebab) {
		console.error(
			`Error: "${game_name_raw}" is not a valid game name. Use letters, numbers, and hyphens only (e.g. tic-tac-toe).`,
		)
		process.exit(1)
	}

	const project_directory = path.join(jgame_paths.PROJECT_ROOT, names.kebab)
	const opts = { ...SPAWN_OPTIONS, cwd: project_directory }

	assert_empty_target(project_directory, names.kebab)

	console.info('\n🎮 jgame init — Scaffolding new game project\n')
	mkdirSync(project_directory, { recursive: true })
	write_package_json(names.kebab, project_directory)
	copy_templates(project_directory)
	copy_root_files(project_directory)
	write_npmrc(project_directory)
	write_game_config(names, project_directory)
	execSync('git init', opts)
	execSync('pnpm install', opts)
	// Delegate to app-kit's `josh-app` (= kit's `josh` base + the SvelteKit + Cloudflare
	// overlay): `init` scaffolds and seeds the CF app-shell (app.html/app.d.ts/wrangler.jsonc),
	// the CF managed-scripts, and reconciles cspell/tsconfig to app-kit's presets; `sync` then
	// refreshes the kit-managed files (`josh sync` early-returns on missing configs, so the
	// canonical `init` runs first) (#357, app-kit#27/#29). game-kit overlays only its game layer.
	execSync('pnpm josh-app init', opts)
	execSync('pnpm josh-app sync', opts)
	// Overwrite the bare eslint.config.js the base wrote with one that relaxes the strict defaults
	// for src/lib/game/** (#260). The base never overwrites an existing eslint.config.js, so this
	// stays put on the user's later syncs. (app.html — the game shell — is overwritten by the
	// templates copy above, taking precedence over app-kit's seeded generic shell.)
	jgame_eslint_config.write_eslint_config(project_directory)
	// Override the bare cspell.config.yaml with one that pulls the game-aware word set from
	// `@joshuafolkken/game-kit/cspell/game` (which chains app-kit/cspell/sveltekit), so the scaffold
	// passes `josh cspell:dot` out of the box (#286).
	jgame_cspell_config.write_cspell_config(project_directory)
	console.info(build_done_message(names.kebab))
}

const jgame_init = {
	run,
	generate_package_json,
	derive_names,
	generate_game_config,
}
export { jgame_init }
