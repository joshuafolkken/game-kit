import { player_velocity, type Velocity } from '$lib/game/player/player-velocity';

type StepInput = {
	yaw: number;
	joystick_look_x: number;
	joystick_look_y: number;
	joystick_look_speed: number;
	delta: number;
	forward: number;
	strafe: number;
	is_sprinting: boolean;
};

type StepResult = {
	velocity: Velocity;
	delta_yaw: number;
	delta_pitch: number;
	look_consumed: boolean;
};

function compute_velocity_after_look(step_input: StepInput): StepResult {
	const delta_yaw = step_input.joystick_look_x * step_input.joystick_look_speed * step_input.delta;
	const delta_pitch =
		-step_input.joystick_look_y * step_input.joystick_look_speed * step_input.delta;
	const new_yaw = step_input.yaw - delta_yaw;
	const velocity = player_velocity.compute_velocity({
		yaw: new_yaw,
		forward: step_input.forward,
		strafe: step_input.strafe,
		is_sprinting: step_input.is_sprinting
	});
	const look_consumed = step_input.joystick_look_x !== 0 || step_input.joystick_look_y !== 0;
	return { velocity, delta_yaw, delta_pitch, look_consumed };
}

export const player_step = { compute_velocity_after_look };
export type { StepInput, StepResult };
