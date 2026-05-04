export const DECAY_RATE = 6;
export const MAX_POSITION_OFFSET = 0.08;
export const MAX_ROTATION_OFFSET = 0.04;
const INTENSITY_FLOOR = 0.001;

let intensity = $state(0);

function trigger(strength: number): void {
	intensity = strength;
}

function reset(): void {
	intensity = 0;
}

function sample(max: number): number {
	if (intensity <= 0) return 0;
	return (Math.random() * 2 - 1) * max * intensity; // NOSONAR — visual animation only
}

function step(delta: number): void {
	if (intensity <= 0) return;
	intensity = Math.max(0, intensity - intensity * DECAY_RATE * delta);
	if (intensity < INTENSITY_FLOOR) intensity = 0;
}

function sample_position_offset(): number {
	return sample(MAX_POSITION_OFFSET);
}

function sample_rotation_offset(): number {
	return sample(MAX_ROTATION_OFFSET);
}

export const camera_shake = {
	get intensity() {
		return intensity;
	},
	trigger,
	reset,
	step,
	sample_position_offset,
	sample_rotation_offset
};
