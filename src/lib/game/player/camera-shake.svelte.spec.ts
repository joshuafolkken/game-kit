import { describe, it, expect, beforeEach } from 'vitest';
import {
	camera_shake,
	DECAY_RATE,
	MAX_POSITION_OFFSET,
	MAX_ROTATION_OFFSET
} from '$lib/game/player/camera-shake.svelte';

const STRONG = 1.0;
const DELTA = 1 / 60;

describe('camera_shake', () => {
	beforeEach(() => {
		camera_shake.reset();
	});

	it('starts with zero intensity', () => {
		expect(camera_shake.intensity).toBe(0);
	});

	it('trigger sets intensity to the given strength', () => {
		camera_shake.trigger(STRONG);
		expect(camera_shake.intensity).toBe(STRONG);
	});

	it('sample_position_offset returns 0 when inactive', () => {
		expect(camera_shake.sample_position_offset()).toBe(0);
	});

	it('sample_rotation_offset returns 0 when inactive', () => {
		expect(camera_shake.sample_rotation_offset()).toBe(0);
	});

	it('step is a no-op when intensity is already zero', () => {
		camera_shake.step(DELTA);
		expect(camera_shake.intensity).toBe(0);
	});

	it('step decays intensity below its previous value', () => {
		camera_shake.trigger(STRONG);
		camera_shake.step(DELTA);
		expect(camera_shake.intensity).toBeLessThan(STRONG);
		expect(camera_shake.intensity).toBeGreaterThan(0);
	});

	it('step decay rate matches DECAY_RATE constant', () => {
		camera_shake.trigger(STRONG);
		camera_shake.step(DELTA);
		const expected = STRONG - STRONG * DECAY_RATE * DELTA;
		expect(camera_shake.intensity).toBeCloseTo(expected, 6);
	});

	it('step reduces intensity to zero after sustained time', () => {
		camera_shake.trigger(STRONG);
		for (let i = 0; i < 200; i++) camera_shake.step(DELTA);
		expect(camera_shake.intensity).toBe(0);
	});

	it('sample_position_offset stays within ±MAX_POSITION_OFFSET when active', () => {
		camera_shake.trigger(STRONG);
		for (let i = 0; i < 100; i++) {
			const v = camera_shake.sample_position_offset();
			expect(Math.abs(v)).toBeLessThanOrEqual(MAX_POSITION_OFFSET + Number.EPSILON);
		}
	});

	it('sample_rotation_offset stays within ±MAX_ROTATION_OFFSET when active', () => {
		camera_shake.trigger(STRONG);
		for (let i = 0; i < 100; i++) {
			const v = camera_shake.sample_rotation_offset();
			expect(Math.abs(v)).toBeLessThanOrEqual(MAX_ROTATION_OFFSET + Number.EPSILON);
		}
	});

	it('reset brings intensity back to zero after trigger', () => {
		camera_shake.trigger(STRONG);
		camera_shake.reset();
		expect(camera_shake.intensity).toBe(0);
	});
});
