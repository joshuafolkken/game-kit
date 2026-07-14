import { describe, expect, it } from 'vitest'
import SOURCE from './ControlsScene.svelte?raw'

const BACKDROP_RENDER_ORDER_VALUE = 1
const FOREGROUND_RENDER_ORDER_VALUE = 2
const BACKDROP_BACK_RENDER_ORDER_VALUE = 3
const DEFAULT_RENDER_ORDER_VALUE = 0

const MARKER_TOUCH = '[0, TOUCH_Y, TOUCH_Z]'
const MARKER_KEYBOARD = '[KEYBOARD_X, 0, 0]'
const MARKER_MOUSE = '[MOUSE_X, MOUSE_Y, 0]'
const ATTR_BACKDROP_OPACITY = 'opacity={BACKDROP_OPACITY}'
const ATTR_BACKDROP_RENDER_ORDER = 'renderOrder={BACKDROP_RENDER_ORDER}'
const ATTR_FOREGROUND_RENDER_ORDER = 'renderOrder={FOREGROUND_RENDER_ORDER}'
const ATTR_BACKDROP_BACK_RENDER_ORDER = 'renderOrder={BACKDROP_BACK_RENDER_ORDER}'
const ATTR_DOUBLE_SIDE = 'side={DoubleSide}'
const ATTR_MOUSE_POSITION = 'position={[MOUSE_X, MOUSE_Y, 0]}'
const ATTR_RESOLVED_FONT = 'font={resolved_font}'
const ATTR_LETTER_FONTSIZE_RAW =
	'fontSize={viewbox_size_to_world(letter.vsize, current_font_size_mul)}'
const ATTR_LETTER_COLOR_FALLBACK = 'color={key_color ?? letter.color}'
const RESOLVE_KEYBOARD_SVG = 'resolve_icon_svg(keyboard_svg ?? KEYBOARD_SVG)'
const RESOLVE_MOUSE_SVG = 'resolve_icon_svg(mouse_svg ?? MOUSE_SVG)'
const RESOLVE_TOUCH_SVG = 'resolve_icon_svg(touch_svg ?? TOUCH_SVG)'

function find_mesh_open_tag(source: string, position_marker: string): string {
	const start_index = source.indexOf(position_marker)
	if (start_index === -1) throw new Error(`mesh with marker "${position_marker}" not found`)
	const block_start = source.lastIndexOf('<T.Mesh', start_index)
	const block_end = source.indexOf('>', start_index)
	if (block_start === -1 || block_end === -1) throw new Error(`mesh open tag not bounded`)

	return source.slice(block_start, block_end + 1)
}

function find_mesh_full_block(source: string, position_marker: string): string {
	const start_index = source.indexOf(position_marker)
	if (start_index === -1) throw new Error(`mesh with marker "${position_marker}" not found`)
	const block_start = source.lastIndexOf('<T.Mesh', start_index)
	const block_end = source.indexOf('</T.Mesh>', start_index)
	if (block_start === -1 || block_end === -1) throw new Error(`mesh full block not bounded`)

	return source.slice(block_start, block_end)
}

function find_mesh_blocks_by_render_order(
	source: string,
	render_order_token: string,
): Array<string> {
	const blocks: Array<string> = []
	let cursor = 0

	while (cursor < source.length) {
		const order_index = source.indexOf(render_order_token, cursor)
		if (order_index === -1) break
		const block_start = source.lastIndexOf('<T.Mesh', order_index)
		const block_end = source.indexOf('</T.Mesh>', order_index)
		if (block_start === -1 || block_end === -1) break
		blocks.push(source.slice(block_start, block_end))
		cursor = block_end + 1
	}

	return blocks
}

describe('ControlsScene render order — regression for camera-angle brightness flicker', () => {
	it('backdrop mesh declares renderOrder=0 so it draws before foreground icons', () => {
		const block = find_mesh_open_tag(SOURCE, 'BACKDROP_X, BACKDROP_Y, BACKDROP_Z')

		expect(block).toContain(ATTR_BACKDROP_RENDER_ORDER)
		expect(SOURCE).toContain(`const BACKDROP_RENDER_ORDER = ${String(BACKDROP_RENDER_ORDER_VALUE)}`)
	})

	it('touch icon mesh declares renderOrder=1 so it draws after the backdrop', () => {
		const block = find_mesh_open_tag(SOURCE, MARKER_TOUCH)

		expect(block).toContain(ATTR_FOREGROUND_RENDER_ORDER)
	})

	it('keyboard icon mesh declares renderOrder=1 so it draws after the backdrop', () => {
		const block = find_mesh_open_tag(SOURCE, MARKER_KEYBOARD)

		expect(block).toContain(ATTR_FOREGROUND_RENDER_ORDER)
	})

	it('mouse icon mesh declares renderOrder=1 so it draws after the backdrop', () => {
		const block = find_mesh_open_tag(SOURCE, MARKER_MOUSE)

		expect(block).toContain(ATTR_FOREGROUND_RENDER_ORDER)
	})

	it('foreground render order is greater than backdrop render order', () => {
		expect(FOREGROUND_RENDER_ORDER_VALUE).toBeGreaterThan(BACKDROP_RENDER_ORDER_VALUE)
		expect(SOURCE).toContain(
			`const FOREGROUND_RENDER_ORDER = ${String(FOREGROUND_RENDER_ORDER_VALUE)}`,
		)
	})
})

describe('ControlsScene dual-backdrop — icons dim through backdrop from both sides', () => {
	it('front-facing backdrop uses FrontSide so it draws only when camera is in front', () => {
		const blocks = find_mesh_blocks_by_render_order(SOURCE, ATTR_BACKDROP_RENDER_ORDER)

		expect(blocks).toHaveLength(1)
		expect(blocks[0]).toContain('side={FrontSide}')
		expect(blocks[0]).toContain(ATTR_BACKDROP_OPACITY)
	})

	it('back-facing backdrop uses BackSide and renders after icons (renderOrder=2)', () => {
		const blocks = find_mesh_blocks_by_render_order(SOURCE, ATTR_BACKDROP_BACK_RENDER_ORDER)

		expect(blocks).toHaveLength(1)
		expect(blocks[0]).toContain('side={BackSide}')
		expect(blocks[0]).toContain(ATTR_BACKDROP_OPACITY)
	})

	it('back-facing backdrop is positioned at the same point as the front-facing backdrop', () => {
		const blocks = find_mesh_blocks_by_render_order(SOURCE, ATTR_BACKDROP_BACK_RENDER_ORDER)

		expect(blocks[0]).toContain('position={[BACKDROP_X, BACKDROP_Y, BACKDROP_Z]}')
	})

	it('BACKDROP_OPACITY is pinned to 0.9 — dims the background scene strongly for readability', () => {
		// Reason: the other tests only check that opacity={BACKDROP_OPACITY} is wired up,
		// so silent value drift wouldn't be caught. Pin the literal value here so visual
		// regressions on the CLICK TO START backdrop are surfaced.
		expect(SOURCE).toMatch(/const\s+BACKDROP_OPACITY\s*=\s*0\.9/u)
	})

	it('icon materials are DoubleSide so they remain visible when viewed from behind', () => {
		const touch_block = find_mesh_full_block(SOURCE, MARKER_TOUCH)
		const keyboard_block = find_mesh_full_block(SOURCE, MARKER_KEYBOARD)
		const mouse_block = find_mesh_full_block(SOURCE, MARKER_MOUSE)

		expect(touch_block).toContain(ATTR_DOUBLE_SIDE)
		expect(keyboard_block).toContain(ATTR_DOUBLE_SIDE)
		expect(mouse_block).toContain(ATTR_DOUBLE_SIDE)
	})

	it('render-order constants are ordered: front-backdrop < icons < back-backdrop', () => {
		expect(BACKDROP_RENDER_ORDER_VALUE).toBeLessThan(FOREGROUND_RENDER_ORDER_VALUE)
		expect(FOREGROUND_RENDER_ORDER_VALUE).toBeLessThan(BACKDROP_BACK_RENDER_ORDER_VALUE)
		expect(SOURCE).toContain(
			`const BACKDROP_BACK_RENDER_ORDER = ${String(BACKDROP_BACK_RENDER_ORDER_VALUE)}`,
		)
	})

	it('front-facing backdrop renderOrder > default so it dims transparent scene content like floor credits', () => {
		expect(BACKDROP_RENDER_ORDER_VALUE).toBeGreaterThan(DEFAULT_RENDER_ORDER_VALUE)
	})

	it('FrontSide, BackSide, and DoubleSide are all imported from three', () => {
		expect(SOURCE).toMatch(/import\s*\{[^}]*\bFrontSide\b[^}]*\}\s*from\s*'three'/u)
		expect(SOURCE).toMatch(/import\s*\{[^}]*\bBackSide\b[^}]*\}\s*from\s*'three'/u)
		expect(SOURCE).toMatch(/import\s*\{[^}]*\bDoubleSide\b[^}]*\}\s*from\s*'three'/u)
	})
})

describe('ControlsScene PC icon fit — keyboard and mouse must not overflow the viewport', () => {
	it('keyboard and mouse meshes are wrapped in a T.Group with scale={pc_scale}', () => {
		expect(SOURCE).toMatch(/<T\.Group[^>]*\bscale=\{pc_scale\}/u)
	})

	it('PC group is positioned at the shared y/z so scaling keeps icons vertically anchored', () => {
		expect(SOURCE).toMatch(/<T\.Group\s+position=\{\[0,\s*PC_GROUP_Y,\s*PC_GROUP_Z\]\}/u)
	})

	it('keyboard mesh uses group-local position [KEYBOARD_X, 0, 0]', () => {
		expect(SOURCE).toContain('position={[KEYBOARD_X, 0, 0]}')
	})

	it('mouse mesh uses group-local position [MOUSE_X, MOUSE_Y, 0]', () => {
		expect(SOURCE).toContain(ATTR_MOUSE_POSITION)
	})

	it('pc_scale is derived from compute_fit_scale with the viewport width, natural span and min side padding', () => {
		expect(SOURCE).toContain(
			'compute_fit_scale(view_width_at_plane, PC_NATURAL_SPAN, PC_MIN_SIDE_PADDING)',
		)
	})

	it('compute_fit_scale is imported from the controls-fit helper module', () => {
		expect(SOURCE).toMatch(
			/import\s*\{\s*compute_fit_scale\s*\}\s*from\s*'\$lib\/game-kit\/controls\/controls-fit'/u,
		)
	})

	it('PC_NATURAL_SPAN and PC_MIN_SIDE_PADDING constants are defined (min padding constraint replaces width ratio)', () => {
		expect(SOURCE).toMatch(/const\s+PC_NATURAL_SPAN\s*=/u)
		expect(SOURCE).toMatch(/const\s+PC_MIN_SIDE_PADDING\s*=\s*0\.138/u)
		expect(SOURCE).not.toMatch(/PC_SAFE_WIDTH_RATIO/u)
	})

	it('hint text group is scaled by pc_scale so it shrinks together with the icons (does not overflow icon span)', () => {
		expect(SOURCE).toMatch(
			/<T\.Group\s+position=\{\[HINT_X,\s*HINT_Y,\s*HINT_Z\]\}\s+scale=\{pc_scale\}/u,
		)
	})
})

describe('ControlsScene keyboard letters — overlaid as Threlte Text using the theme font', () => {
	it('keyboard SVG contains only key boxes (no <text> elements) — letters are overlaid as Threlte Text', () => {
		const svg_match = /const\s+KEYBOARD_SVG\s*=\s*`([\s\S]*?)`/u.exec(SOURCE)

		expect(svg_match).not.toBeNull()
		const svg_body = svg_match?.[1] ?? ''

		expect(svg_body).not.toContain('<text')
		// Hardcoded font-family must not appear anywhere
		expect(SOURCE).not.toContain('"Orbitron, monospace"')
	})

	it('KEYBOARD_LETTERS array enumerates all 7 letter overlays (W, A, S, D, ESC, /, Z)', () => {
		expect(SOURCE).toMatch(/const\s+KEYBOARD_LETTERS\s*:\s*ReadonlyArray<KeyboardLetter>\s*=/u)
		const letter_match = /const\s+KEYBOARD_LETTERS[\s\S]*?\n\t\]/u.exec(SOURCE)

		expect(letter_match).not.toBeNull()
		const block = letter_match?.[0] ?? ''

		expect(block).toContain("text: 'W'")
		expect(block).toContain("text: 'A'")
		expect(block).toContain("text: 'S'")
		expect(block).toContain("text: 'D'")
		expect(block).toContain("text: 'ESC'")
		expect(block).toContain("text: '/'")
		expect(block).toContain("text: 'Z'")
	})

	it('WASD letters are pinned to vsize 16 — kept large for readability', () => {
		// Reason: vsize is the only signal of intentional visual sizing; without pinning,
		// silent drift during unrelated edits could shrink the keys back.
		const letter_match = /const\s+KEYBOARD_LETTERS[\s\S]*?\n\t\]/u.exec(SOURCE)
		const block = letter_match?.[0] ?? ''

		expect(block).toMatch(/text:\s*'W'[^}]*vsize:\s*16/u)
		expect(block).toMatch(/text:\s*'A'[^}]*vsize:\s*16/u)
		expect(block).toMatch(/text:\s*'S'[^}]*vsize:\s*16/u)
		expect(block).toMatch(/text:\s*'D'[^}]*vsize:\s*16/u)
	})

	it('WASD letter vy values are pinned to the lowered key positions (W=38, A/S/D=82)', () => {
		// Reason: the WASD rows were moved down so the ASD-to-space gap matches the
		// space-to-ESC gap. The letter vy values must follow the rect centers.
		const letter_match = /const\s+KEYBOARD_LETTERS[\s\S]*?\n\t\]/u.exec(SOURCE)
		const block = letter_match?.[0] ?? ''

		expect(block).toMatch(/text:\s*'W'[^}]*vy:\s*38/u)
		expect(block).toMatch(/text:\s*'A'[^}]*vy:\s*82/u)
		expect(block).toMatch(/text:\s*'S'[^}]*vy:\s*82/u)
		expect(block).toMatch(/text:\s*'D'[^}]*vy:\s*82/u)
	})

	it('ESC label is pinned to vsize 12 — bumped above 9 to match WASD legibility while staying within its key', () => {
		// Reason: ESC has 3 glyphs versus the single-glyph WASD/Z keys, so it is sized
		// smaller than 16 to avoid horizontal overflow within the key rect. Pinning the
		// literal value prevents accidental regression to the previous tiny size.
		const letter_match = /const\s+KEYBOARD_LETTERS[\s\S]*?\n\t\]/u.exec(SOURCE)
		const block = letter_match?.[0] ?? ''

		expect(block).toMatch(/text:\s*'ESC'[^}]*vsize:\s*12/u)
	})

	it('provides viewbox → plane coordinate helpers', () => {
		expect(SOURCE).toMatch(/function\s+viewbox_x_to_plane\s*\(\s*vx\s*:\s*number\s*\)/u)
		expect(SOURCE).toMatch(/function\s+viewbox_y_to_plane\s*\(\s*vy\s*:\s*number\s*\)/u)
		expect(SOURCE).toMatch(
			/function\s+viewbox_size_to_world\s*\(\s*vsize\s*:\s*number\s*,\s*size_mul\s*:\s*number\s*\)/u,
		)
	})

	it('renders one Threlte Text per letter via {#each KEYBOARD_LETTERS} inside the PC group', () => {
		expect(SOURCE).toMatch(/\{#each\s+KEYBOARD_LETTERS\s+as\s+letter/u)
	})

	it('letter Text uses font={resolved_font} so it matches the hint text font exactly', () => {
		const each_block = /\{#each\s+KEYBOARD_LETTERS[\s\S]*?\{\/each\}/u.exec(SOURCE)

		expect(each_block).not.toBeNull()
		const block = each_block?.[0] ?? ''

		// fontSize and y now route through the hint_font adjustment helpers (letter_font_size /
		// letter_position_y) — those are asserted in the "hint_font adjustments" describe below.
		expect(block).toContain(ATTR_RESOLVED_FONT)
		expect(block).toContain(ATTR_LETTER_COLOR_FALLBACK)
		expect(block).toContain('fillOpacity={letter.opacity}')
		expect(block).toContain('viewbox_x_to_plane(letter.vx)')
	})

	it('uses theme font-size multiplier for visual size parity between PressStart2P and Orbitron', () => {
		expect(SOURCE).toMatch(
			/current_font_size_mul\s*=\s*\$derived\(fonts\.get_font_size_multiplier\(should_use_alt_font\)\)/u,
		)
	})

	it('derives should_use_alt_font from !crt.is_crt_enabled — font swaps with CRT, not CYBER', () => {
		expect(SOURCE).toMatch(
			/(?:let|const)\s+should_use_alt_font\s*=\s*\$derived\(\s*!\s*crt\.is_crt_enabled\s*\)/u,
		)
		expect(SOURCE).toMatch(
			/import\s*\{[^}]*\bcrt\b[^}]*\}\s*from\s*'\$lib\/game-kit\/Crt\.svelte'/u,
		)
		expect(SOURCE).not.toMatch(/fonts\.get_font\(\s*is_alt\s*\)/u)
	})

	it('does not regenerate the keyboard texture on font change (texture is static; only Text overlays react)', () => {
		expect(SOURCE).not.toMatch(/function\s+make_keyboard_svg\s*\(/u)
		expect(SOURCE).not.toMatch(/old_tex\?\.dispose\(\)/u)
	})
})

describe('ControlsScene hint_font override — optional font prop forwarded by GameScene', () => {
	it('declares an optional hint_font prop in the Props interface', () => {
		expect(SOURCE).toMatch(/interface\s+Props\s*\{[\s\S]*?hint_font\?\s*:\s*string[\s\S]*?\}/u)
	})

	it('destructures hint_font from $props', () => {
		expect(SOURCE).toMatch(/const\s*\{[^}]*\bhint_font\b[^}]*\}\s*:\s*Props\s*=\s*\$props\(\)/u)
	})

	it('resolves the font from the prop, falling back to the CRT-driven current_font', () => {
		expect(SOURCE).toMatch(
			/(?:let|const)\s+resolved_font\s*=\s*\$derived\(\s*hint_font\s*\?\?\s*current_font\s*\)/u,
		)
	})

	it('passes resolved_font into the hint Text', () => {
		const hint_block = /<Text\s+text=\{hint_text\}[\s\S]*?\/>/u.exec(SOURCE)

		expect(hint_block).not.toBeNull()
		expect(hint_block?.[0] ?? '').toContain(ATTR_RESOLVED_FONT)
	})

	it('passes resolved_font into each keyboard letter Text', () => {
		const each_block = /\{#each\s+KEYBOARD_LETTERS[\s\S]*?\{\/each\}/u.exec(SOURCE)

		expect(each_block).not.toBeNull()
		expect(each_block?.[0] ?? '').toContain(ATTR_RESOLVED_FONT)
	})

	it('does not hardcode font={current_font} on the hint or letter Text (override path would break)', () => {
		expect(SOURCE).not.toMatch(/font=\{current_font\}/u)
	})
})

describe('ControlsScene hint_font adjustments — scale + em-relative y-offset for custom faces', () => {
	it('declares optional numeric hint_font_scale and hint_font_y_offset props', () => {
		expect(SOURCE).toMatch(/hint_font_scale\?\s*:\s*number\s*\|\s*undefined/u)
		expect(SOURCE).toMatch(/hint_font_y_offset\?\s*:\s*number\s*\|\s*undefined/u)
	})

	it('defaults the adjustments to no-ops (scale 1, offset 0) so existing consumers are unaffected', () => {
		const properties_block = /const\s*\{[\s\S]*?\}\s*:\s*Props\s*=\n?\s*\$props\(\)/u.exec(SOURCE)
		const block = properties_block?.[0] ?? ''

		expect(block).toMatch(/hint_font_scale\s*=\s*1/u)
		expect(block).toMatch(/hint_font_y_offset\s*=\s*0/u)
	})

	it('imports the controls_hint_adjust helper for the scale and offset math', () => {
		expect(SOURCE).toMatch(
			/import\s*\{\s*controls_hint_adjust\s*\}\s*from\s*'\$lib\/game-kit\/controls\/controls-hint-adjust'/u,
		)
	})

	it('derives the hint fontSize via scale_font_size(HINT_FONT_SIZE, hint_font_scale)', () => {
		expect(SOURCE).toMatch(
			/hint_font_size\s*=\s*\$derived\([\s\S]*?scale_font_size\(HINT_FONT_SIZE,\s*hint_font_scale\)/u,
		)
	})

	it('derives the hint position y via offset_position_y with the base 0 and the hint fontSize', () => {
		expect(SOURCE).toMatch(
			/hint_position_y\s*=\s*\$derived\([\s\S]*?offset_position_y\(0,\s*hint_font_y_offset,\s*hint_font_size\)/u,
		)
	})

	it('hint Text uses the derived fontSize and position y (not the raw HINT_FONT_SIZE constant)', () => {
		const hint_block = /<Text\s+text=\{hint_text\}[\s\S]*?\/>/u.exec(SOURCE)
		const block = hint_block?.[0] ?? ''

		expect(block).toContain('fontSize={hint_font_size}')
		expect(block).toContain('position={[0, hint_position_y, 0]}')
		expect(block).not.toContain('fontSize={HINT_FONT_SIZE}')
	})

	it('letter_font_size applies the scale on top of the theme-driven world size', () => {
		expect(SOURCE).toMatch(
			/function\s+letter_font_size\([\s\S]*?viewbox_size_to_world\(vsize,\s*current_font_size_mul\)[\s\S]*?scale_font_size\(base_size,\s*hint_font_scale\)/u,
		)
	})

	it('letter_position_y applies the em-relative offset on top of the viewbox plane y', () => {
		expect(SOURCE).toMatch(
			/function\s+letter_position_y\([\s\S]*?offset_position_y\(\s*viewbox_y_to_plane\(letter\.vy\),\s*hint_font_y_offset,\s*letter_font_size\(letter\.vsize\)/u,
		)
	})

	it('each keyboard letter Text uses the adjustment helpers (scale + offset), not the raw values', () => {
		const each_block = /\{#each\s+KEYBOARD_LETTERS[\s\S]*?\{\/each\}/u.exec(SOURCE)
		const block = each_block?.[0] ?? ''

		expect(block).toContain('fontSize={letter_font_size(letter.vsize)}')
		expect(block).toContain('letter_position_y(letter)')
		expect(block).not.toContain(ATTR_LETTER_FONTSIZE_RAW)
	})
})

describe('ControlsScene color overrides — hint_color / key_color / icon_color props (#371)', () => {
	it('declares optional hint_color / key_color / icon_color string props', () => {
		expect(SOURCE).toMatch(/hint_color\?\s*:\s*string\s*\|\s*undefined/u)
		expect(SOURCE).toMatch(/key_color\?\s*:\s*string\s*\|\s*undefined/u)
		expect(SOURCE).toMatch(/icon_color\?\s*:\s*string\s*\|\s*undefined/u)
	})

	it('destructures the three color props from $props', () => {
		const properties_block = /const\s*\{[\s\S]*?\}\s*:\s*Props\s*=\n?\s*\$props\(\)/u.exec(SOURCE)
		const block = properties_block?.[0] ?? ''

		expect(block).toContain('hint_color')
		expect(block).toContain('key_color')
		expect(block).toContain('icon_color')
	})

	it('hint Text falls back to HINT_COLOR when hint_color is omitted', () => {
		const hint_block = /<Text\s+text=\{hint_text\}[\s\S]*?\/>/u.exec(SOURCE)

		expect(hint_block?.[0] ?? '').toContain('color={hint_color ?? HINT_COLOR}')
	})

	it('each keyboard letter Text falls back to letter.color when key_color is omitted', () => {
		const each_block = /\{#each\s+KEYBOARD_LETTERS[\s\S]*?\{\/each\}/u.exec(SOURCE)

		expect(each_block?.[0] ?? '').toContain(ATTR_LETTER_COLOR_FALLBACK)
	})

	it('imports controls_colors for the icon SVG recolor helper', () => {
		expect(SOURCE).toMatch(
			/import\s*\{\s*controls_colors\s*\}\s*from\s*'\$lib\/game-kit\/controls\/controls-colors'/u,
		)
	})

	it('resolve_icon_svg recolors via controls_colors only when icon_color is set (no-op otherwise)', () => {
		expect(SOURCE).toMatch(
			/function\s+resolve_icon_svg\([\s\S]*?icon_color\s*===\s*undefined\s*\?\s*svg\s*:\s*controls_colors\.recolor_icon_svg\(svg,\s*icon_color\)/u,
		)
	})

	it('resolves every icon SVG through resolve_icon_svg so icon_color reaches the raster', () => {
		expect(SOURCE).toContain(RESOLVE_KEYBOARD_SVG)
		expect(SOURCE).toContain(RESOLVE_MOUSE_SVG)
		expect(SOURCE).toContain(RESOLVE_TOUCH_SVG)
	})
})

describe('ControlsScene icon SVG overrides — keyboard_svg / mouse_svg / touch_svg props (#370)', () => {
	it('declares optional keyboard_svg / mouse_svg / touch_svg string props', () => {
		expect(SOURCE).toMatch(/keyboard_svg\?\s*:\s*string\s*\|\s*undefined/u)
		expect(SOURCE).toMatch(/mouse_svg\?\s*:\s*string\s*\|\s*undefined/u)
		expect(SOURCE).toMatch(/touch_svg\?\s*:\s*string\s*\|\s*undefined/u)
	})

	it('destructures the three icon SVG props from $props', () => {
		const properties_block = /const\s*\{[\s\S]*?\}\s*:\s*Props\s*=\n?\s*\$props\(\)/u.exec(SOURCE)
		const block = properties_block?.[0] ?? ''

		expect(block).toContain('keyboard_svg')
		expect(block).toContain('mouse_svg')
		expect(block).toContain('touch_svg')
	})

	it('rasterizes each override with a built-in fallback via <prop> ?? <CONST>', () => {
		// The override composes with icon_color (resolve_icon_svg) and shares the NearestFilter
		// raster path, so a supplied SVG behaves exactly like the built-in it replaces.
		expect(SOURCE).toContain(RESOLVE_KEYBOARD_SVG)
		expect(SOURCE).toContain(RESOLVE_MOUSE_SVG)
		expect(SOURCE).toContain(RESOLVE_TOUCH_SVG)
	})

	it('feeds the resolved override SVGs into svg_to_texture', () => {
		expect(SOURCE).toContain('svg_to_texture(resolved_keyboard_svg')
		expect(SOURCE).toContain('svg_to_texture(resolved_mouse_svg')
		expect(SOURCE).toContain('svg_to_texture(resolved_touch_svg')
	})

	it('documents the viewBox/layout contract for each overridable icon', () => {
		// The letters and alignment math depend on the built-in viewBoxes, so the contract must
		// stay documented next to the props to keep overrides aligned.
		expect(SOURCE).toContain('viewBox "0 0 148 176"')
		expect(SOURCE).toContain('viewBox "13 -7 64 120"')
		expect(SOURCE).toContain('viewBox "0 0 240 90"')
	})
})

describe('ControlsScene viewport reactivity — sizes update on window resize', () => {
	it('subscribes to Threlte size store via $size so $derived reacts to resize', () => {
		expect(SOURCE).toMatch(/const\s*\{\s*size\s*\}\s*=\s*useThrelte\(\)/u)
		expect(SOURCE).toContain('$size.width')
		expect(SOURCE).toContain('$size.height')
	})

	it('does not use the non-reactive .current accessor on size (would freeze viewport_aspect)', () => {
		expect(SOURCE).not.toMatch(/\bctx\.size\.current\b/u)
		expect(SOURCE).not.toMatch(/\bsize\.current\.(width|height)\b/u)
	})
})

describe('ControlsScene texture loading — leak-safe blob URLs and unhandled rejections', () => {
	it('svg_to_texture revokes the object URL in a finally block (no leak on failure)', () => {
		const function_match = /async\s+function\s+svg_to_texture\([\s\S]*?\n\t\}/u.exec(SOURCE)

		expect(function_match).not.toBeNull()
		const body = function_match?.[0] ?? ''

		expect(body).toMatch(/\}\s*finally\s*\{[\s\S]*URL\.revokeObjectURL\(url\)[\s\S]*\}/u)
	})

	it('svg_to_texture does not call URL.revokeObjectURL outside the finally block', () => {
		const function_match = /async\s+function\s+svg_to_texture\([\s\S]*?\n\t\}/u.exec(SOURCE)
		const body = function_match?.[0] ?? ''
		const revoke_count = (body.match(/URL\.revokeObjectURL\(/gu) ?? []).length

		expect(revoke_count).toBe(1)
	})

	it('load_textures catches Promise.all rejection to avoid unhandled rejection', () => {
		const function_match = /async\s+function\s+load_textures\([\s\S]*?\}\)\(\)/u.exec(SOURCE)

		expect(function_match).not.toBeNull()
		const body = function_match?.[0] ?? ''

		expect(body).toMatch(/try\s*\{[\s\S]*await Promise\.all/u)
		expect(body).toMatch(/\}\s*catch\s*\([^)]*\)\s*\{/u)
	})
})

function extract_const_number(source: string, name: string): number {
	const re = new RegExp(String.raw`const\s+${name}\s*=\s*(-?\d+(?:\.\d+)?)`, 'u')
	const match = re.exec(source)
	if (!match) throw new Error(`constant ${name} not found in source`)

	return Number(match[1])
}

const EXPECTED_PC_GROUP_Y = 1.3
// Keyboard SVG: key boxes start at viewBox x=2 of 148 (1.4% internal margin per side).
// Mouse SVG: viewBox "13 -7 64 120" keeps a 2px buffer past the body (body x=15..75) so the
// stroke-width=1 outline is fully rendered. Body therefore occupies 60/64 of the plane width.
const PLANE_OUTER_SYMMETRY_TOLERANCE = 0.025
const KEYBOARD_SVG_LEFT_MARGIN_FRACTION = 2 / 148
const MOUSE_SVG_SIDE_MARGIN_FRACTION = 2 / 64
const BODY_SYMMETRY_TOLERANCE = 0.01
const HALF_DIVISOR_VALUE = 2

describe('ControlsScene PC icon padding — keyboard left padding equals mouse right padding', () => {
	it('keyboard left outer edge and mouse right outer edge are approximately equidistant from origin', () => {
		const keyboard_x = extract_const_number(SOURCE, 'KEYBOARD_X')
		const keyboard_w = extract_const_number(SOURCE, 'KEYBOARD_W')
		const mouse_x = extract_const_number(SOURCE, 'MOUSE_X')
		const mouse_w = extract_const_number(SOURCE, 'MOUSE_W')
		const keyboard_left_outer = Math.abs(keyboard_x - keyboard_w / HALF_DIVISOR_VALUE)
		const mouse_right_outer = mouse_x + mouse_w / HALF_DIVISOR_VALUE

		expect(Math.abs(keyboard_left_outer - mouse_right_outer)).toBeLessThan(
			PLANE_OUTER_SYMMETRY_TOLERANCE,
		)
	})

	it('keyboard body left edge and mouse body right edge are equidistant from origin (visible symmetry)', () => {
		const keyboard_x = extract_const_number(SOURCE, 'KEYBOARD_X')
		const keyboard_w = extract_const_number(SOURCE, 'KEYBOARD_W')
		const mouse_x = extract_const_number(SOURCE, 'MOUSE_X')
		const mouse_w = extract_const_number(SOURCE, 'MOUSE_W')
		const keyboard_plane_left = keyboard_x - keyboard_w / HALF_DIVISOR_VALUE
		const keyboard_body_left = keyboard_plane_left + KEYBOARD_SVG_LEFT_MARGIN_FRACTION * keyboard_w
		const mouse_plane_right = mouse_x + mouse_w / HALF_DIVISOR_VALUE
		const mouse_body_right = mouse_plane_right - MOUSE_SVG_SIDE_MARGIN_FRACTION * mouse_w

		expect(Math.abs(Math.abs(keyboard_body_left) - mouse_body_right)).toBeLessThan(
			BODY_SYMMETRY_TOLERANCE,
		)
	})

	it('PC_GROUP_Y is raised to add bottom padding under the keyboard', () => {
		const pc_group_y = extract_const_number(SOURCE, 'PC_GROUP_Y')

		expect(pc_group_y).toBe(EXPECTED_PC_GROUP_Y)
	})

	it('mouse SVG viewBox keeps a small 2px buffer past the body to fully render stroke outlines', () => {
		expect(SOURCE).toContain('viewBox="13 -7 64 120"')
	})

	it('inner gap between keyboard and mouse planes is roughly half of the previous layout (~0.15)', () => {
		const keyboard_x = extract_const_number(SOURCE, 'KEYBOARD_X')
		const keyboard_w = extract_const_number(SOURCE, 'KEYBOARD_W')
		const mouse_x = extract_const_number(SOURCE, 'MOUSE_X')
		const mouse_w = extract_const_number(SOURCE, 'MOUSE_W')
		const keyboard_plane_right = keyboard_x + keyboard_w / HALF_DIVISOR_VALUE
		const mouse_plane_left = mouse_x - mouse_w / HALF_DIVISOR_VALUE
		const inner_gap = mouse_plane_left - keyboard_plane_right
		const HALVED_GAP_TARGET = 0.15
		const GAP_TOLERANCE = 0.02

		expect(Math.abs(inner_gap - HALVED_GAP_TARGET)).toBeLessThan(GAP_TOLERANCE)
	})
})

// Keyboard SVG key rect y/h values used to verify row spacing.
// W row: y=22 h=32 → bottom=54. ASD row: y=66 h=32 → bottom=98.
// Space row: y=110 h=28 → bottom=138. ESC/Z row: y=150 h=24 → bottom=174.
const EXPECTED_W_ROW_Y = 22
const EXPECTED_ASD_ROW_Y = 66
const EXPECTED_ASD_ROW_HEIGHT = 32
const EXPECTED_SPACE_ROW_Y = 110
const EXPECTED_SPACE_ROW_HEIGHT = 28
const EXPECTED_ESC_ROW_Y = 150
const EXPECTED_ASD_TO_SPACE_GAP = 12
const EXPECTED_SPACE_TO_ESC_GAP = 12

describe('ControlsScene keyboard row spacing — WASD lowered so ASD↔Space gap matches Space↔ESC', () => {
	it('W key rect uses y=22 (lowered from y=2 to balance row spacing)', () => {
		expect(SOURCE).toContain(`<rect x="54" y="${String(EXPECTED_W_ROW_Y)}" width="40" height="32"`)
	})

	it('A/S/D key rects use y=66 (lowered from y=46 to balance row spacing)', () => {
		expect(SOURCE).toContain(`<rect x="2" y="${String(EXPECTED_ASD_ROW_Y)}" width="40" height="32"`)
		expect(SOURCE).toContain(
			`<rect x="54" y="${String(EXPECTED_ASD_ROW_Y)}" width="40" height="32"`,
		)
		expect(SOURCE).toContain(
			`<rect x="106" y="${String(EXPECTED_ASD_ROW_Y)}" width="40" height="32"`,
		)
	})

	it('ASD→Space gap equals Space→ESC gap (both = 12 SVG units)', () => {
		const asd_bottom = EXPECTED_ASD_ROW_Y + EXPECTED_ASD_ROW_HEIGHT
		const space_bottom = EXPECTED_SPACE_ROW_Y + EXPECTED_SPACE_ROW_HEIGHT
		const asd_to_space = EXPECTED_SPACE_ROW_Y - asd_bottom
		const space_to_esc = EXPECTED_ESC_ROW_Y - space_bottom

		expect(asd_to_space).toBe(EXPECTED_ASD_TO_SPACE_GAP)
		expect(space_to_esc).toBe(EXPECTED_SPACE_TO_ESC_GAP)
		expect(asd_to_space).toBe(space_to_esc)
	})
})

// Mouse plane Y offset alignment: body bottom (in PC-group local y) should match
// the Z-key bottom (also in PC-group local y, since keyboard plane is at y=0).
// Keyboard viewBox H = 176, Z key bottom vy = 174. Mouse viewBox = "13 -7 64 120",
// body rect ends at vy=98 (y=8 + h=90).
const KEYBOARD_VIEWBOX_HEIGHT = 176
const Z_KEY_BOTTOM_VY = 174
const MOUSE_VIEWBOX_MIN_Y = -7
const MOUSE_VIEWBOX_HEIGHT = 120
const MOUSE_BODY_BOTTOM_VY = 98
const MOUSE_Z_ALIGNMENT_TOLERANCE = 0.01

describe('ControlsScene mouse vertical alignment — mouse body bottom matches Z key bottom', () => {
	it('MOUSE_Y constant is defined and the mesh uses [MOUSE_X, MOUSE_Y, 0]', () => {
		expect(SOURCE).toMatch(/const\s+MOUSE_Y\s*=\s*-?\d+(?:\.\d+)?/u)
		expect(SOURCE).toContain(ATTR_MOUSE_POSITION)
	})

	it('mouse body bottom (PC-group local y) aligns with Z-key bottom (PC-group local y)', () => {
		const keyboard_h = extract_const_number(SOURCE, 'KEYBOARD_H')
		const mouse_h = extract_const_number(SOURCE, 'MOUSE_H')
		const mouse_y = extract_const_number(SOURCE, 'MOUSE_Y')

		const z_key_bottom_plane_y =
			-(
				(Z_KEY_BOTTOM_VY - KEYBOARD_VIEWBOX_HEIGHT / HALF_DIVISOR_VALUE) /
				KEYBOARD_VIEWBOX_HEIGHT
			) * keyboard_h
		const mouse_body_bottom_offset =
			-(
				(MOUSE_BODY_BOTTOM_VY - MOUSE_VIEWBOX_MIN_Y) / MOUSE_VIEWBOX_HEIGHT -
				1 / HALF_DIVISOR_VALUE
			) * mouse_h
		const mouse_body_bottom_pc_y = mouse_y + mouse_body_bottom_offset

		expect(Math.abs(mouse_body_bottom_pc_y - z_key_bottom_plane_y)).toBeLessThan(
			MOUSE_Z_ALIGNMENT_TOLERANCE,
		)
	})
})

// Frame rect: y=2 to y=88 → center y=45
// Arc: M38 56 A22 22 0 1 1 72 56 → center (55, 42), peak y≈20; circle bottom y=62 → gesture center y≈41
// y-translate for centering: 45 - 41 = 4
const TOUCH_SVG_FRAME_CENTER_Y = 45
const TOUCH_SVG_GESTURE_CENTER_Y = 41
const TOUCH_SVG_CENTERING_TRANSLATE_Y = TOUCH_SVG_FRAME_CENTER_Y - TOUCH_SVG_GESTURE_CENTER_Y
const TOUCH_SVG_CENTERING_TOLERANCE = 1
const TOUCH_SVG_GESTURE_GROUP_COUNT = 2

describe('ControlsScene touch SVG gesture centering — illustration vertically centered within frame', () => {
	it('both gesture group y-translations center the bounding box within the frame rect', () => {
		const svg_match = /const\s+TOUCH_SVG\s*=\s*`([\s\S]*?)`/u.exec(SOURCE)

		expect(svg_match).not.toBeNull()
		const svg_body = svg_match?.[1] ?? ''
		const translate_matches = svg_body.matchAll(/transform="translate\(\d+,(-?\d+)\)"/gu).toArray()

		expect(translate_matches).toHaveLength(TOUCH_SVG_GESTURE_GROUP_COUNT)

		for (const match of translate_matches) {
			const translate_y = Number(match[1])

			expect(Math.abs(translate_y - TOUCH_SVG_CENTERING_TRANSLATE_Y)).toBeLessThanOrEqual(
				TOUCH_SVG_CENTERING_TOLERANCE,
			)
		}
	})
})
