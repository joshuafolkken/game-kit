import { describe, it, expect } from 'vitest';
import { player_velocity } from '$lib/game/player/player-velocity';
import { player_speed } from '$lib/game/player/player-speed';

const NORMAL_SPEED = player_speed.MOVE_SPEED;
const SPRINT_SPEED = player_speed.MOVE_SPEED * player_speed.SPRINT_MULTIPLIER;

describe('player_velocity.compute_velocity', () => {
	it('returns zero velocity when there is no input', () => {
		const result = player_velocity.compute_velocity({
			yaw: 0,
			forward: 0,
			strafe: 0,
			is_sprinting: false
		});
		expect(result.x).toBeCloseTo(0);
		expect(result.y).toBe(0);
		expect(result.z).toBeCloseTo(0);
	});

	it('moves along -z when forward at yaw 0', () => {
		const result = player_velocity.compute_velocity({
			yaw: 0,
			forward: 1,
			strafe: 0,
			is_sprinting: false
		});
		expect(result.x).toBeCloseTo(0);
		expect(result.z).toBeCloseTo(-NORMAL_SPEED);
		expect(result.y).toBe(0);
	});

	it('moves along +x when strafing right at yaw 0', () => {
		const result = player_velocity.compute_velocity({
			yaw: 0,
			forward: 0,
			strafe: 1,
			is_sprinting: false
		});
		expect(result.x).toBeCloseTo(NORMAL_SPEED);
		expect(result.z).toBeCloseTo(0);
	});

	it('normalizes diagonal forward and strafe to length speed', () => {
		const result = player_velocity.compute_velocity({
			yaw: 0,
			forward: 1,
			strafe: 1,
			is_sprinting: false
		});
		const len = Math.hypot(result.x, result.z);
		expect(len).toBeCloseTo(NORMAL_SPEED);
	});

	it('preserves analog magnitude for partial joystick input below length 1', () => {
		const result = player_velocity.compute_velocity({
			yaw: 0,
			forward: 0.5,
			strafe: 0,
			is_sprinting: false
		});
		expect(result.z).toBeCloseTo(-0.5 * NORMAL_SPEED);
	});

	it('applies sprint multiplier when is_sprinting is true', () => {
		const result = player_velocity.compute_velocity({
			yaw: 0,
			forward: 1,
			strafe: 0,
			is_sprinting: true
		});
		expect(result.z).toBeCloseTo(-SPRINT_SPEED);
	});

	it('rotates direction with yaw', () => {
		const result = player_velocity.compute_velocity({
			yaw: Math.PI / 2,
			forward: 1,
			strafe: 0,
			is_sprinting: false
		});
		expect(result.x).toBeCloseTo(-NORMAL_SPEED);
		expect(result.z).toBeCloseTo(0);
	});

	it('returns zero y component for purely horizontal motion', () => {
		const result = player_velocity.compute_velocity({
			yaw: 1.234,
			forward: 1,
			strafe: -0.5,
			is_sprinting: true
		});
		expect(result.y).toBe(0);
	});
});
