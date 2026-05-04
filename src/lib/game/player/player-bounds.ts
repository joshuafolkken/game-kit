import { HALF_W, HALF_D } from '$lib/game/room-config';

export const PLAYER_RADIUS = 0.4;
const X_MAX = HALF_W - PLAYER_RADIUS;
const Z_MAX = HALF_D - PLAYER_RADIUS;

function clamp_to_room(x: number, z: number): { x: number; z: number } {
	return {
		x: Math.max(-X_MAX, Math.min(X_MAX, x)),
		z: Math.max(-Z_MAX, Math.min(Z_MAX, z))
	};
}

export const player_bounds = { clamp_to_room, PLAYER_RADIUS, X_MAX, Z_MAX };
