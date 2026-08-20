// The CRT glass-face cues — a dome highlight, four darkened corners and a centre vignette — used to
// be six stacked CSS radial gradients on a `.crt-overlay` div layered over the canvas (game-kit#422).
// That layer was alpha-composited over the canvas at DEVICE resolution every frame even though the
// image it drew never changed, while the WebGL pipeline runs at CSS resolution. Here the same cues
// are a handful of ALU operations inside the pass that already runs.
//
// Reproducing CSS gradients exactly means reproducing three of their rules:
//
//  1. Sizing. `circle at top left` with no explicit size is `farthest-corner`, so the radius is the
//     distance to the opposite corner — sqrt(W^2 + H^2) from a corner. A centred farthest-corner
//     ellipse takes the farthest-side aspect ratio and passes through the corner, giving radii of
//     (W/2, H/2) * sqrt(2).
//  2. Stops are fractions of that radius, not of the box.
//  3. Interpolation toward `transparent` happens in premultiplied-alpha space, so a black-to-
//     transparent ramp keeps its colour and only its alpha falls. That is why each cue below is a
//     fixed colour with a linear alpha ramp rather than a colour mix.
//
// The cues are applied in unwarped screen space, exactly where the div sat: outside the barrel warp,
// so the corner darkening does not curve with the screen. Clipping still comes from the canvas's own
// border-radius, which the removed div only ever mirrored.

const GLASS_ALPHA_VALUE = 0.06
const GLASS_RADIUS_X_VALUE = 0.65
const GLASS_RADIUS_Y_VALUE = 0.45
const GLASS_CENTER_X_VALUE = 0.28
const GLASS_CENTER_Y_VALUE = 0.22
const GLASS_STOP_VALUE = 0.6
const CORNER_ALPHA_VALUE = 0.4
const CORNER_STOP_VALUE = 0.38
const VIGNETTE_ALPHA_VALUE = 0.3
const VIGNETTE_START_VALUE = 0.5
const HALF = 0.5

// `radial-gradient(ellipse 65% 45% at 28% 22%, rgba(255,255,255,0.06) 0%, transparent 60%)`.
export const GLASS_ALPHA = GLASS_ALPHA_VALUE
export const GLASS_RADIUS_X = GLASS_RADIUS_X_VALUE
export const GLASS_RADIUS_Y = GLASS_RADIUS_Y_VALUE
export const GLASS_CENTER_X = GLASS_CENTER_X_VALUE
export const GLASS_CENTER_Y = GLASS_CENTER_Y_VALUE
export const GLASS_STOP = GLASS_STOP_VALUE

// `radial-gradient(circle at <corner>, rgba(0,0,0,0.4) 0%, transparent 38%)`, once per corner.
export const CORNER_ALPHA = CORNER_ALPHA_VALUE
export const CORNER_STOP = CORNER_STOP_VALUE

// `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.3) 100%)`.
export const VIGNETTE_ALPHA = VIGNETTE_ALPHA_VALUE
export const VIGNETTE_START = VIGNETTE_START_VALUE

export interface GlassRgb {
	r: number
	g: number
	b: number
}

export interface GlassUv {
	x: number
	y: number
}

export interface GlassSize {
	width: number
	height: number
}

function clamp_unit(value: number): number {
	return Math.min(1, Math.max(0, value))
}

// Source-over of a single-colour layer: the layer's alpha is the only thing that varies.
function over(color: GlassRgb, layer: number, alpha: number): GlassRgb {
	return {
		r: layer * alpha + color.r * (1 - alpha),
		g: layer * alpha + color.g * (1 - alpha),
		b: layer * alpha + color.b * (1 - alpha),
	}
}

function corner_alpha(uv: GlassUv, corner: GlassUv, size: GlassSize): number {
	const radius = Math.hypot(size.width, size.height) * CORNER_STOP_VALUE
	const distance = Math.hypot((uv.x - corner.x) * size.width, (uv.y - corner.y) * size.height)

	return CORNER_ALPHA_VALUE * (1 - clamp_unit(distance / radius))
}

function vignette_alpha(uv: GlassUv): number {
	const SQRT_TWO = Math.SQRT2
	const centered = Math.hypot((uv.x - HALF) / HALF, (uv.y - HALF) / HALF) / SQRT_TWO

	return (
		VIGNETTE_ALPHA_VALUE *
		clamp_unit((centered - VIGNETTE_START_VALUE) / (1 - VIGNETTE_START_VALUE))
	)
}

function glass_alpha(uv: GlassUv): number {
	const distance = Math.hypot(
		(uv.x - GLASS_CENTER_X_VALUE) / GLASS_RADIUS_X_VALUE,
		(uv.y - GLASS_CENTER_Y_VALUE) / GLASS_RADIUS_Y_VALUE,
	)

	return GLASS_ALPHA_VALUE * (1 - clamp_unit(distance / GLASS_STOP_VALUE))
}

// JS mirror of apply_glass(). `uv` is in CSS orientation — (0,0) is the TOP-left corner, matching
// the gradient positions the CSS spelled out. The layers composite bottom-up, which is the reverse
// of the `background:` shorthand where the first layer listed sits on top.
function apply_glass_cues(color: GlassRgb, uv: GlassUv, size: GlassSize): GlassRgb {
	const CORNERS: ReadonlyArray<GlassUv> = [
		{ x: 0, y: 0 },
		{ x: 1, y: 0 },
		{ x: 0, y: 1 },
		{ x: 1, y: 1 },
	]
	let result = over(color, 0, vignette_alpha(uv))

	for (const corner of CORNERS) {
		result = over(result, 0, corner_alpha(uv, corner, size))
	}

	return over(result, 1, glass_alpha(uv))
}

const NUMBER_PRECISION = 6

function glsl(value: number): string {
	return value.toFixed(NUMBER_PRECISION)
}

export const GLASS_FUNCTIONS_GLSL = /* glsl */ `
vec3 over_layer(vec3 color, float layer, float alpha) {
	return mix(color, vec3(layer), alpha);
}

float corner_alpha(vec2 css_uv, vec2 corner, vec2 size) {
	float radius = length(size) * ${glsl(CORNER_STOP_VALUE)};
	float distance_px = length((css_uv - corner) * size);

	return ${glsl(CORNER_ALPHA_VALUE)} * (1.0 - clamp(distance_px / radius, 0.0, 1.0));
}

vec3 apply_glass(vec3 color, vec2 css_uv, vec2 size) {
	vec2 centered = (css_uv - 0.5) / 0.5;
	float vignette = ${glsl(VIGNETTE_ALPHA_VALUE)} * clamp(
		(length(centered) / ${glsl(Math.SQRT2)} - ${glsl(VIGNETTE_START_VALUE)}) /
			${glsl(1 - VIGNETTE_START_VALUE)},
		0.0,
		1.0
	);
	vec3 result = over_layer(color, 0.0, vignette);

	result = over_layer(result, 0.0, corner_alpha(css_uv, vec2(0.0, 0.0), size));
	result = over_layer(result, 0.0, corner_alpha(css_uv, vec2(1.0, 0.0), size));
	result = over_layer(result, 0.0, corner_alpha(css_uv, vec2(0.0, 1.0), size));
	result = over_layer(result, 0.0, corner_alpha(css_uv, vec2(1.0, 1.0), size));

	vec2 glass = (css_uv - vec2(${glsl(GLASS_CENTER_X_VALUE)}, ${glsl(GLASS_CENTER_Y_VALUE)})) /
		vec2(${glsl(GLASS_RADIUS_X_VALUE)}, ${glsl(GLASS_RADIUS_Y_VALUE)});
	float highlight = ${glsl(GLASS_ALPHA_VALUE)} *
		(1.0 - clamp(length(glass) / ${glsl(GLASS_STOP_VALUE)}, 0.0, 1.0));

	return over_layer(result, 1.0, highlight);
}
`

export const crt_glass = {
	apply_glass_cues,
}
