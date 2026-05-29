const HALF_DIVISOR = 2

export const CREDITS_FONT_SIZE = 0.1
export const CREDITS_LINE_HEIGHT = 1.3
export const CREDITS_NORMAL_COLOR = '#776655'
export const CREDITS_CYBER_COLOR = '#00aacc'
export const CREDITS_POSITION_Y = 0.08
export const CREDITS_SCROLL_SPEED = 0.2
export const CREDITS_GLOW_BLUR = '50%'
export const CREDITS_GLOW_OPACITY = 0.4
export const FLOOR_TEXT_ROTATION_X = -(Math.PI / HALF_DIVISOR)

function make_credits_scroll_bounds(
	line_count: number,
	half_depth: number,
): { start_z: number; end_z: number } {
	const height = line_count * CREDITS_FONT_SIZE * CREDITS_LINE_HEIGHT
	const offset = half_depth + height / HALF_DIVISOR

	return { start_z: offset, end_z: -offset }
}

// eslint-disable-next-line max-params -- scrolling math signature with 5 numeric params; object-arg shape adds noise at call sites
function advance_scroll(
	current_z: number,
	delta: number,
	start_z: number,
	end_z: number,
	speed: number,
): number {
	const next_z = current_z - speed * delta

	return next_z < end_z ? start_z : next_z
}

export const credits_scroll = { make_credits_scroll_bounds, advance_scroll }

export { make_credits_scroll_bounds, advance_scroll }
