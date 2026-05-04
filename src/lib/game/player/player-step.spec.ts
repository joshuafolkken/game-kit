import { describe, it, expect } from 'vitest';
import { player_step } from '$lib/game/player/player-step';
import { player_speed } from '$lib/game/player/player-speed';

const MOVE_SPEED = player_speed.MOVE_SPEED;
const LOOK_SPEED = 2;
const DELTA = 1 / 60;

describe('player_step.compute_velocity_after_look', () => {
	it('uses post-look yaw when computing velocity in the same step', () => {
		// joystick_look_x chosen so that new_yaw = 0 - x * LOOK_SPEED * DELTA = PI/2
		const joystick_look_x = -Math.PI / 2 / (LOOK_SPEED * DELTA);
		const result = player_step.compute_velocity_after_look({
			yaw: 0,
			joystick_look_x,
			joystick_look_y: 0,
			joystick_look_speed: LOOK_SPEED,
			delta: DELTA,
			forward: 1,
			strafe: 0,
			is_sprinting: false
		});
		// forward at yaw=PI/2 rotates: fw_x = -sin(PI/2) = -1, fw_z = -cos(PI/2) = 0
		// If the function used the pre-look yaw=0, velocity would be (0, 0, -MOVE_SPEED).
		expect(result.velocity.x).toBeCloseTo(-MOVE_SPEED);
		expect(result.velocity.z).toBeCloseTo(0);
	});

	it('uses original yaw when joystick_look is zero', () => {
		const result = player_step.compute_velocity_after_look({
			yaw: 0,
			joystick_look_x: 0,
			joystick_look_y: 0,
			joystick_look_speed: LOOK_SPEED,
			delta: DELTA,
			forward: 1,
			strafe: 0,
			is_sprinting: false
		});
		// forward at yaw=0: velocity = (0, 0, -MOVE_SPEED)
		expect(result.velocity.x).toBeCloseTo(0);
		expect(result.velocity.z).toBeCloseTo(-MOVE_SPEED);
	});

	it('returns delta_yaw equal to joystick_look_x times speed times delta', () => {
		const joystick_look_x = 0.5;
		const result = player_step.compute_velocity_after_look({
			yaw: 0,
			joystick_look_x,
			joystick_look_y: 0,
			joystick_look_speed: LOOK_SPEED,
			delta: DELTA,
			forward: 0,
			strafe: 0,
			is_sprinting: false
		});
		expect(result.delta_yaw).toBeCloseTo(joystick_look_x * LOOK_SPEED * DELTA);
	});

	it('returns delta_pitch as negative joystick_look_y times speed times delta', () => {
		const joystick_look_y = 0.3;
		const result = player_step.compute_velocity_after_look({
			yaw: 0,
			joystick_look_x: 0,
			joystick_look_y,
			joystick_look_speed: LOOK_SPEED,
			delta: DELTA,
			forward: 0,
			strafe: 0,
			is_sprinting: false
		});
		expect(result.delta_pitch).toBeCloseTo(-joystick_look_y * LOOK_SPEED * DELTA);
	});

	it('dragging up (joystick_look_y = 1) produces negative delta_pitch (camera looks down)', () => {
		const result = player_step.compute_velocity_after_look({
			yaw: 0,
			joystick_look_x: 0,
			joystick_look_y: 1,
			joystick_look_speed: LOOK_SPEED,
			delta: DELTA,
			forward: 0,
			strafe: 0,
			is_sprinting: false
		});
		expect(result.delta_pitch).toBeLessThan(0);
	});

	it('marks look_consumed true when only joystick_look_x is non-zero', () => {
		const result = player_step.compute_velocity_after_look({
			yaw: 0,
			joystick_look_x: 0.1,
			joystick_look_y: 0,
			joystick_look_speed: LOOK_SPEED,
			delta: DELTA,
			forward: 0,
			strafe: 0,
			is_sprinting: false
		});
		expect(result.look_consumed).toBe(true);
	});

	it('marks look_consumed true when only joystick_look_y is non-zero', () => {
		const result = player_step.compute_velocity_after_look({
			yaw: 0,
			joystick_look_x: 0,
			joystick_look_y: 0.1,
			joystick_look_speed: LOOK_SPEED,
			delta: DELTA,
			forward: 0,
			strafe: 0,
			is_sprinting: false
		});
		expect(result.look_consumed).toBe(true);
	});

	it('marks look_consumed false when both joystick_look components are zero', () => {
		const result = player_step.compute_velocity_after_look({
			yaw: 0,
			joystick_look_x: 0,
			joystick_look_y: 0,
			joystick_look_speed: LOOK_SPEED,
			delta: DELTA,
			forward: 0,
			strafe: 0,
			is_sprinting: false
		});
		expect(result.look_consumed).toBe(false);
	});

	it('applies sprint multiplier on the post-look velocity', () => {
		const result = player_step.compute_velocity_after_look({
			yaw: 0,
			joystick_look_x: 0,
			joystick_look_y: 0,
			joystick_look_speed: LOOK_SPEED,
			delta: DELTA,
			forward: 1,
			strafe: 0,
			is_sprinting: true
		});
		expect(result.velocity.z).toBeCloseTo(-MOVE_SPEED * player_speed.SPRINT_MULTIPLIER);
	});
});
