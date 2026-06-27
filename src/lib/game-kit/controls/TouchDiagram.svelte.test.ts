import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-svelte'
import TouchDiagram from './TouchDiagram.svelte'

const PROPS = { label_move: 'Move', label_look: 'Look around', label_action: 'Action' }
const ATTR_ARIA_LABEL = 'aria-label'
const SEL_MOVE_GESTURE = 'svg.move-gesture'
const SEL_LOOK_GESTURE = 'svg.look-gesture'
const VIEWBOX_GESTURE = '27 14 58 54'
const COLOR_CYBER_PURPLE = '160,130,255'

describe('TouchDiagram', () => {
	it('renders the touch-diagram container with role and aria-label', () => {
		const { container } = render(TouchDiagram, { props: PROPS })
		const diagram = container.querySelector('.touch-diagram')

		expect(diagram).toBeTruthy()
		expect(diagram?.getAttribute('role')).toBe('img')
		expect(diagram?.getAttribute(ATTR_ARIA_LABEL)).toContain(PROPS.label_move)
		expect(diagram?.getAttribute(ATTR_ARIA_LABEL)).toContain(PROPS.label_look)
		expect(diagram?.getAttribute(ATTR_ARIA_LABEL)).toContain(PROPS.label_action)
	})

	it('renders a frame and two halves so width can stretch with viewport', () => {
		const { container } = render(TouchDiagram, { props: PROPS })

		expect(container.querySelector('[data-testid="touch-diagram-frame"]')).toBeTruthy()
		expect(container.querySelectorAll(':scope .frame .half')).toHaveLength(2)
	})

	it('renders move-gesture and look-gesture as separate fixed-size SVGs', () => {
		const { container } = render(TouchDiagram, { props: PROPS })

		expect(container.querySelector(SEL_MOVE_GESTURE)).toBeTruthy()
		expect(container.querySelector(SEL_LOOK_GESTURE)).toBeTruthy()
	})

	it('gesture viewBox encompasses full arc extent (no clipping at top/sides)', () => {
		const { container } = render(TouchDiagram, { props: PROPS })
		const move = container.querySelector(SEL_MOVE_GESTURE)
		const look = container.querySelector(SEL_LOOK_GESTURE)

		expect(move?.getAttribute('viewBox')).toBe(VIEWBOX_GESTURE)
		expect(look?.getAttribute('viewBox')).toBe(VIEWBOX_GESTURE)
	})

	it('does not render any visible label text', () => {
		const { container } = render(TouchDiagram, { props: PROPS })
		const texts = [...container.querySelectorAll('text')]

		expect(texts).toHaveLength(0)
	})

	it('gesture strokes use cyber-purple color (matches PC keyboard/mouse diagrams)', () => {
		const { container } = render(TouchDiagram, { props: PROPS })
		const path = container.querySelector(':scope svg.move-gesture path')
		const ring = container.querySelector(':scope svg.move-gesture circle')

		expect(path?.getAttribute('stroke')).toContain(COLOR_CYBER_PURPLE)
		expect(ring?.getAttribute('stroke')).toContain(COLOR_CYBER_PURPLE)
	})
})
