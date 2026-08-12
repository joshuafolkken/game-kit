// Minimal version-range reasoning for the managed-dependency floor check in `josh-game sync`.
//
// Deliberately NOT semver: the only shapes in play are what `to_caret_range` emits (`^x.y.z`) and
// what a consumer hand-pins, and the one question asked is "does this range admit a version below
// the floor game-kit requires?". Anything more expressive — `*`, `<2`, a union, a git URL — is
// reported as unknown so the caller leaves the pin untouched rather than guessing at it. Adding
// `semver` as a dependency to answer a yes/no question about caret ranges is not worth the weight.

// `^0.36.0`, `~1.2.3`, `>=0.38.0` and a bare `1.2.3` all expose their floor directly. A range with
// an upper bound, a union, or a wildcard deliberately does not match: `<2.0.0` has no floor at all,
// and reading `2.0.0` out of it would invert the comparison.
const SIMPLE_RANGE_REGEX = /^(?:\^|~|>=)?(\d+(?:\.\d+)*)$/u
const VERSION_SEPARATOR = '.'

/** The lowest version the range admits, or undefined when the shape is not one we reason about. */
function floor_of(range: string): string | undefined {
	return SIMPLE_RANGE_REGEX.exec(range.trim())?.[1]
}

// Numeric per-segment order, because string order gets `0.9.0` vs `0.10.0` backwards. Missing
// segments count as 0, so `1.2` and `1.2.0` compare equal.
function compare(left: string, right: string): number {
	const left_parts = left.split(VERSION_SEPARATOR).map(Number)
	const right_parts = right.split(VERSION_SEPARATOR).map(Number)
	const length = Math.max(left_parts.length, right_parts.length)
	const difference = Array.from(
		{ length },
		(_, index) => (left_parts[index] ?? 0) - (right_parts[index] ?? 0),
	).find((value) => value !== 0)

	return difference ?? 0
}

/**
 * Whether `candidate` admits a version below what `required` demands.
 *
 * False whenever either side is a shape `floor_of` does not accept — an unknown range is left
 * alone, never "raised", because silently rewriting a pin we could not read is worse than the drift
 * it would fix.
 */
function is_below(candidate: string, required: string): boolean {
	const candidate_floor = floor_of(candidate)
	const required_floor = floor_of(required)
	if (candidate_floor === undefined || required_floor === undefined) return false

	return compare(candidate_floor, required_floor) < 0
}

const version_range = { floor_of, compare, is_below }

export { version_range }
