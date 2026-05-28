import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-svelte'
import { CYBER_SWITCH_COLORS } from './switch-colors'
import type { SwitchGeometry } from './switch-config'
import Switch from './Switch.svelte'
import SWITCH_SOURCE from './Switch.svelte?raw'

vi.mock('@threlte/core', () => ({ T: {} }))
vi.mock('@threlte/extras', () => ({
	Text: function text_mock() {
		/* no-op */
	},
}))
vi.mock('$lib/game-kit/fonts', () => ({
	fonts: { get_font: vi.fn(() => ''), get_font_size_multiplier: vi.fn(() => 1) },
}))

const ACTIVE_LIGHT_DISTANCE = 3
const ACTIVE_LIGHT_INTENSITY = 3

const BASE_PROPS = {
	position_x: 1.6,
	is_active: false,
	icon_type: 'cyber' as const,
	label: 'CYBER',
	font: '',
	font_size_multiplier: 1,
	onclick: vi.fn(),
	colors: CYBER_SWITCH_COLORS,
}

describe('Switch', () => {
	it('renders cyber icon without geometry override', () => {
		const { container } = render(Switch, { props: BASE_PROPS })

		expect(container).toBeTruthy()
	})

	it('renders fullscreen icon without geometry override', () => {
		const { container } = render(Switch, {
			props: { ...BASE_PROPS, icon_type: 'fullscreen' as const },
		})

		expect(container).toBeTruthy()
	})

	it('renders crt icon without geometry override', () => {
		const { container } = render(Switch, {
			props: { ...BASE_PROPS, icon_type: 'crt' as const },
		})

		expect(container).toBeTruthy()
	})

	it('renders in active state', () => {
		const { container } = render(Switch, {
			props: { ...BASE_PROPS, is_active: true },
		})

		expect(container).toBeTruthy()
	})

	it('renders with partial geometry override', () => {
		const geometry: SwitchGeometry = { panel_size: 0.7, border_thickness: 0.02 }
		const { container } = render(Switch, {
			props: { ...BASE_PROPS, geometry },
		})

		expect(container).toBeTruthy()
	})

	it('renders with full geometry override', () => {
		const geometry: SwitchGeometry = {
			switch_y: 1.5,
			switch_z: -4.5,
			panel_size: 0.7,
			panel_depth: 0.03,
			panel_opacity_active: 0.2,
			panel_opacity_inactive: 0.06,
			border_thickness: 0.02,
			border_depth: 0.03,
			cyber_outer_ring_r: 0.25,
			cyber_outer_ring_tube: 0.018,
			cyber_inner_ring_r: 0.16,
			cyber_inner_ring_tube: 0.013,
			cyber_ring_radial: 8,
			cyber_ring_tubular: 6,
			cyber_inner_ring_rotation: Math.PI / 6,
			cyber_orb_r: 0.05,
			cyber_orb_segments: 12,
			cyber_icon_z: 0.016,
			corner_arm: 0.11,
			corner_thickness: 0.016,
			corner_depth: 0.019,
			corner_pos: 0.19,
			fullscreen_icon_z: 0.016,
			hit_area_depth: 0.011,
			hit_area_z: 0.07,
			label_font_size: 0.11,
			label_y_offset: 0.5,
			label_z: 0.06,
			active_light_z: 0.6,
			active_light_distance: ACTIVE_LIGHT_DISTANCE,
			active_light_intensity: ACTIVE_LIGHT_INTENSITY,
		}
		const { container } = render(Switch, { props: { ...BASE_PROPS, geometry } })

		expect(container).toBeTruthy()
	})
})

describe('Switch — panel_text material (matches the border frame glow)', () => {
	// Reason: troika Text defaults to MeshBasicMaterial with no emissive, so even when
	// `color={resolved.current_color}` matches the border the digits look flat against
	// the slightly-emissive panel face — the FPS value becomes hard to read. We provide
	// a MeshStandardMaterial wired to the same color/emissive/intensity as the border
	// frame ("枠") so the digits glow at matching brightness.

	it('imports MeshStandardMaterial from three', () => {
		expect(SWITCH_SOURCE).toMatch(/import\s*\{[^}]*MeshStandardMaterial[^}]*\}\s*from\s*'three'/u)
	})

	it('constructs a MeshStandardMaterial for panel_text', () => {
		expect(SWITCH_SOURCE).toMatch(/new\s+MeshStandardMaterial\(/u)
		// The result must be stored in a binding referenced by the Text tag (see below).
		expect(SWITCH_SOURCE).toMatch(/panel_text_material/u)
	})

	it('syncs the material color and emissive to the resolved border-frame values', () => {
		// Color = border color, emissive = border color, intensity = ring_emissive
		// (= same emissive intensity as the border frame).
		expect(SWITCH_SOURCE).toMatch(
			/panel_text_material\.color\.set\(\s*resolved\.current_color\s*\)/u,
		)
		expect(SWITCH_SOURCE).toMatch(
			/panel_text_material\.emissive\.set\(\s*resolved\.current_color\s*\)/u,
		)
		expect(SWITCH_SOURCE).toMatch(
			/panel_text_material\.emissiveIntensity\s*=\s*resolved\.ring_emissive/u,
		)
	})

	it('passes the custom material to the panel_text <Text> (no flat color prop)', () => {
		// panel_text Text must receive material={...}; the prior `color=` prop must be gone
		// so the material's color/emissive own the appearance.
		expect(SWITCH_SOURCE).toMatch(
			/text=\{\s*panel_text\s*\}[\s\S]*?material=\{\s*panel_text_material\s*\}/u,
		)
	})

	it('disposes the material on unmount', () => {
		expect(SWITCH_SOURCE).toMatch(/onDestroy\([\s\S]*panel_text_material\.dispose\(\)/u)
	})
})
