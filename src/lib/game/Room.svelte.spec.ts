import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Room from './Room.svelte';

vi.mock('@threlte/core', () => ({ T: {} }));

const COLORS = { floor_color: '#3a2f2f', wall_color: '#4a4a5a', ceiling_color: '#2a2a3a' };

describe('Room', () => {
	it('renders with explicit dimensions', () => {
		const { container } = render(Room, {
			props: { ...COLORS, width: 10, depth: 10, height: 3 }
		});
		expect(container).toBeTruthy();
	});

	it('renders with default dimensions (no width/depth/height)', () => {
		const { container } = render(Room, { props: COLORS });
		expect(container).toBeTruthy();
	});

	it('renders with custom dimensions', () => {
		const { container } = render(Room, {
			props: { ...COLORS, width: 20, depth: 15, height: 5 }
		});
		expect(container).toBeTruthy();
	});
});
