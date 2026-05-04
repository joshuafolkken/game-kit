import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import TouchDiagram from './TouchDiagram.svelte';

const PROPS = { label_move: 'Move', label_look: 'Look around', label_action: 'Action' };

describe('TouchDiagram', () => {
	it('renders the touch-diagram container with role and aria-label', () => {
		const { container } = render(TouchDiagram, { props: PROPS });
		const diagram = container.querySelector('.touch-diagram');
		expect(diagram).toBeTruthy();
		expect(diagram?.getAttribute('role')).toBe('img');
		expect(diagram?.getAttribute('aria-label')).toContain(PROPS.label_move);
		expect(diagram?.getAttribute('aria-label')).toContain(PROPS.label_look);
		expect(diagram?.getAttribute('aria-label')).toContain(PROPS.label_action);
	});

	it('renders a frame and two halves so width can stretch with viewport', () => {
		const { container } = render(TouchDiagram, { props: PROPS });
		expect(container.querySelector('[data-testid="touch-diagram-frame"]')).toBeTruthy();
		expect(container.querySelectorAll('.frame .half')).toHaveLength(2);
	});

	it('renders move-gesture and look-gesture as separate fixed-size SVGs', () => {
		const { container } = render(TouchDiagram, { props: PROPS });
		expect(container.querySelector('svg.move-gesture')).toBeTruthy();
		expect(container.querySelector('svg.look-gesture')).toBeTruthy();
	});

	it('gesture viewBox encompasses full arc extent (no clipping at top/sides)', () => {
		const { container } = render(TouchDiagram, { props: PROPS });
		const move = container.querySelector('svg.move-gesture');
		const look = container.querySelector('svg.look-gesture');
		expect(move?.getAttribute('viewBox')).toBe('27 14 58 54');
		expect(look?.getAttribute('viewBox')).toBe('27 14 58 54');
	});

	it('does not render any visible label text', () => {
		const { container } = render(TouchDiagram, { props: PROPS });
		const texts = Array.from(container.querySelectorAll('text'));
		expect(texts).toHaveLength(0);
	});

	it('gesture strokes use cyber-purple color (matches PC keyboard/mouse diagrams)', () => {
		const { container } = render(TouchDiagram, { props: PROPS });
		const path = container.querySelector('svg.move-gesture path');
		const ring = container.querySelector('svg.move-gesture circle');
		expect(path?.getAttribute('stroke')).toContain('160,130,255');
		expect(ring?.getAttribute('stroke')).toContain('160,130,255');
	});
});
