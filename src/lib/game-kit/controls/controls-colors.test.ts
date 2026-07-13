import { describe, expect, it } from 'vitest'
import { controls_colors } from './controls-colors'

describe('controls_colors.recolor_icon_svg', () => {
	it('swaps the r/g/b channels of every rgba() to the target color while preserving each alpha', () => {
		const svg = '<rect fill="rgba(120,80,255,0.15)" stroke="rgba(160,120,255,0.8)"/>'

		const result = controls_colors.recolor_icon_svg(svg, '#33ccff')

		expect(result).toBe('<rect fill="rgba(51,204,255,0.15)" stroke="rgba(51,204,255,0.8)"/>')
	})

	it('preserves distinct per-element alphas so depth/opacity is retained after recolor', () => {
		const svg = 'rgba(200,180,255,0.9) rgba(120,100,200,0.5) rgba(120,80,255,0.05)'

		const result = controls_colors.recolor_icon_svg(svg, '#00ff88')

		expect(result).toBe('rgba(0,255,136,0.9) rgba(0,255,136,0.5) rgba(0,255,136,0.05)')
	})

	it('accepts a hex color without a leading hash', () => {
		const result = controls_colors.recolor_icon_svg('rgba(1,2,3,0.4)', 'ff0000')

		expect(result).toBe('rgba(255,0,0,0.4)')
	})

	it('expands a 3-digit shorthand hex before substituting channels', () => {
		const result = controls_colors.recolor_icon_svg('rgba(1,2,3,0.7)', '#0af')

		expect(result).toBe('rgba(0,170,255,0.7)')
	})

	it('tolerates whitespace inside the rgba() argument list', () => {
		const result = controls_colors.recolor_icon_svg('rgba( 10, 20, 30, 0.6 )', '#010203')

		expect(result).toBe('rgba(1,2,3,0.6)')
	})

	it('leaves non-rgba markup untouched', () => {
		const svg = '<svg viewBox="0 0 10 10" fill="none"><path d="M0 0 L1 1"/></svg>'

		const result = controls_colors.recolor_icon_svg(svg, '#33ccff')

		expect(result).toBe(svg)
	})

	it('returns the svg unchanged when the color is not a valid hex', () => {
		const svg = 'rgba(120,80,255,0.15)'

		expect(controls_colors.recolor_icon_svg(svg, 'not-a-color')).toBe(svg)
		expect(controls_colors.recolor_icon_svg(svg, '#12')).toBe(svg)
		expect(controls_colors.recolor_icon_svg(svg, '')).toBe(svg)
	})
})
