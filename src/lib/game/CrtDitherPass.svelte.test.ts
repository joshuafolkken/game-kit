import { describe, expect, it } from 'vitest'
import CRT_DITHER_PASS_SOURCE from './CrtDitherPass.svelte?raw'

// Component-level runtime tests would require a live WebGL post-processing pipeline inside
// vitest-browser-svelte, which is impractical. The dither math itself is verified in
// crt-dither.test.ts. Here we assert that the EffectComposer wiring stays correct so
// regressions in the post-processing chain are caught at the source level.

describe('CrtDitherPass.svelte — EffectComposer wiring', () => {
	it('imports EffectComposer / RenderPass / ShaderPass / OutputPass from three/examples', () => {
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/from\s+'three\/examples\/jsm\/postprocessing\/EffectComposer\.js'/,
		)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/from\s+'three\/examples\/jsm\/postprocessing\/RenderPass\.js'/,
		)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/from\s+'three\/examples\/jsm\/postprocessing\/ShaderPass\.js'/,
		)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/from\s+'three\/examples\/jsm\/postprocessing\/OutputPass\.js'/,
		)
	})

	it('imports the dither shader source from crt-dither', () => {
		expect(CRT_DITHER_PASS_SOURCE).toMatch(/from\s+'\$lib\/game\/crt-dither'/)
		expect(CRT_DITHER_PASS_SOURCE).toContain('DITHER_FRAGMENT_SHADER')
		expect(CRT_DITHER_PASS_SOURCE).toContain('DITHER_VERTEX_SHADER')
	})

	it('uses useThrelte and useTask from @threlte/core', () => {
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/import\s*\{[^}]*useThrelte[^}]*\}\s*from\s*'@threlte\/core'/,
		)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/import\s*\{[^}]*useTask[^}]*\}\s*from\s*'@threlte\/core'/,
		)
	})

	it('disables Threlte default auto-render so the composer drives the frame', () => {
		expect(CRT_DITHER_PASS_SOURCE).toMatch(/ctx\.autoRender\.set\(\s*false\s*\)/)
	})

	it('runs composer.render in a useTask scheduled on ctx.renderStage', () => {
		expect(CRT_DITHER_PASS_SOURCE).toMatch(/useTask\([\s\S]*composer\.render\(/)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(/stage:\s*ctx\.renderStage/)
	})

	it('adds passes in the order RenderPass → OutputPass → ShaderPass(dither)', () => {
		// Reason: OutputPass applies sRGB conversion + AgX tonemap. Quantization, dither
		// and BLACK_FLOOR must run AFTER it so they operate in display sRGB space —
		// otherwise AgX crushes the floor and shadowed room walls collapse to black.
		const render_idx = CRT_DITHER_PASS_SOURCE.indexOf('composer.addPass(render_pass)')
		const output_idx = CRT_DITHER_PASS_SOURCE.indexOf('composer.addPass(output_pass)')
		const dither_idx = CRT_DITHER_PASS_SOURCE.indexOf('composer.addPass(dither_pass)')
		expect(render_idx).toBeGreaterThan(-1)
		expect(output_idx).toBeGreaterThan(-1)
		expect(dither_idx).toBeGreaterThan(-1)
		expect(render_idx).toBeLessThan(output_idx)
		expect(output_idx).toBeLessThan(dither_idx)
	})

	it('reacts to size and dpr changes via $effect', () => {
		expect(CRT_DITHER_PASS_SOURCE).toMatch(/\$effect\([\s\S]*ctx\.size\.current/)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(/composer\.setSize/)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(/dither_uniforms\.u_resolution/)
	})

	it('initializes the u_color_levels uniform as a Vector3 (per-channel quantization)', () => {
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/u_color_levels:\s*\{\s*value:\s*new Vector3\(\s*COLOR_LEVELS\.r,\s*COLOR_LEVELS\.g,\s*COLOR_LEVELS\.b\s*\)\s*\}/,
		)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(/import\s*\{[^}]*Vector3[^}]*\}\s*from\s*'three'/)
	})

	it('disposes the composer, bayer texture, and restores autoRender on unmount', () => {
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/onDestroy\(\s*\(\)\s*=>\s*\{[\s\S]*composer\.dispose\(\)/,
		)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(/bayer_texture\.dispose\(\)/)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(/onDestroy\([\s\S]*ctx\.autoRender\.set\(\s*true\s*\)/)
	})
})
