import { ROOM_D, ROOM_W } from '$lib/game-kit/scene/room-config'

const HALF_DIVISOR = 2

export const PLAYER_RADIUS = 0.4

export type Clamp = (x: number, z: number) => { x: number; z: number }

function make_clamp_to_room(room_width: number, room_depth: number): Clamp {
	const x_max = room_width / HALF_DIVISOR - PLAYER_RADIUS
	const z_max = room_depth / HALF_DIVISOR - PLAYER_RADIUS

	return function clamp(x: number, z: number): { x: number; z: number } {
		return {
			x: Math.max(-x_max, Math.min(x_max, x)),
			z: Math.max(-z_max, Math.min(z_max, z)),
		}
	}
}

const X_MAX = ROOM_W / HALF_DIVISOR - PLAYER_RADIUS
const Z_MAX = ROOM_D / HALF_DIVISOR - PLAYER_RADIUS
const clamp_to_room = make_clamp_to_room(ROOM_W, ROOM_D)

export const player_bounds = { clamp_to_room, make_clamp_to_room, PLAYER_RADIUS, X_MAX, Z_MAX }
