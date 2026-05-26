const MAX_SCALE = 1
const MIN_SCALE = 0
const SIDES = 2

function compute_fit_scale(
	view_width: number,
	natural_span: number,
	min_side_padding: number,
): number {
	if (natural_span <= 0) return MAX_SCALE
	const available_width = view_width - SIDES * min_side_padding
	if (available_width <= 0) return MIN_SCALE
	const fit_scale = available_width / natural_span

	return Math.min(MAX_SCALE, fit_scale)
}

export { compute_fit_scale }
