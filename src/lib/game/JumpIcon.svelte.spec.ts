import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-svelte'
import JumpIcon from './JumpIcon.svelte'

describe('JumpIcon', () => {
	it('renders an SVG with viewBox 0 0 40 40 (matches controls-preview Jump C)', () => {
		const { container } = render(JumpIcon)
		const svg = container.querySelector('svg')
		expect(svg?.getAttribute('viewBox')).toBe('0 0 40 40')
	})

	it('renders at text-sized 20x20 dimensions', () => {
		const { container } = render(JumpIcon)
		const svg = container.querySelector('svg')
		expect(svg?.getAttribute('width')).toBe('20')
		expect(svg?.getAttribute('height')).toBe('20')
	})

	it('has two polyline elements for double chevron', () => {
		const { container } = render(JumpIcon)
		expect(container.querySelectorAll('polyline')).toHaveLength(2)
	})

	it('uses original Jump C coordinates (bottom solid, top animated)', () => {
		const { container } = render(JumpIcon)
		const polylines = Array.from(container.querySelectorAll('polyline'))
		expect(polylines[0]?.getAttribute('points')).toBe('8,27 20,15 32,27')
		expect(polylines[1]?.getAttribute('points')).toBe('8,19 20,7 32,19')
		expect(polylines[1]?.classList.contains('chevron-top')).toBe(true)
	})
})
