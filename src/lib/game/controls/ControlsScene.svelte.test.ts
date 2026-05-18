import { describe, expect, it } from 'vitest'
import SOURCE from './ControlsScene.svelte?raw'

const BACKDROP_RENDER_ORDER_VALUE = 1
const FOREGROUND_RENDER_ORDER_VALUE = 2
const BACKDROP_BACK_RENDER_ORDER_VALUE = 3
const DEFAULT_RENDER_ORDER_VALUE = 0

function find_mesh_open_tag(source: string, position_marker: string): string {
	const start_index = source.indexOf(position_marker)
	if (start_index < 0) throw new Error(`mesh with marker "${position_marker}" not found`)
	const block_start = source.lastIndexOf('<T.Mesh', start_index)
	const block_end = source.indexOf('>', start_index)
	if (block_start < 0 || block_end < 0) throw new Error(`mesh open tag not bounded`)
	return source.slice(block_start, block_end + 1)
}

function find_mesh_full_block(source: string, position_marker: string): string {
	const start_index = source.indexOf(position_marker)
	if (start_index < 0) throw new Error(`mesh with marker "${position_marker}" not found`)
	const block_start = source.lastIndexOf('<T.Mesh', start_index)
	const block_end = source.indexOf('</T.Mesh>', start_index)
	if (block_start < 0 || block_end < 0) throw new Error(`mesh full block not bounded`)
	return source.slice(block_start, block_end)
}

function find_mesh_blocks_by_render_order(source: string, render_order_token: string): string[] {
	const blocks: string[] = []
	let cursor = 0
	while (cursor < source.length) {
		const order_index = source.indexOf(render_order_token, cursor)
		if (order_index < 0) break
		const block_start = source.lastIndexOf('<T.Mesh', order_index)
		const block_end = source.indexOf('</T.Mesh>', order_index)
		if (block_start < 0 || block_end < 0) break
		blocks.push(source.slice(block_start, block_end))
		cursor = block_end + 1
	}
	return blocks
}

describe('ControlsScene render order — regression for camera-angle brightness flicker', () => {
	it('backdrop mesh declares renderOrder=0 so it draws before foreground icons', () => {
		const block = find_mesh_open_tag(SOURCE, 'BACKDROP_X, BACKDROP_Y, BACKDROP_Z')
		expect(block).toContain(`renderOrder={BACKDROP_RENDER_ORDER}`)
		expect(SOURCE).toContain(`const BACKDROP_RENDER_ORDER = ${String(BACKDROP_RENDER_ORDER_VALUE)}`)
	})

	it('touch icon mesh declares renderOrder=1 so it draws after the backdrop', () => {
		const block = find_mesh_open_tag(SOURCE, '[0, TOUCH_Y, TOUCH_Z]')
		expect(block).toContain(`renderOrder={FOREGROUND_RENDER_ORDER}`)
	})

	it('keyboard icon mesh declares renderOrder=1 so it draws after the backdrop', () => {
		const block = find_mesh_open_tag(SOURCE, '[KEYBOARD_X, 0, 0]')
		expect(block).toContain(`renderOrder={FOREGROUND_RENDER_ORDER}`)
	})

	it('mouse icon mesh declares renderOrder=1 so it draws after the backdrop', () => {
		const block = find_mesh_open_tag(SOURCE, '[MOUSE_X, 0, 0]')
		expect(block).toContain(`renderOrder={FOREGROUND_RENDER_ORDER}`)
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
		const blocks = find_mesh_blocks_by_render_order(SOURCE, 'renderOrder={BACKDROP_RENDER_ORDER}')
		expect(blocks).toHaveLength(1)
		expect(blocks[0]).toContain('side={FrontSide}')
		expect(blocks[0]).toContain('opacity={BACKDROP_OPACITY}')
	})

	it('back-facing backdrop uses BackSide and renders after icons (renderOrder=2)', () => {
		const blocks = find_mesh_blocks_by_render_order(
			SOURCE,
			'renderOrder={BACKDROP_BACK_RENDER_ORDER}',
		)
		expect(blocks).toHaveLength(1)
		expect(blocks[0]).toContain('side={BackSide}')
		expect(blocks[0]).toContain('opacity={BACKDROP_OPACITY}')
	})

	it('back-facing backdrop is positioned at the same point as the front-facing backdrop', () => {
		const blocks = find_mesh_blocks_by_render_order(
			SOURCE,
			'renderOrder={BACKDROP_BACK_RENDER_ORDER}',
		)
		expect(blocks[0]).toContain('position={[BACKDROP_X, BACKDROP_Y, BACKDROP_Z]}')
	})

	it('icon materials are DoubleSide so they remain visible when viewed from behind', () => {
		const touch_block = find_mesh_full_block(SOURCE, '[0, TOUCH_Y, TOUCH_Z]')
		const keyboard_block = find_mesh_full_block(SOURCE, '[KEYBOARD_X, 0, 0]')
		const mouse_block = find_mesh_full_block(SOURCE, '[MOUSE_X, 0, 0]')
		expect(touch_block).toContain('side={DoubleSide}')
		expect(keyboard_block).toContain('side={DoubleSide}')
		expect(mouse_block).toContain('side={DoubleSide}')
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
		expect(SOURCE).toMatch(/import\s*\{[^}]*\bFrontSide\b[^}]*\}\s*from\s*'three'/)
		expect(SOURCE).toMatch(/import\s*\{[^}]*\bBackSide\b[^}]*\}\s*from\s*'three'/)
		expect(SOURCE).toMatch(/import\s*\{[^}]*\bDoubleSide\b[^}]*\}\s*from\s*'three'/)
	})
})

describe('ControlsScene PC icon fit — keyboard and mouse must not overflow the viewport', () => {
	it('keyboard and mouse meshes are wrapped in a T.Group with scale={pc_scale}', () => {
		expect(SOURCE).toMatch(/<T\.Group[^>]*\bscale=\{pc_scale\}/)
	})

	it('PC group is positioned at the shared y/z so scaling keeps icons vertically anchored', () => {
		expect(SOURCE).toMatch(/<T\.Group\s+position=\{\[0,\s*PC_GROUP_Y,\s*PC_GROUP_Z\]\}/)
	})

	it('keyboard mesh uses group-local position [KEYBOARD_X, 0, 0]', () => {
		expect(SOURCE).toContain('position={[KEYBOARD_X, 0, 0]}')
	})

	it('mouse mesh uses group-local position [MOUSE_X, 0, 0]', () => {
		expect(SOURCE).toContain('position={[MOUSE_X, 0, 0]}')
	})

	it('pc_scale is derived from compute_fit_scale with the viewport width, natural span and min side padding', () => {
		expect(SOURCE).toContain(
			'compute_fit_scale(view_width_at_plane, PC_NATURAL_SPAN, PC_MIN_SIDE_PADDING)',
		)
	})

	it('compute_fit_scale is imported from the controls-fit helper module', () => {
		expect(SOURCE).toMatch(
			/import\s*\{\s*compute_fit_scale\s*\}\s*from\s*'\$lib\/game\/controls\/controls-fit'/,
		)
	})

	it('PC_NATURAL_SPAN and PC_MIN_SIDE_PADDING constants are defined (min padding constraint replaces width ratio)', () => {
		expect(SOURCE).toMatch(/const\s+PC_NATURAL_SPAN\s*=/)
		expect(SOURCE).toMatch(/const\s+PC_MIN_SIDE_PADDING\s*=\s*0\.138/)
		expect(SOURCE).not.toMatch(/PC_SAFE_WIDTH_RATIO/)
	})

	it('hint text group is scaled by pc_scale so it shrinks together with the icons (does not overflow icon span)', () => {
		expect(SOURCE).toMatch(
			/<T\.Group\s+position=\{\[HINT_X,\s*HINT_Y,\s*HINT_Z\]\}\s+scale=\{pc_scale\}/,
		)
	})
})

describe('ControlsScene keyboard letters — overlaid as Threlte Text using the theme font', () => {
	it('keyboard SVG contains only key boxes (no <text> elements) — letters are overlaid as Threlte Text', () => {
		const svg_match = SOURCE.match(/const\s+KEYBOARD_SVG\s*=\s*`([\s\S]*?)`/)
		expect(svg_match).not.toBeNull()
		const svg_body = svg_match?.[1] ?? ''
		expect(svg_body).not.toContain('<text')
		// Hardcoded font-family must not appear anywhere
		expect(SOURCE).not.toContain('"Orbitron, monospace"')
	})

	it('KEYBOARD_LETTERS array enumerates all 7 letter overlays (W, A, S, D, ESC, /, Z)', () => {
		expect(SOURCE).toMatch(/const\s+KEYBOARD_LETTERS\s*:\s*ReadonlyArray<KeyboardLetter>\s*=/)
		const letter_match = SOURCE.match(/const\s+KEYBOARD_LETTERS[\s\S]*?\n\t\]/)
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

	it('provides viewbox → plane coordinate helpers', () => {
		expect(SOURCE).toMatch(/function\s+viewbox_x_to_plane\s*\(\s*vx\s*:\s*number\s*\)/)
		expect(SOURCE).toMatch(/function\s+viewbox_y_to_plane\s*\(\s*vy\s*:\s*number\s*\)/)
		expect(SOURCE).toMatch(
			/function\s+viewbox_size_to_world\s*\(\s*vsize\s*:\s*number\s*,\s*size_mul\s*:\s*number\s*\)/,
		)
	})

	it('renders one Threlte Text per letter via {#each KEYBOARD_LETTERS} inside the PC group', () => {
		expect(SOURCE).toMatch(/\{#each\s+KEYBOARD_LETTERS\s+as\s+letter/)
	})

	it('letter Text uses font={current_font} so it matches the hint text font exactly', () => {
		const each_block = SOURCE.match(/\{#each\s+KEYBOARD_LETTERS[\s\S]*?\{\/each\}/)
		expect(each_block).not.toBeNull()
		const block = each_block?.[0] ?? ''
		expect(block).toContain('font={current_font}')
		expect(block).toContain('fontSize={viewbox_size_to_world(letter.vsize, current_font_size_mul)}')
		expect(block).toContain('color={letter.color}')
		expect(block).toContain('fillOpacity={letter.opacity}')
		expect(block).toContain('viewbox_x_to_plane(letter.vx)')
		expect(block).toContain('viewbox_y_to_plane(letter.vy)')
	})

	it('uses theme font-size multiplier for visual size parity between PressStart2P and Orbitron', () => {
		expect(SOURCE).toMatch(
			/current_font_size_mul\s*=\s*\$derived\(fonts\.get_font_size_multiplier\(is_alt\)\)/,
		)
	})

	it('does not regenerate the keyboard texture on font change (texture is static; only Text overlays react)', () => {
		expect(SOURCE).not.toMatch(/function\s+make_keyboard_svg\s*\(/)
		expect(SOURCE).not.toMatch(/old_tex\?\.dispose\(\)/)
	})
})

describe('ControlsScene viewport reactivity — sizes update on window resize', () => {
	it('subscribes to Threlte size store via $size so $derived reacts to resize', () => {
		expect(SOURCE).toMatch(/const\s*\{\s*size\s*\}\s*=\s*useThrelte\(\)/)
		expect(SOURCE).toContain('$size.width')
		expect(SOURCE).toContain('$size.height')
	})

	it('does not use the non-reactive .current accessor on size (would freeze viewport_aspect)', () => {
		expect(SOURCE).not.toMatch(/\bctx\.size\.current\b/)
		expect(SOURCE).not.toMatch(/\bsize\.current\.(width|height)\b/)
	})
})

function extract_const_number(source: string, name: string): number {
	const re = new RegExp(`const\\s+${name}\\s*=\\s*(-?\\d+(?:\\.\\d+)?)`)
	const match = source.match(re)
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
