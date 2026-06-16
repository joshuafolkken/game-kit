<script lang="ts">
	import { T, useTask } from '@threlte/core'
	import { input } from '$lib/game-kit/input/Input.svelte'
	import { camera_shake } from '$lib/game-kit/player/CameraShake.svelte'
	import { player_bounds } from '$lib/game-kit/player/player-bounds'
	import { player_jump } from '$lib/game-kit/player/player-jump'
	import { player_step } from '$lib/game-kit/player/player-step'
	import { ROOM_D, ROOM_W } from '$lib/game-kit/scene/room-config'

	const SPAWN_X = 0
	const SPAWN_Y = 1
	const SPAWN_Z = 3
	const HEAD_HEIGHT = 0.6
	const FOV = 75
	const NEAR_PLANE = 0.1
	const FAR_PLANE = 50
	const JOYSTICK_LOOK_SPEED = 2
	const GAMEOVER_SHAKE_STRENGTH = 1
	const KEYBOARD_AXIS_FRACTION = 0.5

	interface Props {
		is_gameover: boolean
		room_width?: number
		room_depth?: number
	}

	const { is_gameover, room_width = ROOM_W, room_depth = ROOM_D }: Props = $props()
	const clamp_to_room = $derived(player_bounds.make_clamp_to_room(room_width, room_depth))

	let pos_x = $state(SPAWN_X)
	let pos_y = $state(SPAWN_Y)
	let pos_z = $state(SPAWN_Z)
	let jump_vel_y = 0
	let shake_x = $state(0)
	let shake_y = $state(0)
	let shake_yaw = $state(0)
	let shake_pitch = $state(0)
	let shake_roll = $state(0)

	$effect(() => {
		if (is_gameover) camera_shake.trigger(GAMEOVER_SHAKE_STRENGTH)
	})

	function get_axis_input(): { forward: number; strafe: number } {
		const kb_f = (input.keys.w ? 1 : 0) - (input.keys.s ? 1 : 0)
		const kb_s = (input.keys.d ? 1 : 0) - (input.keys.a ? 1 : 0)
		const kb_length = Math.hypot(kb_f, kb_s)
		const norm_f = kb_length > 1 ? kb_f / kb_length : kb_f
		const norm_s = kb_length > 1 ? kb_s / kb_length : kb_s

		return {
			forward: norm_f * KEYBOARD_AXIS_FRACTION + input.joystick_move.y,
			strafe: norm_s * KEYBOARD_AXIS_FRACTION + input.joystick_move.x,
		}
	}

	function apply_movement(vel_x: number, vel_z: number, delta: number): void {
		const raw_x = pos_x + vel_x * delta
		const raw_z = pos_z + vel_z * delta
		const clamped = clamp_to_room(raw_x, raw_z)

		pos_x = clamped.x
		pos_z = clamped.z
	}

	function apply_jump_step(delta: number): void {
		const result = player_jump.step_jump({
			vel_y: jump_vel_y,
			pos_y,
			delta,
			is_jump_requested: input.is_jump_requested,
			ground_y: SPAWN_Y,
		})
		if (result.jump_consumed) input.clear_jump_request()
		jump_vel_y = result.new_vel_y
		pos_y = result.new_pos_y
	}

	function update_shake(delta: number): void {
		camera_shake.step(delta)
		shake_x = camera_shake.sample_position_offset()
		shake_y = camera_shake.sample_position_offset()
		shake_yaw = camera_shake.sample_rotation_offset()
		shake_pitch = camera_shake.sample_rotation_offset()
		shake_roll = camera_shake.sample_rotation_offset()
	}

	function tick(delta: number): void {
		const { forward, strafe } = get_axis_input()
		const result = player_step.compute_velocity_after_look({
			yaw: input.yaw,
			joystick_look_x: input.joystick_look.x,
			joystick_look_y: input.joystick_look.y,
			joystick_look_speed: JOYSTICK_LOOK_SPEED,
			delta,
			forward,
			strafe,
			is_sprinting: input.is_sprinting,
		})

		if (result.look_consumed) {
			input.apply_look_delta(result.delta_yaw, result.delta_pitch)
			input.set_joystick_look(0, 0)
		}

		apply_movement(result.velocity.x, result.velocity.z, delta)
		apply_jump_step(delta)
		update_shake(delta)
	}

	useTask(tick)
</script>

<T.Group
	position={[pos_x + shake_x, pos_y + HEAD_HEIGHT + shake_y, pos_z]}
	rotation.y={input.yaw + shake_yaw}
>
	<T.Group rotation.x={input.pitch + shake_pitch} rotation.z={shake_roll}>
		<T.PerspectiveCamera makeDefault fov={FOV} near={NEAR_PLANE} far={FAR_PLANE} />
	</T.Group>
</T.Group>
