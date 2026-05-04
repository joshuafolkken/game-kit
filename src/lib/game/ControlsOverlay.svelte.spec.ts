import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ControlsOverlay from './ControlsOverlay.svelte';

const HINT = 'CLICK TO START';
const LABEL_PROPS = {
	label_move: 'Move',
	label_look: 'Look',
	label_action: 'Action',
	label_jump: 'Jump',
	label_return: 'Return'
};

describe('ControlsOverlay', () => {
	it('renders the hint text', () => {
		const { container } = render(ControlsOverlay, {
			props: { hint_text: HINT, is_touch: false, ...LABEL_PROPS }
		});
		expect(container.querySelector('[data-testid="start-hint"]')?.textContent?.trim()).toBe(HINT);
	});

	it('shows PC controls layout on desktop', () => {
		const { container } = render(ControlsOverlay, {
			props: { hint_text: HINT, is_touch: false, ...LABEL_PROPS }
		});
		expect(container.querySelector('[data-testid="controls-pc"]')).toBeTruthy();
		expect(container.querySelector('[data-testid="controls-touch"]')).toBeNull();
	});

	it('shows mobile controls layout on touch device', () => {
		const { container } = render(ControlsOverlay, {
			props: { hint_text: HINT, is_touch: true, ...LABEL_PROPS }
		});
		expect(container.querySelector('[data-testid="controls-touch"]')).toBeTruthy();
		expect(container.querySelector('[data-testid="controls-pc"]')).toBeNull();
	});

	it('renders the controls-overlay container', () => {
		const { container } = render(ControlsOverlay, {
			props: { hint_text: HINT, is_touch: false, ...LABEL_PROPS }
		});
		expect(container.querySelector('[data-testid="controls-overlay"]')).toBeTruthy();
	});

	it('renders the dark backdrop overlay', () => {
		const { container } = render(ControlsOverlay, {
			props: { hint_text: HINT, is_touch: false, ...LABEL_PROPS }
		});
		expect(container.querySelector('[data-testid="overlay-backdrop"]')).toBeTruthy();
	});

	it('passes label_move/label_jump/label_return to keyboard diagram aria-label', () => {
		const { container } = render(ControlsOverlay, {
			props: { hint_text: HINT, is_touch: false, ...LABEL_PROPS }
		});
		const svg = container.querySelector('.keyboard-diagram');
		expect(svg?.getAttribute('aria-label')).toContain(LABEL_PROPS.label_move);
		expect(svg?.getAttribute('aria-label')).toContain(LABEL_PROPS.label_jump);
		expect(svg?.getAttribute('aria-label')).toContain(LABEL_PROPS.label_return);
	});

	it('passes label_action/label_look to mouse diagram aria-label', () => {
		const { container } = render(ControlsOverlay, {
			props: { hint_text: HINT, is_touch: false, ...LABEL_PROPS }
		});
		const svg = container.querySelector('.mouse-diagram');
		expect(svg?.getAttribute('aria-label')).toContain(LABEL_PROPS.label_action);
		expect(svg?.getAttribute('aria-label')).toContain(LABEL_PROPS.label_look);
	});

	it('start hint uses Orbitron (CYBER) font', () => {
		const { container } = render(ControlsOverlay, {
			props: { hint_text: HINT, is_touch: false, ...LABEL_PROPS }
		});
		const hint = container.querySelector<HTMLElement>('[data-testid="start-hint"]');
		expect(hint).toBeTruthy();
		const font = globalThis.getComputedStyle(hint!).fontFamily;
		expect(font).toContain('Orbitron');
	});
});
