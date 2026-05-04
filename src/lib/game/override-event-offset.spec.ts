import { describe, it, expect } from 'vitest';
import { override_event_offset } from './override-event-offset.js';

const OFFSET_X = 42;
const OFFSET_Y = 99;

describe('override_event_offset', () => {
	it('sets offsetX and offsetY on a plain event', () => {
		const event = new Event('pointermove');
		override_event_offset(event, OFFSET_X, OFFSET_Y);
		expect((event as unknown as { offsetX: number }).offsetX).toBe(OFFSET_X);
		expect((event as unknown as { offsetY: number }).offsetY).toBe(OFFSET_Y);
	});

	it('overwrites a previously set offsetX value', () => {
		const event = new Event('pointermove');
		override_event_offset(event, OFFSET_X, OFFSET_Y);
		override_event_offset(event, 0, 0);
		expect((event as unknown as { offsetX: number }).offsetX).toBe(0);
		expect((event as unknown as { offsetY: number }).offsetY).toBe(0);
	});

	it('does not throw when the property is non-configurable', () => {
		const event = new Event('pointermove');
		Object.defineProperty(event, 'offsetX', { value: 0, configurable: false });
		expect(() => override_event_offset(event, OFFSET_X, OFFSET_Y)).not.toThrow();
	});
});
