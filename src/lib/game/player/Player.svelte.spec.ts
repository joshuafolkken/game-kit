import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Player from './Player.svelte';
import { camera_shake } from '$lib/game/player/camera-shake.svelte';

vi.mock('@threlte/core', () => ({ T: {}, useTask: vi.fn() }));
vi.mock('$lib/game/input.svelte', () => ({
	input: {
		keys: { w: false, s: false, a: false, d: false },
		joystick_move: { x: 0, y: 0 },
		joystick_look: { x: 0, y: 0 },
		yaw: 0,
		pitch: 0,
		is_jump_requested: false,
		is_sprinting: false,
		clear_jump_request: vi.fn(),
		apply_look_delta: vi.fn(),
		set_joystick_look: vi.fn()
	}
}));
vi.mock('$lib/game/player/player-bounds', () => ({
	player_bounds: { clamp_to_room: vi.fn((x: number, z: number) => ({ x, z })) }
}));
vi.mock('$lib/game/player/player-jump', () => ({
	player_jump: {
		step_jump: vi.fn(() => ({ jump_consumed: false, new_vel_y: 0, new_pos_y: 1 }))
	}
}));
vi.mock('$lib/game/player/player-step', () => ({
	player_step: {
		compute_velocity_after_look: vi.fn(() => ({
			look_consumed: false,
			delta_yaw: 0,
			delta_pitch: 0,
			velocity: { x: 0, z: 0 }
		}))
	}
}));
vi.mock('$lib/game/player/camera-shake.svelte', () => ({
	camera_shake: {
		trigger: vi.fn(),
		step: vi.fn(),
		sample_position_offset: vi.fn().mockReturnValue(0),
		sample_rotation_offset: vi.fn().mockReturnValue(0)
	}
}));

describe('Player', () => {
	afterEach(() => {
		vi.mocked(camera_shake.trigger).mockClear();
	});

	it('renders without error when not in gameover', () => {
		const { container } = render(Player, { props: { is_gameover: false } });
		expect(container).toBeTruthy();
	});

	it('triggers camera shake when is_gameover is true', async () => {
		render(Player, { props: { is_gameover: true } });
		await Promise.resolve();
		expect(vi.mocked(camera_shake.trigger)).toHaveBeenCalledTimes(1);
	});

	it('does not trigger camera shake when is_gameover is false', async () => {
		render(Player, { props: { is_gameover: false } });
		await Promise.resolve();
		expect(vi.mocked(camera_shake.trigger)).not.toHaveBeenCalled();
	});
});
