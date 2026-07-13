// Recolors the built-in control-icon SVGs (keyboard / space / mouse / touch) to a consumer-supplied
// base color while preserving each element's original alpha. The SVGs bake several purple rgba()
// values at different opacities to fake depth; swapping only the r/g/b channels — and keeping every
// a — re-themes them to another palette (e.g. cyan) without a redesign. An invalid or omitted color
// returns the SVG unchanged, so the default purple rendering is never altered for existing consumers.

const HEX_SHORT_LENGTH = 3
const HEX_RADIX = 16

// Matches rgba(r, g, b, a) and captures only the alpha; r/g/b are replaced with the target channels.
const RGBA_PATTERN = /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/gu
// Matches a normalized 6-digit hex (no leading '#'), capturing each channel pair.
const HEX_CHANNELS_PATTERN = /^([\da-f]{2})([\da-f]{2})([\da-f]{2})$/iu

interface Rgb {
	r: number
	g: number
	b: number
}

function expand_short_hex(hex: string): string {
	return hex.replaceAll(/(.)/gu, '$1$1')
}

function normalize_hex(color: string): string {
	const hex = color.replace('#', '')

	return hex.length === HEX_SHORT_LENGTH ? expand_short_hex(hex) : hex
}

function parse_hex_color(color: string): Rgb | null {
	const match = HEX_CHANNELS_PATTERN.exec(normalize_hex(color))
	if (!match) return null

	const [, r_hex, g_hex, b_hex] = match
	if (r_hex === undefined || g_hex === undefined || b_hex === undefined) return null

	return {
		r: Number.parseInt(r_hex, HEX_RADIX),
		g: Number.parseInt(g_hex, HEX_RADIX),
		b: Number.parseInt(b_hex, HEX_RADIX),
	}
}

function recolor_icon_svg(svg: string, color: string): string {
	const rgb = parse_hex_color(color)
	if (!rgb) return svg

	return svg.replaceAll(RGBA_PATTERN, function swap(_match: string, alpha: string): string {
		return `rgba(${String(rgb.r)},${String(rgb.g)},${String(rgb.b)},${alpha})`
	})
}

const controls_colors = {
	recolor_icon_svg,
}

export { controls_colors }
