// eslint-disable-next-line max-params -- viewport-rendering math signature with 6 numeric tuning params; object-arg shape adds noise at call sites
function compute_pixel_dpr(
	viewport_w: number,
	viewport_h: number,
	target_short_edge: number,
	min_short_edge: number,
	max_dpr: number,
	fallback: number,
): number {
	const shorter = Math.min(viewport_w, viewport_h)
	if (shorter <= 0) return fallback
	const target_dpr = target_short_edge / shorter
	const min_dpr = min_short_edge / shorter
	const capped_dpr = Math.min(max_dpr, target_dpr)

	return Math.max(min_dpr, capped_dpr)
}

export { compute_pixel_dpr }
