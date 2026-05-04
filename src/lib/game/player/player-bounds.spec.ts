import { describe, it, expect } from 'vitest';
import { player_bounds } from '$lib/game/player/player-bounds';

describe('player_bounds', () => {
	it('does not clamp position inside the room', () => {
		const result = player_bounds.clamp_to_room(0, 0);
		expect(result.x).toBe(0);
		expect(result.z).toBe(0);
	});

	it('clamps x when past the right wall', () => {
		const result = player_bounds.clamp_to_room(10, 0);
		expect(result.x).toBe(player_bounds.X_MAX);
	});

	it('clamps x when past the left wall', () => {
		const result = player_bounds.clamp_to_room(-10, 0);
		expect(result.x).toBe(-player_bounds.X_MAX);
	});

	it('clamps z when past the back wall', () => {
		const result = player_bounds.clamp_to_room(0, -10);
		expect(result.z).toBe(-player_bounds.Z_MAX);
	});

	it('clamps z when past the front wall', () => {
		const result = player_bounds.clamp_to_room(0, 10);
		expect(result.z).toBe(player_bounds.Z_MAX);
	});

	it('does not clamp position exactly at the boundary', () => {
		const { x, z } = player_bounds.clamp_to_room(player_bounds.X_MAX, player_bounds.Z_MAX);
		expect(x).toBe(player_bounds.X_MAX);
		expect(z).toBe(player_bounds.Z_MAX);
	});

	it('clamps position one unit past the boundary', () => {
		const { x, z } = player_bounds.clamp_to_room(player_bounds.X_MAX + 1, player_bounds.Z_MAX + 1);
		expect(x).toBe(player_bounds.X_MAX);
		expect(z).toBe(player_bounds.Z_MAX);
	});
});
