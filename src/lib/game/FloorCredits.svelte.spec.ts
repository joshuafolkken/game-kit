import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FloorCredits from './FloorCredits.svelte';

vi.mock('@threlte/core', () => ({ T: {}, useTask: vi.fn() }));
vi.mock('@threlte/extras', () => ({ Text: function Text() {} }));

const SAMPLE_CREDITS = 'CREDITS\n\nSponsor A\n\nSponsor B';
const START_Z = 10;
const END_Z = -10;

describe('FloorCredits', () => {
	it('renders without error in normal mode', () => {
		const { container } = render(FloorCredits, {
			props: {
				is_alt: false,
				credits: SAMPLE_CREDITS,
				scroll_start_z: START_Z,
				scroll_end_z: END_Z
			}
		});
		expect(container).toBeTruthy();
	});

	it('renders without error in alt mode', () => {
		const { container } = render(FloorCredits, {
			props: { is_alt: true, credits: SAMPLE_CREDITS, scroll_start_z: START_Z, scroll_end_z: END_Z }
		});
		expect(container).toBeTruthy();
	});

	it('accepts empty credits string', () => {
		const { container } = render(FloorCredits, {
			props: { is_alt: false, credits: '', scroll_start_z: START_Z, scroll_end_z: END_Z }
		});
		expect(container).toBeTruthy();
	});
});
