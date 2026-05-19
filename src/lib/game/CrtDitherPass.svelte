<script lang="ts">
	import { useTask, useThrelte } from '@threlte/core'
	import {
		BAYER_SIZE,
		BLACK_FLOOR,
		COLOR_LEVELS,
		crt_dither,
		DITHER_FRAGMENT_SHADER,
		DITHER_VERTEX_SHADER,
	} from '$lib/game/crt-dither'
	import { onDestroy } from 'svelte'
	import { NearestFilter, ShaderMaterial, Vector2, Vector3 } from 'three'
	import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
	import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
	import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
	import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'

	const ctx = useThrelte()

	// Take over the render loop so the scene is composited through our Bayer-dither pass
	// instead of Threlte's default direct-to-canvas render.
	ctx.autoRender.set(false)

	const bayer_texture = crt_dither.create_bayer_texture()
	const composer = new EffectComposer(ctx.renderer)
	// Force NearestFilter on the composer's internal render targets. Reason:
	// composer.setSize allocates RTs at `width * _pixelRatio` (unrounded) while
	// WebGLRenderer.setSize floors the canvas to `Math.floor(width * _pixelRatio)`.
	// After any resize where width × dpr is non-integer, the composer RT and the
	// canvas viewport differ by up to 1 device pixel. With the default LinearFilter,
	// the final dither pass's texture2D(tDiffuse, v_uv) call bilinearly interpolates
	// the RT — softening the dither dots and UI text on every resize until reload.
	// NearestFilter sidesteps the interpolation. Texture filter settings live on the
	// Texture object, so dispose/realloc via setSize preserves them across resizes.
	composer.renderTarget1.texture.minFilter = NearestFilter
	composer.renderTarget1.texture.magFilter = NearestFilter
	composer.renderTarget2.texture.minFilter = NearestFilter
	composer.renderTarget2.texture.magFilter = NearestFilter
	const render_pass = new RenderPass(ctx.scene, ctx.camera.current)
	// Build uniforms inside a ShaderMaterial first, then hand the material to ShaderPass.
	// Reason: passing a plain {uniforms, vertexShader, fragmentShader} object to ShaderPass
	// triggers UniformsUtils.clone, which deep-clones every Vector2/Vector3/Texture — so a
	// later `dither_uniforms.u_resolution.value.set(...)` would mutate the local copy, not
	// the cloned uniform the shader actually reads, leaving u_resolution stuck at (1,1)
	// (bayer would only sample cell (0,0), hiding the dither and crushing dark pixels).
	// ShaderPass skips the clone when given a ShaderMaterial, so dither_uniforms stays live.
	const dither_uniforms = {
		tDiffuse: { value: null },
		u_bayer: { value: bayer_texture },
		u_resolution: { value: new Vector2(1, 1) },
		u_color_levels: { value: new Vector3(COLOR_LEVELS.r, COLOR_LEVELS.g, COLOR_LEVELS.b) },
		u_black_floor: { value: BLACK_FLOOR },
		u_bayer_size: { value: BAYER_SIZE },
	}
	const dither_material = new ShaderMaterial({
		uniforms: dither_uniforms,
		vertexShader: DITHER_VERTEX_SHADER,
		fragmentShader: DITHER_FRAGMENT_SHADER,
	})
	const dither_pass = new ShaderPass(dither_material)
	const output_pass = new OutputPass()

	// Pass order matters: OutputPass applies tone mapping + sRGB conversion. Running it
	// BEFORE the dither pass means our quantization, dither offset, and BLACK_FLOOR all
	// operate in sRGB display space — matching the previous SVG feComponentTransfer
	// pipeline. Putting OutputPass last (the Three.js docs' default) would make the
	// dither operate in linear space, where the AgX tonemap then crushes BLACK_FLOOR
	// into near-black and the room walls go solid black.
	composer.addPass(render_pass)
	composer.addPass(output_pass)
	composer.addPass(dither_pass)

	$effect(() => {
		render_pass.camera = ctx.camera.current
	})

	// Sync composer RT size, pixel ratio, and u_resolution inside the render task — NOT in
	// an $effect. Reason: Threlte's rAF runs stages in resizeStage (renderer.setSize +
	// invalidate) → renderStage (this task). $effect fires in a microtask AFTER the rAF
	// completes, so an $effect-driven composer.setSize would always lag one frame behind
	// the renderer during resize. Worse, once the resize stops and frameInvalidated drops
	// back to false, renderStage stops running entirely — the canvas freezes on the last
	// (mismatched) frame, which is why the dither used to look "汚い" until reload. Doing
	// it here reads ctx.size / ctx.dpr after resizeStage has already updated them, so
	// composer RT exactly matches the canvas every render. u_resolution is sourced from
	// renderer.getDrawingBufferSize() so it picks up Three.js's Math.floor() rounding too.
	const drawing_buffer_size = new Vector2()
	useTask(
		(delta) => {
			composer.setSize(ctx.size.current.width, ctx.size.current.height)
			composer.setPixelRatio(ctx.dpr.current)
			ctx.renderer.getDrawingBufferSize(drawing_buffer_size)
			dither_uniforms.u_resolution.value.copy(drawing_buffer_size)
			composer.render(delta)
		},
		{ stage: ctx.renderStage, autoInvalidate: false },
	)

	onDestroy(() => {
		ctx.autoRender.set(true)
		composer.dispose()
		bayer_texture.dispose()
	})
</script>
