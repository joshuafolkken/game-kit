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

	it('syncs composer size, pixel ratio, and u_resolution inside the render task (not $effect)', () => {
		// Reason: Threlte runs resizeStage (renderer.setSize + invalidate) → renderStage
		// (our task) inside one rAF. $effect fires in a microtask AFTER the rAF, so an
		// $effect-driven composer.setSize lags one frame behind the renderer during resize.
		// Once the resize stops and frameInvalidated drops back to false, renderStage stops
		// running too — the canvas freezes on the mismatched frame. Doing the sync inside
		// the render task reads ctx.size / ctx.dpr AFTER resizeStage updated them, and
		// u_resolution is sourced from renderer.getDrawingBufferSize so Three.js's
		// Math.floor() rounding is honored too.
		expect(CRT_DITHER_PASS_SOURCE).toMatch(/import\s*\{[^}]*Vector2[^}]*\}\s*from\s*'three'/)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/useTask\(\s*\([^)]*\)\s*=>\s*\{[\s\S]*?composer\.setSize\(\s*ctx\.size\.current\.width[\s\S]*?composer\.setPixelRatio\(\s*ctx\.dpr\.current[\s\S]*?ctx\.renderer\.getDrawingBufferSize\([\s\S]*?dither_uniforms\.u_resolution\.value\.copy\([\s\S]*?composer\.render\(/,
		)
		// Negative: composer.setSize / setPixelRatio must appear exactly once each (inside
		// useTask). Two occurrences would mean a stale $effect copy still drives the
		// composer — the lag-by-one-frame bug pattern.
		const set_size_count = (CRT_DITHER_PASS_SOURCE.match(/composer\.setSize\(/g) ?? []).length
		const set_pixel_ratio_count = (CRT_DITHER_PASS_SOURCE.match(/composer\.setPixelRatio\(/g) ?? [])
			.length
		expect(set_size_count).toBe(1)
		expect(set_pixel_ratio_count).toBe(1)
		// Negative: must NOT compute u_resolution from CSS × DPR (old bug).
		expect(CRT_DITHER_PASS_SOURCE).not.toMatch(/u_resolution\.value\.set\(\s*width\s*\*\s*dpr/)
	})

	it('initializes the u_color_levels uniform as a Vector3 (per-channel quantization)', () => {
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/u_color_levels:\s*\{\s*value:\s*new Vector3\(\s*COLOR_LEVELS\.r,\s*COLOR_LEVELS\.g,\s*COLOR_LEVELS\.b\s*\)\s*\}/,
		)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(/import\s*\{[^}]*Vector3[^}]*\}\s*from\s*'three'/)
	})

	it('wraps the uniforms in a ShaderMaterial before passing to ShaderPass', () => {
		// Reason: passing a plain { uniforms, vertexShader, fragmentShader } object to
		// ShaderPass triggers UniformsUtils.clone, which deep-clones Vector2/Vector3/Texture
		// values — that decouples `dither_uniforms.u_resolution` from the uniform the shader
		// actually reads, leaving u_resolution stuck at (1,1) and the bayer texture sampling
		// a single cell (no visible dither, dark pixels crushed). Passing a ShaderMaterial
		// avoids the clone (ShaderPass uses material.uniforms directly).
		expect(CRT_DITHER_PASS_SOURCE).toMatch(/import\s*\{[^}]*ShaderMaterial[^}]*\}\s*from\s*'three'/)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/new ShaderMaterial\(\s*\{\s*uniforms:\s*dither_uniforms[\s\S]*?\}\s*\)/,
		)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(/new ShaderPass\(\s*dither_material\s*\)/)
		// Negative: must NOT pass a plain object literal to ShaderPass (the bug pattern).
		expect(CRT_DITHER_PASS_SOURCE).not.toMatch(/new ShaderPass\(\s*\{\s*uniforms:/)
	})

	it('forces NearestFilter on the composer render targets to avoid bilinear blur on resize', () => {
		// Reason: composer.setSize allocates RTs at `width * _pixelRatio` (unrounded) but
		// WebGLRenderer floors the canvas to `Math.floor(width * _pixelRatio)`. After any
		// resize where width × dpr is non-integer the RT and canvas differ by up to 1
		// device pixel, and the dither pass's texture2D(tDiffuse, v_uv) sampling
		// bilinearly interpolates the RT under the default LinearFilter — softening the
		// whole image until reload. NearestFilter eliminates the interpolation.
		expect(CRT_DITHER_PASS_SOURCE).toMatch(/import\s*\{[^}]*NearestFilter[^}]*\}\s*from\s*'three'/)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/composer\.renderTarget1\.texture\.minFilter\s*=\s*NearestFilter/,
		)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/composer\.renderTarget1\.texture\.magFilter\s*=\s*NearestFilter/,
		)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/composer\.renderTarget2\.texture\.minFilter\s*=\s*NearestFilter/,
		)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/composer\.renderTarget2\.texture\.magFilter\s*=\s*NearestFilter/,
		)
	})

	it('disposes the composer, bayer texture, and restores autoRender on unmount', () => {
		expect(CRT_DITHER_PASS_SOURCE).toMatch(
			/onDestroy\(\s*\(\)\s*=>\s*\{[\s\S]*composer\.dispose\(\)/,
		)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(/bayer_texture\.dispose\(\)/)
		expect(CRT_DITHER_PASS_SOURCE).toMatch(/onDestroy\([\s\S]*ctx\.autoRender\.set\(\s*true\s*\)/)
	})
})
