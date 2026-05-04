import { describe, it, expect } from 'vitest';
import { player_jump } from '$lib/game/player/player-jump';

const GROUND_Y = 1;
const DT = 0.1;

describe('player_jump.step_jump', () => {
	it('initiates jump with JUMP_VELOCITY when grounded and requested', () => {
		const result = player_jump.step_jump({
			vel_y: 0,
			pos_y: GROUND_Y,
			delta: DT,
			is_jump_requested: true,
			ground_y: GROUND_Y
		});
		const expected_vel = player_jump.JUMP_VELOCITY - player_jump.JUMP_GRAVITY * DT;
		expect(result.new_vel_y).toBeCloseTo(expected_vel);
		expect(result.jump_consumed).toBe(true);
		expect(result.new_pos_y).toBeGreaterThan(GROUND_Y);
	});

	it('does not consume jump when not requested', () => {
		const result = player_jump.step_jump({
			vel_y: 0,
			pos_y: GROUND_Y,
			delta: DT,
			is_jump_requested: false,
			ground_y: GROUND_Y
		});
		expect(result.jump_consumed).toBe(false);
	});

	it('clamps position to ground and zeros velocity when crossing below ground', () => {
		const result = player_jump.step_jump({
			vel_y: -10,
			pos_y: GROUND_Y + 0.01,
			delta: DT,
			is_jump_requested: false,
			ground_y: GROUND_Y
		});
		expect(result.new_pos_y).toBe(GROUND_Y);
		expect(result.new_vel_y).toBe(0);
	});

	it('applies gravity to upward velocity each step', () => {
		const result = player_jump.step_jump({
			vel_y: 5,
			pos_y: GROUND_Y + 1,
			delta: DT,
			is_jump_requested: false,
			ground_y: GROUND_Y
		});
		const expected_vel = 5 - player_jump.JUMP_GRAVITY * DT;
		expect(result.new_vel_y).toBeCloseTo(expected_vel);
		expect(result.new_pos_y).toBeCloseTo(GROUND_Y + 1 + expected_vel * DT);
	});

	it('does not boost velocity when jump is requested while already in the air', () => {
		const result = player_jump.step_jump({
			vel_y: 2,
			pos_y: GROUND_Y + 0.5,
			delta: DT,
			is_jump_requested: true,
			ground_y: GROUND_Y
		});
		const expected_vel = 2 - player_jump.JUMP_GRAVITY * DT;
		expect(result.new_vel_y).toBeCloseTo(expected_vel);
		expect(result.jump_consumed).toBe(true);
	});

	it('settles to rest when stationary on the ground without jump request', () => {
		const result = player_jump.step_jump({
			vel_y: 0,
			pos_y: GROUND_Y,
			delta: DT,
			is_jump_requested: false,
			ground_y: GROUND_Y
		});
		expect(result.new_pos_y).toBe(GROUND_Y);
		expect(result.new_vel_y).toBe(0);
	});
});
