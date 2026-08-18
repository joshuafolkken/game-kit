<script lang="ts">
	import { useTask, useThrelte } from '@threlte/core'
	import {
		BARREL_FRAGMENT_SHADER,
		BARREL_STRENGTH,
		BARREL_VERTEX_SHADER,
		CHANNEL_OFFSET_PIXELS,
		CRT_CONTRAST,
		CRT_SATURATION,
	} from '$lib/game-kit/crt-barrel'
	import {
		BAYER_SIZE,
		BLACK_FLOOR,
		COLOR_LEVELS,
		crt_dither,
		DITHER_FRAGMENT_SHADER,
		DITHER_VERTEX_SHADER,
		DOT_BLEND,
		DOTS_PER_SCANLINE,
		SCANLINE_BLEED,
		SCANLINE_BLEED_FULL_PERIOD,
		SCANLINE_DARK,
		SCANLINE_FRAGMENT_SHADER,
		SCANLINE_SHARPNESS,
		UPSCALE_FRAGMENT_SHADER,
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
		vertexShader: DITHER_VERTEX_SHADER,
		fragmentShader: DITHER_FRAGMENT_SHADER,
	})
	const dither_pass = new ShaderPass(dither_material)
	const output_pass = new OutputPass()

	// Pass order: OutputPass before dither so quantization operates in sRGB display
	// space — same reason as the original single-composer setup.
	lo_composer.addPass(render_pass)
	lo_composer.addPass(output_pass)
	lo_composer.addPass(dither_pass)

	// ── Stage 2: high-resolution composer ────────────────────────────────────────
	// Upscales the lo-res dithered image, then applies scanlines and barrel at the
	// canvas's native CSS resolution so both effects are smooth curves, not pixel
	// blocks. Scanlines run BEFORE barrel so they warp with the screen curvature.

	// Upscale pass: reads from lo_composer.readBuffer via u_lo_tex. We use a custom
	// uniform name instead of tDiffuse so ShaderPass.render() does NOT override it
	// with hi_composer's internal readBuffer (which is empty at this stage).
	const upscale_uniforms = {
		u_lo_tex: { value: null as null | Texture },
		u_lo_resolution: { value: new Vector2(1, 1) },
		u_dot_blend: { value: DOT_BLEND },
	}
	const upscale_material = new ShaderMaterial({
		uniforms: upscale_uniforms,
		vertexShader: DITHER_VERTEX_SHADER,
		fragmentShader: UPSCALE_FRAGMENT_SHADER,
	})
	const upscale_pass = new ShaderPass(upscale_material)

	// One scanline cycle = DOTS_PER_SCANLINE × 2 phases (dark + light). The period
	// in hi-res pixels is recomputed whenever the size changes, from the hi/lo resolution ratio,
	// so the line density always matches one dark/light pair per virtual low-res dot row.
	const SCANLINE_PHASES_PER_CYCLE = 2
	const scanline_uniforms = {
		tDiffuse: { value: null },
		u_resolution: { value: new Vector2(1, 1) },
		u_scanline_period: { value: DOTS_PER_SCANLINE * SCANLINE_PHASES_PER_CYCLE },
		u_scanline_axis: { value: new Vector2(0, 1) },
		u_scanline_dark: { value: SCANLINE_DARK },
		u_scanline_sharpness: { value: SCANLINE_SHARPNESS },
		u_bleed: { value: SCANLINE_BLEED },
	}
	const scanline_material = new ShaderMaterial({
		uniforms: scanline_uniforms,
		vertexShader: DITHER_VERTEX_SHADER,
		fragmentShader: SCANLINE_FRAGMENT_SHADER,
	})
	const scanline_pass = new ShaderPass(scanline_material)

	// Chromatic aberration and grading live here since game-kit#419 — the CSS filter chain they
	// replace cost ~6 ms per frame on a Pixel 6 Pro. u_resolution supplies the texel width the
	// channel offset is expressed in.
	const barrel_uniforms = {
		tDiffuse: { value: null },
		u_strength: { value: BARREL_STRENGTH },
		u_aspect: { value: 1 },
		u_channel_offset: { value: CHANNEL_OFFSET_PIXELS },
		u_contrast: { value: CRT_CONTRAST },
		u_saturation: { value: CRT_SATURATION },
		u_resolution: { value: new Vector2(1, 1) },
	}
	const barrel_material = new ShaderMaterial({
		uniforms: barrel_uniforms,
		vertexShader: BARREL_VERTEX_SHADER,
		fragmentShader: BARREL_FRAGMENT_SHADER,
	})
	const barrel_pass = new ShaderPass(barrel_material)

	const hi_composer = new EffectComposer(context.renderer)
	hi_composer.addPass(upscale_pass)
	hi_composer.addPass(scanline_pass)
	hi_composer.addPass(barrel_pass)

	$effect(() => {
		render_pass.camera = context.camera.current
	})

	const hi_drawing_buffer = new Vector2()
	const size_gate = crt_resize.create_size_gate()

	// Scale the scanline period so one cycle spans one virtual lo-res dot row.
	function apply_scanline_uniforms(lo_size: CrtLoSize): void {
		scanline_uniforms.u_resolution.value.copy(hi_drawing_buffer)

		const is_portrait = hi_drawing_buffer.x < hi_drawing_buffer.y

		scanline_uniforms.u_scanline_axis.value.set(is_portrait ? 1 : 0, is_portrait ? 0 : 1)

		// compute_lo_size clamps both dimensions to >= 1, so this cannot divide by zero.
		const hi_lo_ratio = is_portrait
			? hi_drawing_buffer.x / lo_size.width
			: hi_drawing_buffer.y / lo_size.height
		const period = Math.max(
			DOTS_PER_SCANLINE * SCANLINE_PHASES_PER_CYCLE,
			Math.round(DOTS_PER_SCANLINE * SCANLINE_PHASES_PER_CYCLE * hi_lo_ratio),
		)

		scanline_uniforms.u_scanline_period.value = period
		scanline_uniforms.u_bleed.value = Math.min(
			SCANLINE_BLEED,
			(SCANLINE_BLEED * period) / SCANLINE_BLEED_FULL_PERIOD,
		)
	}

	// Applied on the frames the gate reports a change, never per frame (#423). The pixel ratios are
	// set only when they actually moved: EffectComposer.setPixelRatio() re-runs setSize() over every
	// pass, so pairing the two unconditionally walks the chain twice on a plain resize.
	function apply_sizes(signature: CrtSizeSignature, change: CrtSizeChange): void {
		if (change.is_lo_dpr_changed) lo_composer.setPixelRatio(signature.lo_dpr)
		lo_composer.setSize(signature.width, signature.height)

		const lo_size = crt_resize.compute_lo_size(signature.width, signature.height, signature.lo_dpr)

		dither_uniforms.u_resolution.value.set(lo_size.width, lo_size.height)
		upscale_uniforms.u_lo_resolution.value.set(lo_size.width, lo_size.height)

		if (change.is_dpr_changed) hi_composer.setPixelRatio(signature.dpr)
		hi_composer.setSize(signature.width, signature.height)

		apply_scanline_uniforms(lo_size)

		barrel_uniforms.u_resolution.value.copy(hi_drawing_buffer)
		barrel_uniforms.u_aspect.value =
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

			// Inject lo-res dithered output into the upscale pass.
			// lo_composer.readBuffer holds the last-written RT after render().
			upscale_uniforms.u_lo_tex.value = lo_composer.readBuffer.texture

			// Stage 2: CRT effects at full canvas resolution.
			hi_composer.render(delta)
		},
		{ stage: context.renderStage, autoInvalidate: false },
	)

	onDestroy(() => {
		context.autoRender.set(true)
		lo_composer.dispose()
		hi_composer.dispose()
		bayer_texture.dispose()
	})
</script>
