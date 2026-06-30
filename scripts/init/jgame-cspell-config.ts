import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

// Single source of truth for the scaffold's cspell.config.yaml. Both `jgame init` (new
// projects) and `jgame sync` (existing projects self-heal) write this so they cannot drift.
//
// `josh init` writes a bare cspell.config.yaml that imports only `@joshuafolkken/kit/cspell/sveltekit`,
// so every game-template word (gameover, threlte, COEFF, …) and the credits proper nouns trip
// `josh cspell:dot` in the generated project. We override it to import
// `@joshuafolkken/game-kit/cspell/game` (the scaffold already depends on game-kit), which carries
// the game-common words and the credits ignore — they then flow on a dependency bump (#286).
//
// Consumer project words (game nouns, character names) live in a SEPARATE, never-synced file
// (project-words.txt) referenced as a custom dictionary, NOT inline in this config (game-kit#375).
// Consumer ignorePaths live in a SEPARATE, never-synced cspell.project.yaml that this config
// imports — cspell unions ignorePaths across the config and its imports (game-kit#385). Both keep
// cspell.config.yaml 100% game-kit-owned so jgame sync can refresh it every bump without deleting
// the consumer's words or ignore paths.
const CONFIG_FILENAME = 'cspell.config.yaml'
const PROJECT_WORDS_FILENAME = 'project-words.txt'
const PROJECT_CSPELL_FILENAME = 'cspell.project.yaml'

const SCAFFOLD_CSPELL_CONFIG = `version: '0.2'
import:
  - '@joshuafolkken/game-kit/cspell/game'
  - ./cspell.project.yaml
dictionaryDefinitions:
  - name: project-words
    path: ./project-words.txt
    addWords: true
dictionaries:
  - project-words
ignorePaths: []
`

// Seeded once when project-words.txt does not exist. Consumer-owned thereafter: jgame sync
// never rewrites the file wholesale, it only appends words migrated out of a legacy inline
// `words:` list (game-kit#375).
const PROJECT_WORDS_HEADER = `# Project-specific cspell words — owned by this project.
# jgame sync never overwrites this file, so game nouns, character names, and other project
# terms added here survive every dependency bump (game-kit#375).
`

// Seeded once when cspell.project.yaml does not exist (migrating any ignorePaths out of a legacy
// inline config), then consumer-owned and never overwritten — so project ignore entries survive
// every bump (game-kit#385).
const PROJECT_CSPELL_HEADER = `version: '0.2'
# Project-specific cspell config — owned by this project. jgame sync never overwrites this file,
# so ignorePaths added here survive every dependency bump (game-kit#385). cspell.config.yaml
# imports it, and cspell unions ignorePaths across the config and its imports.
`

function generate_cspell_config(): string {
	return SCAFFOLD_CSPELL_CONFIG
}

// A quoted scalar needs at least an opening and closing quote.
const MIN_QUOTED_SCALAR_LENGTH = 2

// Removes a single layer of matching surrounding quotes from a YAML scalar.
function unquote(value: string): string {
	const has_quotes =
		value.length >= MIN_QUOTED_SCALAR_LENGTH && (value.startsWith("'") || value.startsWith('"'))
	if (has_quotes && value.at(-1) === value[0]) return value.slice(1, -1)

	return value
}

// A bare `<key>:` line opens the indented block; `<key>: []` / `<key>: [..]` (children on the
// same line) do not match — those are the inline flow form, handled separately.
function is_block_header(line: string, key: string): boolean {
	return line.trimEnd() === `${key}:`
}

const LIST_ITEM_PREFIX = '- '

// The scalar from a `  - foo` list item, or null when the line is not a list item. String-based
// (not a regex) to sidestep catastrophic-backtracking lint on a `\s+-\s+(.+)` pattern.
function parse_list_item(line: string): string | null {
	const trimmed = line.trim()
	if (!trimmed.startsWith(LIST_ITEM_PREFIX)) return null

	return unquote(trimmed.slice(LIST_ITEM_PREFIX.length).trim())
}

// A line starting in column 0 (e.g. the next top-level key) ends the indented block.
function is_block_terminator(line: string): boolean {
	return /^\S/u.test(line)
}

// The indented child lines under a `<key>:` block header, or [] when there is no such block.
// Sliced out between the header and the first column-0 line so the parse stays flat.
function block_lines(config: string, key: string): Array<string> {
	const lines = config.split('\n')
	const header_index = lines.findIndex((line) => is_block_header(line, key))
	if (header_index === -1) return []

	const body = lines.slice(header_index + 1)
	const end_index = body.findIndex((line) => is_block_terminator(line))

	return end_index === -1 ? body : body.slice(0, end_index)
}

// Items from the indented block form (`<key>:` newline + `  - item` children).
function extract_block_list(config: string, key: string): Array<string> {
	return block_lines(config, key)
		.map((line) => parse_list_item(line))
		.filter((item): item is string => item !== null)
}

function brace_delta(char: string): number {
	if (char === '{') return 1
	if (char === '}') return -1

	return 0
}

function is_top_level_comma(char: string, depth: number): boolean {
	return char === ',' && depth === 0
}

// Splits an inline flow body on top-level commas only, leaving commas inside `{...}` intact so a
// brace-expansion glob (e.g. `src/**/*.{gen,d}.ts`) is not shredded into corrupt fragments (#385).
function split_top_level_commas(inner: string): Array<string> {
	const items: Array<string> = []
	let depth = 0
	let current = ''

	for (const char of inner) {
		depth += brace_delta(char)

		if (is_top_level_comma(char, depth)) {
			items.push(current)
			current = ''

			continue
		}

		current += char
	}

	items.push(current)

	return items
}

// Items from the inline flow form (`<key>: [a, b]`). indexOf/slice (not a capturing regex) keeps
// the bracket extraction free of catastrophic backtracking. `<key>: []` yields [].
function extract_inline_list(config: string, key: string): Array<string> {
	const prefix = `${key}:`
	const line = config
		.split('\n')
		.find((candidate) => candidate.startsWith(prefix) && candidate.includes('['))
	if (line === undefined) return []

	const open_index = line.indexOf('[')
	const close_index = line.lastIndexOf(']')
	if (close_index <= open_index) return []

	return split_top_level_commas(line.slice(open_index + 1, close_index))
		.map((item) => unquote(item.trim()))
		.filter((item) => item.length > 0)
}

// Pulls a `<key>:` string list (indented block form or inline flow form) out of an existing cspell
// config so consumer-owned entries can be migrated before the config is overwritten. Deliberately
// line-based (cspell words/ignorePaths are flat string scalars) to avoid a YAML parser in the bin.
function extract_list_from_config(config: string, key: string): Array<string> {
	return [...extract_block_list(config, key), ...extract_inline_list(config, key)]
}

function extract_words_from_config(config: string): Array<string> {
	return extract_list_from_config(config, 'words')
}

function extract_ignore_paths_from_config(config: string): Array<string> {
	return extract_list_from_config(config, 'ignorePaths')
}

// The non-comment, non-blank word lines already present in a project-words.txt file.
function parse_word_lines(content: string): Array<string> {
	return content
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0 && !line.startsWith('#'))
}

function dedupe(words: Array<string>): Array<string> {
	return [...new Set(words)]
}

function render_new_words_file(migrated: Array<string>): string {
	const unique = dedupe(migrated)
	if (unique.length === 0) return PROJECT_WORDS_HEADER

	return `${PROJECT_WORDS_HEADER}${unique.join('\n')}\n`
}

// Decides what project-words.txt should contain. Returns null when the file already exists and
// has nothing new to add, so an existing consumer-owned file is left byte-for-byte untouched.
function build_project_words_file(existing: string | null, migrated: Array<string>): string | null {
	if (existing === null) return render_new_words_file(migrated)

	const present = new Set(parse_word_lines(existing))
	const additions = dedupe(migrated).filter((word) => !present.has(word))
	if (additions.length === 0) return null

	const separator = existing.length > 0 && !existing.endsWith('\n') ? '\n' : ''

	return `${existing}${separator}${additions.join('\n')}\n`
}

function read_text_or_null(file_path: string): string | null {
	return existsSync(file_path) ? readFileSync(file_path, 'utf8') : null
}

// The body of cspell.project.yaml for the given (migrated) ignore paths. Entries are single-quoted
// because cspell ignorePaths are commonly globs (`**/x`), and an unquoted leading `*` is a YAML
// alias indicator that fails to parse; `'` inside a value is escaped as `''` (game-kit#385).
function render_project_cspell_config(ignore_paths: Array<string>): string {
	const unique = dedupe(ignore_paths)
	if (unique.length === 0) return `${PROJECT_CSPELL_HEADER}ignorePaths: []\n`

	const entries = unique.map((entry) => `  - '${entry.replaceAll("'", "''")}'`).join('\n')

	return `${PROJECT_CSPELL_HEADER}ignorePaths:\n${entries}\n`
}

// cspell.project.yaml is consumer-owned: seeded once (carrying any ignorePaths migrated out of a
// legacy inline config) and never overwritten thereafter, so consumer ignore entries survive every
// sync. After seeding, the synced config holds `ignorePaths: []`, so later syncs have nothing to
// re-migrate and the file is left untouched (game-kit#385).
function write_project_cspell_config(project_directory: string, ignore_paths: Array<string>): void {
	const project_cspell_path = path.join(project_directory, PROJECT_CSPELL_FILENAME)
	if (existsSync(project_cspell_path)) return

	writeFileSync(project_cspell_path, render_project_cspell_config(ignore_paths))
	console.info(`  ✔ wrote    ${PROJECT_CSPELL_FILENAME} (consumer-owned cspell ignorePaths)`)
}

function write_cspell_config(project_directory: string): void {
	const config_path = path.join(project_directory, CONFIG_FILENAME)
	const words_path = path.join(project_directory, PROJECT_WORDS_FILENAME)
	const existing_config = read_text_or_null(config_path)
	const words = existing_config === null ? [] : extract_words_from_config(existing_config)
	const ignore_paths =
		existing_config === null ? [] : extract_ignore_paths_from_config(existing_config)
	const words_file = build_project_words_file(read_text_or_null(words_path), words)

	if (words_file !== null) {
		writeFileSync(words_path, words_file)
		console.info(`  ✔ wrote    ${PROJECT_WORDS_FILENAME} (consumer-owned cspell words)`)
	}

	write_project_cspell_config(project_directory, ignore_paths)
	writeFileSync(config_path, generate_cspell_config())
	console.info(`  ✔ wrote    ${CONFIG_FILENAME} (game-aware words via @joshuafolkken/game-kit)`)
}

const jgame_cspell_config = {
	generate_cspell_config,
	write_cspell_config,
	extract_words_from_config,
	extract_ignore_paths_from_config,
	build_project_words_file,
	render_project_cspell_config,
}
export { jgame_cspell_config }
