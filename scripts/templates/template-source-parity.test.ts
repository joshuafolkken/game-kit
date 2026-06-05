import { describe, expect, it } from 'vitest'
import { parse_source_manifest, template_source_logic } from './template-source-logic.ts'

describe('template source parity (committed state is in sync with root sources)', () => {
	it('has no copy-pair drift: every COPY_PAIRS template equals its root source', () => {
		expect(template_source_logic.find_copy_drift()).toEqual([])
	})

	it('has no tripwire drift: the recorded manifest matches current root source hashes', () => {
		const recorded = template_source_logic.read_recorded_manifest()

		expect(template_source_logic.find_tripwire_drift(recorded)).toEqual([])
	})

	it('records exactly the tripwire sources in the manifest (no stale or missing entries)', () => {
		const recorded = template_source_logic.read_recorded_manifest()
		const expected_sources = template_source_logic.TRIPWIRE_PAIRS.map((pair) => pair.source)

		// build_tripwire_manifest writes keys in TRIPWIRE_PAIRS order, and JSON
		// preserves insertion order, so a direct comparison needs no sorting.
		expect(Object.keys(recorded)).toEqual(expected_sources)
	})
})

describe('template source drift detection', () => {
	it('flags a tripwire source whose recorded hash no longer matches', () => {
		const tampered: Record<string, string> = {}

		for (const pair of template_source_logic.TRIPWIRE_PAIRS) tampered[pair.source] = 'stale-hash'

		const drift = template_source_logic.find_tripwire_drift(tampered)

		expect(drift).toEqual([...template_source_logic.TRIPWIRE_PAIRS])
	})

	it('builds a manifest whose hashes are stable for unchanged sources', () => {
		const first = template_source_logic.build_tripwire_manifest()
		const second = template_source_logic.build_tripwire_manifest()

		expect(first).toEqual(second)
		expect(template_source_logic.find_tripwire_drift(first)).toEqual([])
	})
})

describe('parse_source_manifest', () => {
	it('parses a string → hash object', () => {
		expect(parse_source_manifest('{"a.ts":"abc"}')).toEqual({ 'a.ts': 'abc' })
	})

	it('rejects a non-object payload', () => {
		expect(() => parse_source_manifest('42')).toThrow()
	})

	it('rejects a non-string hash value', () => {
		expect(() => parse_source_manifest('{"a.ts":123}')).toThrow()
	})
})
