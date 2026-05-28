import { player_speed } from '$lib/game-kit/player/player-speed'

interface VelocityInput {
	yaw: number
	forward: number
	strafe: number
	is_sprinting: boolean
}

interface Velocity {
	x: number
	y: number
	z: number
}

function compute_velocity(velocity_input: VelocityInput): Velocity {
	const fw_x = -Math.sin(velocity_input.yaw)
	const fw_z = -Math.cos(velocity_input.yaw)
	const rt_x = Math.cos(velocity_input.yaw)
	const rt_z = -Math.sin(velocity_input.yaw)
	const vx = fw_x * velocity_input.forward + rt_x * velocity_input.strafe
	const vz = fw_z * velocity_input.forward + rt_z * velocity_input.strafe
	const magnitude = Math.hypot(vx, vz)
	const nx = magnitude > 1 ? vx / magnitude : vx
	const nz = magnitude > 1 ? vz / magnitude : vz
	const speed = player_speed.get_move_speed(velocity_input.is_sprinting)

	return { x: nx * speed, y: 0, z: nz * speed }
}

export const player_velocity = { compute_velocity }
export type { VelocityInput, Velocity }
