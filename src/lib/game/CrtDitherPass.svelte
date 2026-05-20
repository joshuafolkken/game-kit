<script lang="ts">
	import { useTask, useThrelte } from '@threlte/core'
	import {
		BARREL_FRAGMENT_SHADER,
		BARREL_STRENGTH,
		BARREL_VERTEX_SHADER,
	} from '$lib/game/crt-barrel'
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
	} from '$lib/game/crt-dither'
	import { crt } from '$lib/game/crt.svelte'
	import { onDestroy } from 'svelte'
	import { NearestFilter, ShaderMaterial, Texture, Vector2, Vector3 } from 'three'
	import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
	import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
	import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
	import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'

	interface Props {
		lo_dpr: number
	}
	let { lo_dpr }: Props = $props()

	const ctx = useThrelte()

	// Take over the render loop so the scene is composited through our two-stage
	// CRT pipeline instead of Threlte's default direct-to-canvas render.
	ctx.autoRender.set(false)

	// ── Stage 1: low-resolution composer ─────────────────────────────────────────
	// Renders the 3D scene + OutputPass + Bayer dither at `lo_dpr` (e.g. 0.3×).
	// This produces the chunky "dot art" pixel grid at ~256px short-edge resolution.
	// NearestFilter keeps the dithered dots crisp when the upscale pass samples them.
	const bayer_texture = crt_dither.create_bayer_texture()
	const lo_composer = new EffectComposer(ctx.renderer)
	lo_composer.renderTarget1.texture.minFilter = NearestFilter
	lo_composer.renderTarget1.texture.magFilter = NearestFilter
	lo_composer.renderTarget2.texture.minFilter = NearestFilter
	lo_composer.renderTarget2.texture.magFilter = NearestFilter
	// renderToScreen=false so the lo_composer never touches the canvas directly;
	// its output lives in lo_composer.readBuffer for the hi-composer's upscale pass.
	lo_composer.renderToScreen = false

	const render_pass = new RenderPass(ctx.scene, ctx.camera.current)

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
	// in hi-res pixels is computed each frame from the hi/lo resolution ratio so the
	// line density always matches one dark/light pair per virtual low-res dot row.
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

	const barrel_uniforms = {
		tDiffuse: { value: null },
		u_strength: { value: BARREL_STRENGTH },
		u_aspect: { value: 1 },
	}
	const barrel_material = new ShaderMaterial({
		uniforms: barrel_uniforms,
		vertexShader: BARREL_VERTEX_SHADER,
		fragmentShader: BARREL_FRAGMENT_SHADER,
	})
	const barrel_pass = new ShaderPass(barrel_material)

	const hi_composer = new EffectComposer(ctx.renderer)
	hi_composer.addPass(upscale_pass)
	hi_composer.addPass(scanline_pass)
	hi_composer.addPass(barrel_pass)

	$effect(() => {
		render_pass.camera = ctx.camera.current
	})

	const hi_drawing_buf = new Vector2()
	useTask(
		(delta) => {
			if (!crt.is_crt_enabled) {
				ctx.renderer.setPixelRatio(ctx.dpr.current)
				ctx.renderer.setSize(ctx.size.current.width, ctx.size.current.height)
				ctx.renderer.render(ctx.scene, ctx.camera.current)
				return
			}
			// Stage 1: render game + dither at low resolution.
			lo_composer.setSize(ctx.size.current.width, ctx.size.current.height)
			lo_composer.setPixelRatio(lo_dpr)
			// Clamp to at least 1 so neither dimension is 0 on the first frame
			// or on very small viewports — prevents divide-by-zero in the portrait
			// hi_lo_ratio and guards against (0,0) reaching u_lo_resolution in the shader.
			const lo_w = Math.max(1, Math.floor(ctx.size.current.width * lo_dpr))
			const lo_h = Math.max(1, Math.floor(ctx.size.current.height * lo_dpr))
			dither_uniforms.u_resolution.value.set(lo_w, lo_h)
			upscale_uniforms.u_lo_resolution.value.set(lo_w, lo_h)
			lo_composer.render(delta)

			// Inject lo-res dithered output into the upscale pass.
			// lo_composer.readBuffer holds the last-written RT after render().
			upscale_uniforms.u_lo_tex.value = lo_composer.readBuffer.texture

			// Stage 2: CRT effects at full canvas resolution.
			hi_composer.setSize(ctx.size.current.width, ctx.size.current.height)
			hi_composer.setPixelRatio(ctx.dpr.current)
			ctx.renderer.getDrawingBufferSize(hi_drawing_buf)
			scanline_uniforms.u_resolution.value.copy(hi_drawing_buf)
			// Scale scanline period so one cycle spans one virtual lo-res dot row.
			const is_portrait = hi_drawing_buf.x < hi_drawing_buf.y
			scanline_uniforms.u_scanline_axis.value.set(is_portrait ? 1 : 0, is_portrait ? 0 : 1)
			if (lo_h > 0) {
				const hi_lo_ratio = is_portrait ? hi_drawing_buf.x / lo_w : hi_drawing_buf.y / lo_h
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
			barrel_uniforms.u_aspect.value =
				hi_drawing_buf.y > 0 ? hi_drawing_buf.x / hi_drawing_buf.y : 1
			hi_composer.render(delta)
		},
		{ stage: ctx.renderStage, autoInvalidate: false },
	)

	onDestroy(() => {
		ctx.autoRender.set(true)
		lo_composer.dispose()
		hi_composer.dispose()
		bayer_texture.dispose()
	})
</script>
