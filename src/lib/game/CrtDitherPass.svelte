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
	import { Vector2, Vector3 } from 'three'
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
	const render_pass = new RenderPass(ctx.scene, ctx.camera.current)
	// Keep a typed reference so svelte-check tolerates dot-access on uniform names —
	// ShaderPass.uniforms exposes an index signature that forbids `.u_foo` access.
	const dither_uniforms = {
		tDiffuse: { value: null },
		u_bayer: { value: bayer_texture },
		u_resolution: { value: new Vector2(1, 1) },
		u_color_levels: { value: new Vector3(COLOR_LEVELS.r, COLOR_LEVELS.g, COLOR_LEVELS.b) },
		u_black_floor: { value: BLACK_FLOOR },
		u_bayer_size: { value: BAYER_SIZE },
	}
	const dither_pass = new ShaderPass({
		uniforms: dither_uniforms,
		vertexShader: DITHER_VERTEX_SHADER,
		fragmentShader: DITHER_FRAGMENT_SHADER,
	})
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
		const { width, height } = ctx.size.current
		const dpr = ctx.dpr.current
		composer.setSize(width, height)
		composer.setPixelRatio(dpr)
		dither_uniforms.u_resolution.value.set(width * dpr, height * dpr)
	})

	$effect(() => {
		render_pass.camera = ctx.camera.current
	})

	useTask(
		(delta) => {
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
