import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MouseDiagram from './MouseDiagram.svelte';

const PROPS = { label_action: 'Action', label_look: 'Look around' };

describe('MouseDiagram', () => {
	it('renders the SVG diagram', () => {
		const { container } = render(MouseDiagram, { props: PROPS });
		expect(container.querySelector('svg.mouse-diagram')).toBeTruthy();
	});

	it('does not render visible action label text', () => {
		const { container } = render(MouseDiagram, { props: PROPS });
		const texts = Array.from(container.querySelectorAll('text'));
		const action = texts.find((t) => t.textContent?.trim() === PROPS.label_action);
		expect(action).toBeUndefined();
	});

	it('does not render visible look label text', () => {
		const { container } = render(MouseDiagram, { props: PROPS });
		const texts = Array.from(container.querySelectorAll('text'));
		const look = texts.find((t) => t.textContent?.trim() === PROPS.label_look);
		expect(look).toBeUndefined();
	});

	it('does not render scroll wheel', () => {
		const { container } = render(MouseDiagram, { props: PROPS });
		const rects = Array.from(container.querySelectorAll('rect'));
		const wheel = rects.find(
			(r) => r.getAttribute('rx') === '5' && r.getAttribute('width') === '10'
		);
		expect(wheel).toBeUndefined();
	});

	it('does not render drag arrow', () => {
		const { container } = render(MouseDiagram, { props: PROPS });
		expect(container.querySelector('.drag-arrow')).toBeNull();
	});

	it('uses viewBox "0 -7 90 120" so content is vertically centered', () => {
		const { container } = render(MouseDiagram, { props: PROPS });
		expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 -7 90 120');
	});

	it('all stroke-widths are <= 1 to match keyboard visual stroke width', () => {
		const { container } = render(MouseDiagram, { props: PROPS });
		const stroked = Array.from(container.querySelectorAll('[stroke-width]'));
		expect(stroked.length).toBeGreaterThan(0);
		for (const el of stroked) {
			expect(Number(el.getAttribute('stroke-width'))).toBeLessThanOrEqual(1);
		}
	});
});
