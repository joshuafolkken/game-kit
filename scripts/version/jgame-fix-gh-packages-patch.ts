const RESOLUTION_BLOCK = '\n    resolution:\n'
const INTEGRITY_PREFIX = '      integrity: '
const TARBALL_PREFIX = '      tarball: '
const FLOW_RESOLUTION_LINE_START = '\n    resolution: {'
const FLOW_TARBALL_KEY = ', tarball: '
const NEXT_ENTRY_PATTERN = /\n {2}['"]/u
const FLOW_TARBALL_PRESENT_PATTERN = /\btarball\s*:/u

function find_entry_start(content: string, package_key: string): number {
	const single = content.indexOf(`\n  '${package_key}':\n`)
	if (single !== -1) return single

	return content.indexOf(`\n  "${package_key}":\n`)
}

function find_entry_end(content: string, entry_start: number): number {
	const next_match = NEXT_ENTRY_PATTERN.exec(content.slice(entry_start + 1))

	return next_match === null ? content.length : entry_start + 1 + next_match.index
}

function find_integrity_eol_in_entry(entry_content: string): number {
	const resolution_pos = entry_content.indexOf(RESOLUTION_BLOCK)
	if (resolution_pos === -1) return -1
	const integrity_pos = entry_content.indexOf(INTEGRITY_PREFIX, resolution_pos)
	if (integrity_pos === -1) return -1

	return entry_content.indexOf('\n', integrity_pos)
}

function find_flow_resolution_brace(entry_content: string): number {
	const pos = entry_content.indexOf(FLOW_RESOLUTION_LINE_START)
	if (pos === -1) return -1
	const line_end = entry_content.indexOf('\n', pos + 1)
	const search_end = line_end === -1 ? entry_content.length : line_end
	const brace = entry_content.lastIndexOf('}', search_end)
	if (brace <= pos) return -1

	return brace
}

function insert_expanded_tarball(
	content: string,
	entry_start: number,
	entry_end: number,
	tarball: string,
): string | undefined {
	const entry_content = content.slice(entry_start, entry_end)
	const integrity_eol = find_integrity_eol_in_entry(entry_content)
	if (integrity_eol === -1) return undefined
	if (entry_content.slice(integrity_eol + 1).startsWith(TARBALL_PREFIX)) return content
	const head = entry_content.slice(0, integrity_eol + 1)
	const patched = `${head}${TARBALL_PREFIX}${tarball}\n${entry_content.slice(integrity_eol + 1)}`

	return content.slice(0, entry_start) + patched + content.slice(entry_end)
}

function insert_flow_tarball(
	content: string,
	entry_start: number,
	entry_end: number,
	tarball: string,
): string | undefined {
	const entry_content = content.slice(entry_start, entry_end)
	const brace_pos = find_flow_resolution_brace(entry_content)
	if (brace_pos === -1) return undefined
	const open_brace = entry_content.lastIndexOf('{', brace_pos)
	if (open_brace === -1) return undefined
	const flow_body = entry_content.slice(open_brace + 1, brace_pos)
	if (FLOW_TARBALL_PRESENT_PATTERN.test(flow_body)) return content
	const patched = `${entry_content.slice(0, brace_pos)}${FLOW_TARBALL_KEY}${tarball}${entry_content.slice(brace_pos)}`

	return content.slice(0, entry_start) + patched + content.slice(entry_end)
}

function insert_tarball_for_key(content: string, package_key: string, tarball: string): string {
	const entry_start = find_entry_start(content, package_key)
	if (entry_start === -1) return content
	const entry_end = find_entry_end(content, entry_start)

	return (
		insert_expanded_tarball(content, entry_start, entry_end, tarball) ??
		insert_flow_tarball(content, entry_start, entry_end, tarball) ??
		content
	)
}

function patch_lockfile(content: string, patches: Map<string, string>): string {
	let result = content

	for (const [key, tarball] of patches) {
		result = insert_tarball_for_key(result, key, tarball)
	}

	return result
}

const jgame_fix_gh_packages_patch = {
	find_entry_start,
	find_entry_end,
	insert_tarball_for_key,
	patch_lockfile,
}

export { jgame_fix_gh_packages_patch }
