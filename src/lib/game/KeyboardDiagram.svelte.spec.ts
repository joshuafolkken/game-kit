import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import KeyboardDiagram from './KeyboardDiagram.svelte';

const PROPS = { label_move: 'Move', label_jump: 'Jump', label_return: 'Return' };

describe('KeyboardDiagram', () => {
	it('renders the SVG diagram', () => {
		const { container } = render(KeyboardDiagram, { props: PROPS });
		expect(container.querySelector('svg.keyboard-diagram')).toBeTruthy();
	});

	it('SVG aria-label includes move, jump, and return labels for screen readers', () => {
		const { container } = render(KeyboardDiagram, { props: PROPS });
		const aria = container.querySelector('svg.keyboard-diagram')?.getAttribute('aria-label') ?? '';
		expect(aria).toContain(PROPS.label_move);
		expect(aria).toContain(PROPS.label_jump);
		expect(aria).toContain(PROPS.label_return);
	});

	it('does not render a visible move label text', () => {
		const { container } = render(KeyboardDiagram, { props: PROPS });
		const texts = Array.from(container.querySelectorAll('text'));
		const move_label = texts.find((t) => t.textContent?.trim() === PROPS.label_move);
		expect(move_label).toBeUndefined();
	});

	it('renders ESC text centered in its key (dominant-baseline central)', () => {
		const { container } = render(KeyboardDiagram, { props: PROPS });
		const texts = Array.from(container.querySelectorAll('text'));
		const esc = texts.find((t) => t.textContent?.trim() === 'ESC');
		expect(esc).toBeTruthy();
		expect(esc?.getAttribute('dominant-baseline')).toBe('central');
		expect(esc?.getAttribute('y')).toBe('162');
	});

	it('places A/S/D keys with same gap as W-to-S gap', () => {
		const { container } = render(KeyboardDiagram, { props: PROPS });
		const s_rect = container.querySelector('.key-s rect');
		expect(s_rect?.getAttribute('y')).toBe('46');
	});

	it('uses Orbitron font for key labels', () => {
		const { container } = render(KeyboardDiagram, { props: PROPS });
		const texts = Array.from(container.querySelectorAll('text'));
		const has_orbitron = texts.every((t) => t.getAttribute('font-family')?.includes('Orbitron'));
		expect(has_orbitron).toBe(true);
	});

	it('spacebar uses double chevron (two 3-point polylines, no straight line)', () => {
		const { container } = render(KeyboardDiagram, { props: PROPS });
		const polylines = Array.from(container.querySelectorAll('.key-space polyline'));
		expect(polylines).toHaveLength(2);
		for (const p of polylines) {
			const points = p.getAttribute('points')?.trim().split(/\s+/) ?? [];
			expect(points).toHaveLength(3);
		}
	});

	it('spacebar chevron is text-sized (total span <= 13 units, similar to WASD font-size)', () => {
		const { container } = render(KeyboardDiagram, { props: PROPS });
		const polylines = Array.from(container.querySelectorAll('.key-space polyline'));
		const all_y_values = polylines.flatMap(
			(p) =>
				p
					.getAttribute('points')
					?.trim()
					.split(/\s+/)
					.map((pt) => Number(pt.split(',')[1])) ?? []
		);
		const span = Math.max(...all_y_values) - Math.min(...all_y_values);
		expect(span).toBeLessThanOrEqual(13);
	});
});
