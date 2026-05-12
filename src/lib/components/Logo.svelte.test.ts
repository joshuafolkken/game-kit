import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-svelte'
import Logo from './Logo.svelte'

const CUSTOM_SIZE = 128
const CUSTOM_ARIA_LABEL = 'Test Label'
const EXPECTED_VIEW_BOX = '20 18 45 59'
const DEFAULT_SIZE_STRING = '96'
const DEFAULT_ARIA_LABEL = 'Geometric JF Fusion Logo'

describe('Logo', () => {
	it('renders an svg with the expected viewBox', () => {
		const { container } = render(Logo)
		const svg = container.querySelector('svg')
		expect(svg).toBeTruthy()
		expect(svg?.getAttribute('viewBox')).toBe(EXPECTED_VIEW_BOX)
	})

	it('uses the default size when no prop is given', () => {
		const { container } = render(Logo)
		const svg = container.querySelector('svg')
		expect(svg?.getAttribute('width')).toBe(DEFAULT_SIZE_STRING)
	})

	it('reflects the size prop on the width attribute', () => {
		const { container } = render(Logo, { size: CUSTOM_SIZE })
		const svg = container.querySelector('svg')
		expect(svg?.getAttribute('width')).toBe(String(CUSTOM_SIZE))
	})

	it('uses the default aria-label when no prop is given', () => {
		const { container } = render(Logo)
		const svg = container.querySelector('svg')
		expect(svg?.getAttribute('aria-label')).toBe(DEFAULT_ARIA_LABEL)
	})

	it('reflects the aria_label prop on the aria-label attribute', () => {
		const { container } = render(Logo, { aria_label: CUSTOM_ARIA_LABEL })
		const svg = container.querySelector('svg')
		expect(svg?.getAttribute('aria-label')).toBe(CUSTOM_ARIA_LABEL)
	})

	it('generates a unique filter id per instance', () => {
		const first = render(Logo)
		const second = render(Logo)
		const first_id = first.container.querySelector('filter')?.getAttribute('id')
		const second_id = second.container.querySelector('filter')?.getAttribute('id')
		expect(first_id).toBeTruthy()
		expect(second_id).toBeTruthy()
		expect(first_id).not.toBe(second_id)
	})
})
