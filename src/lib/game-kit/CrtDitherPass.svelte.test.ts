import { describe, expect, it } from 'vitest'
import CRT_DITHER_PASS_SOURCE from './CrtDitherPass.svelte?raw'

// Component-level runtime tests would require a live WebGL post-processing pipeline inside
// vitest-browser-svelte, which is impractical. The dither math itself is verified in
// crt-dither.test.ts. Here we assert that the EffectComposer wiring stays correct so
// regressions in the post-processing chain are caught at the source level.

describe('CrtDitherPass.svelte — EffectComposer wiring', () => {
	it('imports EffectComposer / RenderPass / ShaderPass / OutputPass from three/examples', () => {
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/from\s+'three\/examples\/jsm\/postprocessing\/EffectComposer\.js'/u,
		)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/from\s+'three\/examples\/jsm\/postprocessing\/RenderPass\.js'/u,
		)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/from\s+'three\/examples\/jsm\/postprocessing\/ShaderPass\.js'/u,
		)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/from\s+'three\/examples\/jsm\/postprocessing\/OutputPass\.js'/u,
		)
	})

	it('imports dither / scanline / upscale shaders from crt-dither', () => {
		expect(CRT_DITHER_PASS_SOURCE).toMatch(/from\s+'\$lib\/game-kit\/crt-dither'/u)
		expect(CRT_DITHER_PASS_SOURCE).toContain('DITHER_FRAGMENT_SHADER')
		expect(CRT_DITHER_PASS_SOURCE).toContain('DITHER_VERTEX_SHADER')
		expect(CRT_DITHER_PASS_SOURCE).toContain('SCANLINE_FRAGMENT_SHADER')
		expect(CRT_DITHER_PASS_SOURCE).toContain('UPSCALE_FRAGMENT_SHADER')
	})

	it('uses useThrelte and useTask from @threlte/core', () => {
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/import\s*\{[^}]*useThrelte[^}]*\}\s*from\s*'@threlte\/core'/u,
		)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/import\s*\{[^}]*useTask[^}]*\}\s*from\s*'@threlte\/core'/u,
		)
	})

	it('disables Threlte default auto-render so the composer drives the frame', () => {
		expect(CRT_DITHER_PASS_SOURCE).toMatch(/context\.autoRender\.set\(\s*false\s*\)/u)
	})

	it('renders both composers in a useTask scheduled on ctx.renderStage', () => {
		expect(CRT_DITHER_PASS_SOURCE).toMatch(/useTask\([\s\S]*lo_composer\.render\(/u)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(/useTask\([\s\S]*hi_composer\.render\(/u)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(/stage:\s*context\.renderStage/u)
	})

	it('Stage 1 adds passes in order: RenderPass → OutputPass → ShaderPass(dither)', () => {
		// OutputPass applies sRGB conversion + AgX tonemap before dither/quantize.
		const render_index = CRT_DITHER_PASS_SOURCE.indexOf('lo_composer.addPass(render_pass)')
		const output_index = CRT_DITHER_PASS_SOURCE.indexOf('lo_composer.addPass(output_pass)')
		const dither_index = CRT_DITHER_PASS_SOURCE.indexOf('lo_composer.addPass(dither_pass)')

		expect(render_index).toBeGreaterThan(-1)
		expect(output_index).toBeGreaterThan(-1)
		expect(dither_index).toBeGreaterThan(-1)
		expect(render_index).toBeLessThan(output_index)
		expect(output_index).toBeLessThan(dither_index)
	})

	it('Stage 2 adds passes in order: upscale → scanline → barrel', () => {
		// Scanlines before barrel so they warp with the screen curvature.
		const upscale_index = CRT_DITHER_PASS_SOURCE.indexOf('hi_composer.addPass(upscale_pass)')
		const scanline_index = CRT_DITHER_PASS_SOURCE.indexOf('hi_composer.addPass(scanline_pass)')
		const barrel_index = CRT_DITHER_PASS_SOURCE.indexOf('hi_composer.addPass(barrel_pass)')

		expect(upscale_index).toBeGreaterThan(-1)
		expect(scanline_index).toBeGreaterThan(-1)
		expect(barrel_index).toBeGreaterThan(-1)
		expect(upscale_index).toBeLessThan(scanline_index)
		expect(scanline_index).toBeLessThan(barrel_index)
	})

	it('syncs lo_composer and hi_composer sizes inside the render task (not $effect)', () => {
		// Same rAF-vs-microtask rationale as the original single-composer setup.
		expect(CRT_DITHER_PASS_SOURCE).toMatch(/import\s*\{[^}]*Vector2[^}]*\}\s*from\s*'three'/u)
		expect(CRT_DITHER_PASS_SOURCE).toContain('lo_composer.setSize(')
		expect(CRT_DITHER_PASS_SOURCE).toContain('lo_composer.setPixelRatio(lo_dpr)')
		expect(CRT_DITHER_PASS_SOURCE).toContain('hi_composer.setSize(')
		expect(CRT_DITHER_PASS_SOURCE).toContain('hi_composer.setPixelRatio(context.dpr.current)')
		expect(CRT_DITHER_PASS_SOURCE).toContain('dither_uniforms.u_resolution.value.set(')
		// Negative: must NOT compute u_resolution from CSS × DPR (old bug).
		expect(CRT_DITHER_PASS_SOURCE).not.toMatch(/u_resolution\.value\.set\(\s*width\s*\*\s*dpr/u)
	})

	it('initializes the u_color_levels uniform as a Vector3 (per-channel quantization)', () => {
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/u_color_levels:\s*\{\s*value:\s*new Vector3\(\s*COLOR_LEVELS\.r,\s*COLOR_LEVELS\.g,\s*COLOR_LEVELS\.b\s*\)\s*\}/u,
		)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(/import\s*\{[^}]*Vector3[^}]*\}\s*from\s*'three'/u)
	})

	it('wraps the uniforms in a ShaderMaterial before passing to ShaderPass', () => {
		// Reason: passing a plain { uniforms, vertexShader, fragmentShader } object to
		// ShaderPass triggers UniformsUtils.clone, which deep-clones Vector2/Vector3/Texture
		// values — that decouples `dither_uniforms.u_resolution` from the uniform the shader
		// actually reads, leaving u_resolution stuck at (1,1) and the bayer texture sampling
		// a single cell (no visible dither, dark pixels crushed). Passing a ShaderMaterial
		// avoids the clone (ShaderPass uses material.uniforms directly).
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/import\s*\{[^}]*ShaderMaterial[^}]*\}\s*from\s*'three'/u,
		)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/new ShaderMaterial\(\s*\{\s*uniforms:\s*dither_uniforms[\s\S]*?\}\s*\)/u,
		)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(/new ShaderPass\(\s*dither_material\s*\)/u)
		// Negative: must NOT pass a plain object literal to ShaderPass (the bug pattern).
		expect(CRT_DITHER_PASS_SOURCE).not.toMatch(/new ShaderPass\(\s*\{\s*uniforms:/u)
	})

	it('forces NearestFilter on lo_composer render targets (keeps dither dots crisp)', () => {
		// NearestFilter prevents bilinear blur when the lo-res dithered output is
		// sampled by the upscale pass — ensures the pixel art dots stay sharp.
		expect(CRT_DITHER_PASS_SOURCE).toMatch(/import\s*\{[^}]*NearestFilter[^}]*\}\s*from\s*'three'/u)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/lo_composer\.renderTarget1\.texture\.minFilter\s*=\s*NearestFilter/u,
		)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/lo_composer\.renderTarget1\.texture\.magFilter\s*=\s*NearestFilter/u,
		)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/lo_composer\.renderTarget2\.texture\.minFilter\s*=\s*NearestFilter/u,
		)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/lo_composer\.renderTarget2\.texture\.magFilter\s*=\s*NearestFilter/u,
		)
	})

	it('imports crt store and bypasses the CRT pipeline when CRT is disabled', () => {
		expect(CRT_DITHER_PASS_SOURCE).toMatch(/from\s+'\$lib\/game-kit\/crt\.svelte'/u)
		expect(CRT_DITHER_PASS_SOURCE).toContain('crt.is_crt_enabled')
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/context\.renderer\.render\(context\.scene,\s*context\.camera\.current\)/u,
		)
	})

	it('imports SCANLINE_BLEED_FULL_PERIOD and scales u_bleed proportionally to period', () => {
		expect(CRT_DITHER_PASS_SOURCE).toContain('SCANLINE_BLEED_FULL_PERIOD')
		// u_bleed.value must be assigned dynamically (not only at init time)
		// so that short-period viewports (mobile) get reduced bleed.
		expect(CRT_DITHER_PASS_SOURCE).toMatch(/u_bleed\.value\s*=\s*Math\.min\(/u)
	})

	it('rounds u_scanline_period to nearest integer and clamps to minimum valid period', () => {
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/Math\.round\([^)]*DOTS_PER_SCANLINE[^)]*SCANLINE_PHASES_PER_CYCLE[^)]*hi_lo_ratio[^)]*\)/u,
		)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/Math\.max\(\s*DOTS_PER_SCANLINE\s*\*\s*SCANLINE_PHASES_PER_CYCLE/u,
		)
	})

	it('disposes both composers, bayer texture, and restores autoRender on unmount', () => {
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/onDestroy\(\s*\(\)\s*=>\s*\{[\s\S]*lo_composer\.dispose\(\)/u,
		)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(/hi_composer\.dispose\(\)/u)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(/bayer_texture\.dispose\(\)/u)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/onDestroy\([\s\S]*context\.autoRender\.set\(\s*true\s*\)/u,
		)
	})
})
