<script lang="ts">
	import { useTask, useThrelte } from '@threlte/core'
	import {
		BARREL_STRENGTH,
		CHANNEL_OFFSET_PIXELS,
		CRT_CONTRAST,
		CRT_SATURATION,
	} from '$lib/game-kit/crt-barrel'
	import { COMPOSITE_FRAGMENT_SHADER } from '$lib/game-kit/crt-composite'
	import {
		BAYER_SIZE,
		BLACK_FLOOR,
		COLOR_LEVELS,
		crt_dither,
		DITHER_FRAGMENT_SHADER,
		DOT_BLEND,
		DOT_BLEND_FRAGMENT_SHADER,
		DOTS_PER_SCANLINE,
		FULLSCREEN_VERTEX_SHADER,
		SCANLINE_BLEED,
		SCANLINE_BLEED_FULL_PERIOD,
		SCANLINE_DARK,
		SCANLINE_SHARPNESS,
	} from '$lib/game-kit/crt-dither'
	import {
		crt_resize,
		type CrtLoSize,
		type CrtSizeChange,
		type CrtSizeSignature,
	} from '$lib/game-kit/crt-resize'
	import { crt } from '$lib/game-kit/Crt.svelte'
	import { onDestroy } from 'svelte'
	import { NearestFilter, ShaderMaterial, Vector2, Vector3, type Texture } from 'three'
	import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
	import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
	import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js'
	import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
	import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'

	interface Props {
		lo_dpr: number
	}
	const { lo_dpr }: Props = $props()

	const context = useThrelte()

	// Take over the render loop so the scene is composited through our two-stage
	// CRT pipeline instead of Threlte's default direct-to-canvas render.
	context.autoRender.set(false)

	// ── Stage 1: low-resolution composer ─────────────────────────────────────────
	// Renders the 3D scene + OutputPass + Bayer dither at `lo_dpr` (e.g. 0.3×).
	// This produces the chunky "dot art" pixel grid at ~256px short-edge resolution.
	// NearestFilter keeps the dithered dots crisp when the upscale pass samples them.
	const bayer_texture = crt_dither.create_bayer_texture()
	const lo_composer = new EffectComposer(context.renderer)
	lo_composer.renderTarget1.texture.minFilter = NearestFilter
	lo_composer.renderTarget1.texture.magFilter = NearestFilter
	lo_composer.renderTarget2.texture.minFilter = NearestFilter
	lo_composer.renderTarget2.texture.magFilter = NearestFilter
	// renderToScreen=false so the lo_composer never touches the canvas directly;
	// its output lives in lo_composer.readBuffer for the hi-composer's upscale pass.
	lo_composer.renderToScreen = false

	const render_pass = new RenderPass(context.scene, context.camera.current)

	// See existing file comment on why we use ShaderMaterial + ShaderPass instead of
	// a plain {uniforms,...} object — keeps u_resolution references live across resizes.
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
		vertexShader: FULLSCREEN_VERTEX_SHADER,
		fragmentShader: DITHER_FRAGMENT_SHADER,
	})
	const dither_pass = new ShaderPass(dither_material)
	const output_pass = new OutputPass()

	// Dot blend: the phosphor bleed between adjacent dots. Lives here rather than in the
	// upscale pass because one neighbour tap is one low-res texel either way, so running it
	// at full resolution repeated the identical five taps once per output pixel (#420).
	const dot_blend_uniforms = {
		tDiffuse: { value: null },
		u_lo_resolution: { value: new Vector2(1, 1) },
		u_dot_blend: { value: DOT_BLEND },
	}
	const dot_blend_material = new ShaderMaterial({
		uniforms: dot_blend_uniforms,
		vertexShader: FULLSCREEN_VERTEX_SHADER,
		fragmentShader: DOT_BLEND_FRAGMENT_SHADER,
	})
	const dot_blend_pass = new ShaderPass(dot_blend_material)

	// Pass order: OutputPass before dither so quantization operates in sRGB display
	// space — same reason as the original single-composer setup. The dot blend comes
	// last so the bleed operates on the dithered 256-colour image.
	lo_composer.addPass(render_pass)
	lo_composer.addPass(output_pass)
	lo_composer.addPass(dither_pass)
	lo_composer.addPass(dot_blend_pass)

	// ── Stage 2: one full-resolution pass ────────────────────────────────────────
	// Upscale, scanlines and barrel used to be three ShaderPasses on a second EffectComposer, which
	// allocated two full-resolution HalfFloatType targets and ping-ponged the frame through them
	// (#421). They are one shader now, sampling the low-res texture directly and writing to the
	// default framebuffer, so stage 2 owns no intermediate surface at all.
	//
	// u_lo_tex is a custom uniform name rather than tDiffuse for the same reason the upscale pass
	// used one: nothing here is a ShaderPass, but keeping the name distinct documents that the source
	// is stage 1's output rather than a composer read buffer.
	const SCANLINE_PHASES_PER_CYCLE = 2
	const composite_uniforms = {
		u_lo_tex: { value: null as null | Texture },
		u_resolution: { value: new Vector2(1, 1) },
		u_strength: { value: BARREL_STRENGTH },
		u_aspect: { value: 1 },
		u_channel_offset: { value: CHANNEL_OFFSET_PIXELS },
		u_contrast: { value: CRT_CONTRAST },
		u_saturation: { value: CRT_SATURATION },
		u_scanline_period: { value: DOTS_PER_SCANLINE * SCANLINE_PHASES_PER_CYCLE },
		u_scanline_axis: { value: new Vector2(0, 1) },
		u_scanline_dark: { value: SCANLINE_DARK },
		u_scanline_sharpness: { value: SCANLINE_SHARPNESS },
		u_bleed: { value: SCANLINE_BLEED },
	}
	// depthTest/depthWrite off: a full-screen quad drawn straight to the default framebuffer would
	// otherwise be tested against whatever depth the canvas still holds. EffectComposer used to clear
	// for us.
	const composite_material = new ShaderMaterial({
		uniforms: composite_uniforms,
		vertexShader: FULLSCREEN_VERTEX_SHADER,
		fragmentShader: COMPOSITE_FRAGMENT_SHADER,
		depthTest: false,
		depthWrite: false,
	})
	const composite_quad = new FullScreenQuad(composite_material)

	$effect(() => {
		render_pass.camera = context.camera.current
	})

	const hi_drawing_buffer = new Vector2()
	const size_gate = crt_resize.create_size_gate()

	// Scale the scanline period so one cycle spans one virtual lo-res dot row.
	function apply_scanline_uniforms(lo_size: CrtLoSize): void {
		const is_portrait = hi_drawing_buffer.x < hi_drawing_buffer.y

		composite_uniforms.u_scanline_axis.value.set(is_portrait ? 1 : 0, is_portrait ? 0 : 1)

		// compute_lo_size clamps both dimensions to >= 1, so this cannot divide by zero.
		const hi_lo_ratio = is_portrait
			? hi_drawing_buffer.x / lo_size.width
			: hi_drawing_buffer.y / lo_size.height
		const period = Math.max(
			DOTS_PER_SCANLINE * SCANLINE_PHASES_PER_CYCLE,
			Math.round(DOTS_PER_SCANLINE * SCANLINE_PHASES_PER_CYCLE * hi_lo_ratio),
		)

		composite_uniforms.u_scanline_period.value = period
		composite_uniforms.u_bleed.value = Math.min(
			SCANLINE_BLEED,
			(SCANLINE_BLEED * period) / SCANLINE_BLEED_FULL_PERIOD,
		)
	}

	// Applied on the frames the gate reports a change, never per frame (#423). Stage 2 has no
	// composer to resize since #421 — it reads the drawing-buffer size straight into its uniforms —
	// so the only pixel ratio left to apply is stage 1's.
	function apply_sizes(signature: CrtSizeSignature, change: CrtSizeChange): void {
		if (change.is_lo_dpr_changed) lo_composer.setPixelRatio(signature.lo_dpr)
		lo_composer.setSize(signature.width, signature.height)

		const lo_size = crt_resize.compute_lo_size(signature.width, signature.height, signature.lo_dpr)

		dither_uniforms.u_resolution.value.set(lo_size.width, lo_size.height)
		dot_blend_uniforms.u_lo_resolution.value.set(lo_size.width, lo_size.height)

		apply_scanline_uniforms(lo_size)

		composite_uniforms.u_resolution.value.copy(hi_drawing_buffer)
		composite_uniforms.u_aspect.value =
			hi_drawing_buffer.y > 0 ? hi_drawing_buffer.x / hi_drawing_buffer.y : 1
	}

	useTask(
		(delta) => {
			if (!crt.is_crt_enabled) {
				// Renderer sizing belongs to Threlte: its resize-stage task calls renderer.setSize() only
				// when the element actually changed, and an $effect.pre applies the dpr. Repeating it here
				// re-assigned canvas.width / canvas.height every frame, which the HTML spec defines as
				// resetting the drawing buffer (#423).
				context.renderer.render(context.scene, context.camera.current)

				return
			}

			// Read every frame so the gate also opens for a renderer resize that never reached
			// context.size — two multiplications into an existing vector, not a pass traversal.
			context.renderer.getDrawingBufferSize(hi_drawing_buffer)

			const signature = {
				width: context.size.current.width,
				height: context.size.current.height,
				dpr: context.dpr.current,
				lo_dpr,
				buffer_width: hi_drawing_buffer.x,
				buffer_height: hi_drawing_buffer.y,
			}
			const change = size_gate.resolve_change(signature)

			if (change !== undefined) apply_sizes(signature, change)

			// Stage 1: render game + dither at low resolution.
			lo_composer.render(delta)

			// Inject lo-res dithered output into the composite pass.
			// lo_composer.readBuffer holds the last-written RT after render().
			composite_uniforms.u_lo_tex.value = lo_composer.readBuffer.texture

			// Stage 2: CRT effects at full canvas resolution, straight to the canvas. FullScreenQuad
			// renders wherever the renderer currently points, so the target is set explicitly — the
			// lo_composer restores it, but relying on that would couple the two stages.
			context.renderer.setRenderTarget(null)
			composite_quad.render(context.renderer)
		},
		{ stage: context.renderStage, autoInvalidate: false },
	)

	onDestroy(() => {
		context.autoRender.set(true)
		// EffectComposer.dispose() frees its two render targets and its internal copy pass only, so
		// the compiled program behind each pass would otherwise outlive this component when the
		// Canvas is torn down. The materials are what hold those programs, so disposing them is the
		// whole fix; the passes wrap a FullScreenQuad over a geometry three keeps as a module-level
		// singleton, which is shared with every other live pass and not ours to release.

		// composite_quad is deliberately NOT disposed: FullScreenQuad.dispose() disposes _geometry,
		// which three declares once at module scope and hands to every FullScreenQuad — including the
		// one inside each ShaderPass above. Disposing it here would pull the geometry out from under
		// them. Its material is ours, so it goes in the loop with the rest.
		for (const material of [
			output_pass.material,
			dither_material,
			dot_blend_material,
			composite_material,
		]) {
			material.dispose()
		}

		lo_composer.dispose()
		bayer_texture.dispose()
	})
</script>
