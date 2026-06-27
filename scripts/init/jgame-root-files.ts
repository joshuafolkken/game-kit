import { cpSync, mkdirSync } from 'node:fs'
import path from 'node:path'

// Files that are byte-identical to a repo-root source AND are not imported by
// any remaining template file, so they can be removed from templates/ and
// copied directly from the package root at scaffold time. The repo root is the
// single source of truth; package.json `files` ships each path so `jgame init`
// / `jgame sync` can read it from the installed package. A maintainer guard
// would be redundant here — there is only one copy (the root file itself), so
// it cannot drift. Import-coupled byte copies (layout.css, Score.svelte.ts)
// stay under templates/ as COPY_PAIRS instead (see template-source-logic.ts).
//
// `src/app.d.ts` is intentionally NOT copied: app-kit's `josh-app init` overlay seeds a
// Cloudflare-aware app.d.ts (Platform/Env via worker-configuration.d.ts) that game-kit's
// bare default lacks, and seeding only happens when the file is absent — so jgame leaves
// it for app-kit to own (#357).
const ROOT_COPY_FILES: ReadonlyArray<string> = ['svelte.config.js']

const ROOT_COPY_FILE_SET: ReadonlySet<string> = new Set(ROOT_COPY_FILES)

function is_root_copy_file(relative_path: string): boolean {
	return ROOT_COPY_FILE_SET.has(relative_path)
}

function copy_root_file(
	relative_path: string,
	package_directory: string,
	project_directory: string,
): void {
	const source = path.join(package_directory, relative_path)
	const destination = path.join(project_directory, relative_path)

	mkdirSync(path.dirname(destination), { recursive: true })
	cpSync(source, destination)
}

const jgame_root_files = { ROOT_COPY_FILES, is_root_copy_file, copy_root_file }
export { jgame_root_files }
