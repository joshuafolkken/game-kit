import {
	ClampToEdgeWrapping,
	DataTexture,
	Mesh,
	NearestFilter,
	OrthographicCamera,
	PlaneGeometry,
	RGBAFormat,
	Scene,
	ShaderMaterial,
	UnsignedByteType,
	Vector2,
	WebGLRenderer,
	WebGLRenderTarget,
} from 'three'
import { afterAll, describe, expect, it } from 'vitest'
import {
	BARREL_STRENGTH,
	CHANNEL_OFFSET_PIXELS,
	CRT_CONTRAST,
	CRT_SATURATION,
	type BarrelRgb,
	type BarrelUv,
} from './crt-barrel'
import { COMPOSITE_FRAGMENT_SHADER, crt_composite, type CrtCompositeConfig } from './crt-composite'
import { FULLSCREEN_VERTEX_SHADER, SCANLINE_BLEED, SCANLINE_SHARPNESS } from './crt-dither'

// #421 merged three stage-2 passes into one shader assembled from GLSL chunks. Two things can go
// wrong that no source-level assertion reaches: the merged program can fail to compile or link
// (a sampler passed as a parameter, a uniform one chunk reads but another declares), and the
// composition order can drift from the JS mirror the unit tests reason about. This renders the real
// shader through a WebGL context and compares every output byte against the mirror.

const RGBA_CHANNELS = 4
const QUAD_SIZE = 2
const BYTE_MAX = 255
const BYTE_RANGE = 256
const ALPHA_OPAQUE = 255
const HALF_TEXEL = 0.5
// Staggered strides so adjacent texels differ on every channel: a flat fixture would let a broken
// composition pass unnoticed.
const RED_STRIDE = 37
const GREEN_STRIDE = 91
const BLUE_STRIDE = 53
const LO = { width: 8, height: 6 }
const HI = { width: 40, height: 30 }
const SCANLINE_PERIOD = 4
// Float precision in the shader against double precision in the mirror, both quantized to a byte.
const BYTE_TOLERANCE = 2
// A frame that never rendered would be all zeros, making every comparison trivially true.
const MIN_DISTINCT_BYTES = 8

const CONFIG: CrtCompositeConfig = {
	strength: BARREL_STRENGTH,
	aspect: HI.width / HI.height,
	channel_offset: CHANNEL_OFFSET_PIXELS,
	contrast: CRT_CONTRAST,
	saturation: CRT_SATURATION,
	width: HI.width,
	height: HI.height,
	scanline: {
		period: SCANLINE_PERIOD,
		axis: { x: 0, y: 1 },
		dark: 0,
		sharpness: SCANLINE_SHARPNESS,
		bleed: SCANLINE_BLEED,
	},
}

const lo_bytes = new Uint8Array(LO.width * LO.height * RGBA_CHANNELS)

for (let index = 0; index < LO.width * LO.height; index++) {
	const offset = index * RGBA_CHANNELS

	lo_bytes[offset] = (index * RED_STRIDE) % BYTE_RANGE
	lo_bytes[offset + 1] = (index * GREEN_STRIDE) % BYTE_RANGE
	lo_bytes[offset + 2] = (index * BLUE_STRIDE) % BYTE_RANGE
	lo_bytes[offset + 3] = ALPHA_OPAQUE
}

function clamp_texel(value: number, length: number): number {
	return Math.min(length - 1, Math.max(0, value))
}

// NearestFilter + ClampToEdgeWrapping, in JS: the sampler the shader sees.
function sample_lo(uv: BarrelUv): BarrelRgb {
	const x = clamp_texel(Math.floor(uv.x * LO.width), LO.width)
	const y = clamp_texel(Math.floor(uv.y * LO.height), LO.height)
	const offset = (y * LO.width + x) * RGBA_CHANNELS

	return {
		r: (lo_bytes[offset] ?? 0) / BYTE_MAX,
		g: (lo_bytes[offset + 1] ?? 0) / BYTE_MAX,
		b: (lo_bytes[offset + 2] ?? 0) / BYTE_MAX,
	}
}

function to_byte(value: number): number {
	return Math.round(Math.min(1, Math.max(0, value)) * BYTE_MAX)
}

const renderer = new WebGLRenderer({ antialias: false })

afterAll(() => {
	renderer.dispose()
	renderer.forceContextLoss()
})

function render_composite(): Uint8Array {
	const texture = new DataTexture(lo_bytes, LO.width, LO.height, RGBAFormat, UnsignedByteType)

	texture.minFilter = NearestFilter
	texture.magFilter = NearestFilter
	texture.wrapS = ClampToEdgeWrapping
	texture.wrapT = ClampToEdgeWrapping
	texture.needsUpdate = true

	const material = new ShaderMaterial({
		uniforms: {
			u_lo_tex: { value: texture },
			u_resolution: { value: new Vector2(HI.width, HI.height) },
			u_strength: { value: CONFIG.strength },
			u_aspect: { value: CONFIG.aspect },
			u_channel_offset: { value: CONFIG.channel_offset },
			u_contrast: { value: CONFIG.contrast },
			u_saturation: { value: CONFIG.saturation },
			u_scanline_period: { value: CONFIG.scanline.period },
			u_scanline_axis: { value: new Vector2(CONFIG.scanline.axis.x, CONFIG.scanline.axis.y) },
			u_scanline_dark: { value: CONFIG.scanline.dark },
			u_scanline_sharpness: { value: CONFIG.scanline.sharpness },
			u_bleed: { value: CONFIG.scanline.bleed },
		},
		vertexShader: FULLSCREEN_VERTEX_SHADER,
		fragmentShader: COMPOSITE_FRAGMENT_SHADER,
	})
	const target = new WebGLRenderTarget(HI.width, HI.height, {
		format: RGBAFormat,
		type: UnsignedByteType,
		depthBuffer: false,
		stencilBuffer: false,
	})
	const geometry = new PlaneGeometry(QUAD_SIZE, QUAD_SIZE)
	const scene = new Scene()

	scene.add(new Mesh(geometry, material))
	renderer.setRenderTarget(target)
	renderer.render(scene, new OrthographicCamera(-1, 1, 1, -1, 0, 1))

	const pixels = new Uint8Array(HI.width * HI.height * RGBA_CHANNELS)

	renderer.readRenderTargetPixels(target, 0, 0, HI.width, HI.height, pixels)
	geometry.dispose()
	material.dispose()
	target.dispose()
	texture.dispose()

	return pixels
}

describe('merged CRT composite shader against its JS mirror', () => {
	const pixels = render_composite()

	it('compiles, links and renders a non-uniform frame', () => {
		expect(new Set(pixels).size).toBeGreaterThanOrEqual(MIN_DISTINCT_BYTES)
	})

	// The mirror is the reference every other unit test in crt-composite.test.ts reasons about, so
	// pinning the real program to it makes those tests statements about the shipped shader.
	function describe_mismatch(index: number): string {
		const x = index % HI.width
		const y = Math.floor(index / HI.width)
		const uv = { x: (x + HALF_TEXEL) / HI.width, y: (y + HALF_TEXEL) / HI.height }
		const expected = crt_composite.compose_crt_pixel({ sample: sample_lo, uv, config: CONFIG })
		const offset = index * RGBA_CHANNELS
		const deltas = [
			Math.abs((pixels[offset] ?? 0) - to_byte(expected.r)),
			Math.abs((pixels[offset + 1] ?? 0) - to_byte(expected.g)),
			Math.abs((pixels[offset + 2] ?? 0) - to_byte(expected.b)),
		]

		return Math.max(...deltas) > BYTE_TOLERANCE
			? `(${String(x)},${String(y)}) delta ${deltas.map(String).join(', ')}`
			: ''
	}

	it('matches compose_crt_pixel on every output pixel', () => {
		const mismatches = Array.from({ length: HI.width * HI.height }, (_, index) =>
			describe_mismatch(index),
		).filter(Boolean)

		expect(mismatches).toEqual([])
	})
})
