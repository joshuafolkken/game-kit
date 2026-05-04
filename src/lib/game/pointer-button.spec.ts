import { describe, it, expect } from 'vitest';
import { pointer_button } from './pointer-button';

describe('pointer_button', () => {
	it('is_left_click returns true for nativeEvent.button === 0 (left)', () => {
		expect(pointer_button.is_left_click({ nativeEvent: { button: 0 } })).toBe(true);
	});

	it('is_left_click returns false for nativeEvent.button === 1 (middle)', () => {
		expect(pointer_button.is_left_click({ nativeEvent: { button: 1 } })).toBe(false);
	});

	it('is_left_click returns false for nativeEvent.button === 2 (right)', () => {
		expect(pointer_button.is_left_click({ nativeEvent: { button: 2 } })).toBe(false);
	});
});
