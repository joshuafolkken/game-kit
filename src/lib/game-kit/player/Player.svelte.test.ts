import { camera_shake } from '$lib/game-kit/player/CameraShake.svelte'
import { player_step } from '$lib/game-kit/player/player-step'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-svelte'
import Player from './Player.svelte'

const KEYBOARD_AXIS_FRACTION = 0.5

const { tick_holder, mock_input } = vi.hoisted(() => ({
	tick_holder: { fn: null as ((delta: number) => void) | null },
	mock_input: {
		keys: { w: false, s: false, a: false, d: false },
		joystick_move: { x: 0, y: 0 },
		joystick_look: { x: 0, y: 0 },
		yaw: 0,
		pitch: 0,
		is_jump_requested: false,
		is_sprinting: false,
		clear_jump_request: () => {},
		apply_look_delta: () => {},
		set_joystick_look: () => {},
	},
}))

vi.mock('@threlte/core', () => ({
	T: {},
	useTask: vi.fn((function_: (delta: number) => void) => {
		tick_holder.fn = function_
	}),
}))
vi.mock('$lib/game-kit/input/Input.svelte', () => ({ input: mock_input }))
vi.mock('$lib/game-kit/player/player-bounds', () => ({
	player_bounds: { clamp_to_room: vi.fn((x: number, z: number) => ({ x, z })) },
}))
vi.mock('$lib/game-kit/player/player-jump', () => ({
	player_jump: {
		step_jump: vi.fn(() => ({ jump_consumed: false, new_vel_y: 0, new_pos_y: 1 })),
	},
}))
vi.mock('$lib/game-kit/player/player-step', () => ({
	player_step: {
		compute_velocity_after_look: vi.fn(() => ({
			look_consumed: false,
			delta_yaw: 0,
			delta_pitch: 0,
			velocity: { x: 0, z: 0 },
		})),
	},
}))
vi.mock('$lib/game-kit/player/CameraShake.svelte', () => ({
	camera_shake: {
		trigger: vi.fn(),
		step: vi.fn(),
		sample_position_offset: vi.fn().mockReturnValue(0),
		sample_rotation_offset: vi.fn().mockReturnValue(0),
	},
}))

describe('Player', () => {
	afterEach(() => {
		vi.mocked(camera_shake.trigger).mockClear()
		vi.mocked(player_step.compute_velocity_after_look).mockClear()
		mock_input.keys = { w: false, s: false, a: false, d: false }
		mock_input.joystick_move = { x: 0, y: 0 }
		mock_input.is_sprinting = false
		tick_holder.fn = null
	})

	it('renders without error when not in gameover', () => {
		const { container } = render(Player, { props: { is_gameover: false } })

		expect(container).toBeTruthy()
	})

	it('triggers camera shake when is_gameover is true', async () => {
		render(Player, { props: { is_gameover: true } })
		await Promise.resolve()
		expect(vi.mocked(camera_shake.trigger)).toHaveBeenCalledTimes(1)
	})

	it('does not trigger camera shake when is_gameover is false', async () => {
		render(Player, { props: { is_gameover: false } })
		await Promise.resolve()
		expect(vi.mocked(camera_shake.trigger)).not.toHaveBeenCalled()
	})

	it('W key passes forward scaled by KEYBOARD_AXIS_FRACTION to compute_velocity_after_look', () => {
		mock_input.keys = { w: true, s: false, a: false, d: false }
		render(Player, { props: { is_gameover: false } })
		tick_holder.fn?.(0.016)
		const call = vi.mocked(player_step.compute_velocity_after_look).mock.calls[0]?.[0]

		expect(call?.forward).toBeCloseTo(KEYBOARD_AXIS_FRACTION)
	})

	it('W+D diagonal passes pre-normalized forward scaled by KEYBOARD_AXIS_FRACTION', () => {
		mock_input.keys = { w: true, s: false, a: false, d: true }
		render(Player, { props: { is_gameover: false } })
		tick_holder.fn?.(0.016)
		const call = vi.mocked(player_step.compute_velocity_after_look).mock.calls[0]?.[0]

		expect(call?.forward).toBeCloseTo(KEYBOARD_AXIS_FRACTION / Math.SQRT2)
	})

	it('joystick full forward passes forward=1 unchanged', () => {
		mock_input.joystick_move = { x: 0, y: 1 }
		render(Player, { props: { is_gameover: false } })
		tick_holder.fn?.(0.016)
		const call = vi.mocked(player_step.compute_velocity_after_look).mock.calls[0]?.[0]

		expect(call?.forward).toBeCloseTo(1)
	})
})
