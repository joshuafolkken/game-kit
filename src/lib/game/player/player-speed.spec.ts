import { describe, it, expect } from 'vitest';
import { player_speed } from './player-speed';

describe('player_speed', () => {
	it('returns base speed when not sprinting', () => {
		expect(player_speed.get_move_speed(false)).toBe(player_speed.MOVE_SPEED);
	});

	it('returns sprint speed when sprinting', () => {
		expect(player_speed.get_move_speed(true)).toBe(
			player_speed.MOVE_SPEED * player_speed.SPRINT_MULTIPLIER
		);
	});
});
