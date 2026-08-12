import { describe, expect, it } from 'vitest'
import { version_range } from './version-range.ts'

describe('version_range.floor_of', () => {
	it.each([
		['^0.36.0', '0.36.0'],
		['~1.2.3', '1.2.3'],
		['>=0.38.0', '0.38.0'],
		['1.2.3', '1.2.3'],
		['  ^2.0.0  ', '2.0.0'],
	])('reads the floor of %s', (range, expected) => {
		expect(version_range.floor_of(range)).toBe(expected)
	})

	it.each([
		// No floor at all — reading `2.0.0` out of this would invert every comparison.
		['<2.0.0'],
		['*'],
		['x'],
		['^1.0.0 || ^2.0.0'],
		['>=1.0.0 <2.0.0'],
		['github:owner/repo#v1.2.3'],
		['workspace:*'],
		[''],
	])('reports %s as unknown rather than guessing', (range) => {
		expect(version_range.floor_of(range)).toBeUndefined()
	})
})

describe('version_range.compare', () => {
	it('orders by numeric segment, not lexically', () => {
		// The case a string sort gets backwards, and the reason this exists at all.
		expect(version_range.compare('0.9.0', '0.10.0')).toBeLessThan(0)
	})

	it('orders across a major boundary', () => {
		expect(version_range.compare('1.2.3', '0.38.0')).toBeGreaterThan(0)
	})

	it('treats a missing segment as zero', () => {
		expect(version_range.compare('1.2', '1.2.0')).toBe(0)
	})

	it('reports equal versions as equal', () => {
		expect(version_range.compare('0.38.0', '0.38.0')).toBe(0)
	})
})

describe('version_range.is_below', () => {
	it('reports a pin under the required floor', () => {
		// The #416 case: templates import @joshuafolkken/app-kit/security, added in 0.38.0.
		expect(version_range.is_below('^0.36.0', '>=0.38.0')).toBe(true)
	})

	it('does not report a pin exactly at the floor', () => {
		expect(version_range.is_below('^0.38.0', '>=0.38.0')).toBe(false)
	})

	it('does not report a pin above the floor, so an upgraded consumer is never downgraded', () => {
		expect(version_range.is_below('^0.71.0', '>=0.38.0')).toBe(false)
	})

	it.each([
		['*', '>=0.38.0'],
		['^0.36.0', '*'],
	])('leaves the unreadable pair %s / %s alone', (candidate, required) => {
		// Rewriting a range we could not parse is worse than the drift it would fix.
		expect(version_range.is_below(candidate, required)).toBe(false)
	})
})
