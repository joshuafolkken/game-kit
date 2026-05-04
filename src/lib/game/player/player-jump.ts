const JUMP_VELOCITY = 4;
const JUMP_GRAVITY = 12;

type JumpInput = {
	vel_y: number;
	pos_y: number;
	delta: number;
	is_jump_requested: boolean;
	ground_y: number;
};

type JumpResult = {
	new_pos_y: number;
	new_vel_y: number;
	jump_consumed: boolean;
};

function step_jump(jump_input: JumpInput): JumpResult {
	let vel_y = jump_input.vel_y;
	let jump_consumed = false;
	if (jump_input.is_jump_requested) {
		if (vel_y === 0) vel_y = JUMP_VELOCITY;
		jump_consumed = true;
	}
	vel_y -= JUMP_GRAVITY * jump_input.delta;
	const new_pos_y = jump_input.pos_y + vel_y * jump_input.delta;
	if (new_pos_y <= jump_input.ground_y) {
		return { new_pos_y: jump_input.ground_y, new_vel_y: 0, jump_consumed };
	}
	return { new_pos_y, new_vel_y: vel_y, jump_consumed };
}

export const player_jump = { step_jump, JUMP_VELOCITY, JUMP_GRAVITY };
export type { JumpInput, JumpResult };
