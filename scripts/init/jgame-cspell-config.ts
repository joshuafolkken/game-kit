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
// That keeps cspell.config.yaml 100% game-kit-owned so jgame sync can refresh it every bump
// without deleting the consumer's words.
const CONFIG_FILENAME = 'cspell.config.yaml'
const PROJECT_WORDS_FILENAME = 'project-words.txt'

const SCAFFOLD_CSPELL_CONFIG = `version: '0.2'
import:
  - '@joshuafolkken/game-kit/cspell/game'
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

// A bare `words:` line opens the inline block; `words: []` (no children) does not match.
function is_words_block_header(line: string): boolean {
	return /^words:\s*$/u.test(line)
}

const LIST_ITEM_PREFIX = '- '

// The word from a `  - foo` list item, or null when the line is not a list item. String-based
// (not a regex) to sidestep catastrophic-backtracking lint on a `\s+-\s+(.+)` pattern.
function parse_list_item(line: string): string | null {
	const trimmed = line.trim()
	if (!trimmed.startsWith(LIST_ITEM_PREFIX)) return null

	return unquote(trimmed.slice(LIST_ITEM_PREFIX.length).trim())
}

// A line starting in column 0 (e.g. `ignorePaths:`) ends the indented words block.
function is_block_terminator(line: string): boolean {
	return /^\S/u.test(line)
}

// The lines of the inline `words:` block, or [] when the config has no such block. Sliced out
// between the header and the first column-0 line so the parse stays flat (low complexity).
function words_block_lines(config: string): Array<string> {
	const lines = config.split('\n')
	const header_index = lines.findIndex((line) => is_words_block_header(line))
	if (header_index === -1) return []

	const body = lines.slice(header_index + 1)
	const end_index = body.findIndex((line) => is_block_terminator(line))

	return end_index === -1 ? body : body.slice(0, end_index)
}

// Pulls the words out of a legacy inline `words:` block so they can be migrated to
// project-words.txt before the config is overwritten. Deliberately line-based (cspell `words`
// are flat string scalars) to avoid pulling a YAML parser into the published bin.
function extract_words_from_config(config: string): Array<string> {
	return words_block_lines(config)
		.map((line) => parse_list_item(line))
		.filter((word): word is string => word !== null)
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

function write_cspell_config(project_directory: string): void {
	const config_path = path.join(project_directory, CONFIG_FILENAME)
	const words_path = path.join(project_directory, PROJECT_WORDS_FILENAME)
	const existing_config = read_text_or_null(config_path)
	const migrated = existing_config === null ? [] : extract_words_from_config(existing_config)
	const words_file = build_project_words_file(read_text_or_null(words_path), migrated)

	if (words_file !== null) {
		writeFileSync(words_path, words_file)
		console.info(`  ✔ wrote    ${PROJECT_WORDS_FILENAME} (consumer-owned cspell words)`)
	}

	writeFileSync(config_path, generate_cspell_config())
	console.info(`  ✔ wrote    ${CONFIG_FILENAME} (game-aware words via @joshuafolkken/game-kit)`)
}

const jgame_cspell_config = {
	generate_cspell_config,
	write_cspell_config,
	extract_words_from_config,
	build_project_words_file,
}
export { jgame_cspell_config }
