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
	type IUniform,
} from 'three'
import { afterAll, describe, expect, it } from 'vitest'
import { DOT_BLEND, DOT_BLEND_FRAGMENT_SHADER, FULLSCREEN_VERTEX_SHADER } from './crt-dither'

// #420 moved the CRT dot blend out of the full-resolution upscale pass into the low-resolution
// stage, on the argument that a neighbour tap offset by one low-res texel resolves to that same
// texel under NearestFilter whichever fraction of it the fragment sits at — so both placements
// produce the same picture. That argument is the entire justification for the change being
// invisible, and no source-level assertion can check it: it depends on real sampler behaviour.
// These tests render both formulations through a WebGL context and compare the resulting bytes.
//
// The argument holds everywhere except on output pixels whose centre maps exactly onto a low-res
// texel boundary, where the legacy shader resolved its five taps independently and could land
// them on both sides of the seam. The last test pins that exception down; see its comment.

// The single-tap upscale #420 left behind. It stopped being a pass of its own in #421, which folded
// it into the merged stage-2 shader, so it is spelled out here: this test isolates the dot-blend
// equivalence, and running it through the whole composite pass would drag scanlines, the barrel
// warp and the grading into a comparison that is not about any of them.
const SINGLE_TAP_UPSCALE_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D u_lo_tex;

varying vec2 v_uv;

void main() {
	gl_FragColor = vec4(texture2D(u_lo_tex, v_uv).rgb, 1.0);
}
`

// The pre-#420 upscale shader, verbatim: the 5-tap blend at full resolution. This is the
// reference the current pipeline has to reproduce.
const LEGACY_UPSCALE_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D u_lo_tex;
uniform vec2 u_lo_resolution;
uniform float u_dot_blend;

varying vec2 v_uv;

void main() {
	vec2 texel = 1.0 / u_lo_resolution;
	vec3 center = texture2D(u_lo_tex, v_uv).rgb;
	vec3 neighbors = (
		texture2D(u_lo_tex, v_uv + vec2( texel.x, 0.0)).rgb +
		texture2D(u_lo_tex, v_uv + vec2(-texel.x, 0.0)).rgb +
		texture2D(u_lo_tex, v_uv + vec2(0.0,  texel.y)).rgb +
		texture2D(u_lo_tex, v_uv + vec2(0.0, -texel.y)).rgb
	) * 0.25;
	gl_FragColor = vec4(mix(center, neighbors, u_dot_blend), 1.0);
}
`

const RGBA_CHANNELS = 4
const QUAD_SIZE = 2
// Doubling the pixel index turns the half-texel pixel centre into integer arithmetic, so the
// boundary test below is exact rather than a float comparison.
const CENTER_DOUBLING = 2
// Deliberately staggered strides so adjacent texels differ on every channel: a flat or smoothly
// varying fixture would let a broken blend pass unnoticed.
const RED_STRIDE = 37
const GREEN_STRIDE = 91
const BLUE_STRIDE = 53
const BYTE_RANGE = 256
const ALPHA_OPAQUE = 255
// A frame that failed to render (all black) would make every equality below trivially true.
const MIN_DISTINCT_BYTES = 8
const NO_BLEND = 0
const FULL_BLEND = 1
const INTEGER_UPSCALE_FACTOR = 5

interface Size {
	width: number
	height: number
}

interface BlendRun {
	source: DataTexture
	lo: Size
	hi: Size
	blend: number
}

interface QuadRender {
	fragment_shader: string
	uniforms: Record<string, IUniform>
	target: WebGLRenderTarget
}

interface PixelDifference {
	count: number
	max: number
}

// An even low-res grid: with these hi sizes one output row maps exactly onto a texel boundary.
const EVEN_LO: Size = { width: 8, height: 6 }
// An odd low-res grid can never put an output pixel centre on a texel boundary, whatever the
// upscale factor — (2i+1)·lo is odd·odd, so it never reaches a multiple of 2·hi.
const ODD_LO: Size = { width: 7, height: 5 }
const INTEGER_SCALE: Size = {
	width: EVEN_LO.width * INTEGER_UPSCALE_FACTOR,
	height: EVEN_LO.height * INTEGER_UPSCALE_FACTOR,
}
const FRACTIONAL_SCALE: Size = { width: 37, height: 29 }

function create_lo_texture(size: Size): DataTexture {
	const data = new Uint8Array(size.width * size.height * RGBA_CHANNELS)

	for (let index = 0; index < size.width * size.height; index++) {
		const offset = index * RGBA_CHANNELS

		data[offset] = (index * RED_STRIDE) % BYTE_RANGE
		data[offset + 1] = (index * GREEN_STRIDE) % BYTE_RANGE
		data[offset + 2] = (index * BLUE_STRIDE) % BYTE_RANGE
		data[offset + 3] = ALPHA_OPAQUE
	}

	const texture = new DataTexture(data, size.width, size.height, RGBAFormat, UnsignedByteType)

	texture.minFilter = NearestFilter
	texture.magFilter = NearestFilter
	texture.wrapS = ClampToEdgeWrapping
	texture.wrapT = ClampToEdgeWrapping
	texture.needsUpdate = true

	return texture
}

function create_target(size: Size): WebGLRenderTarget {
	const target = new WebGLRenderTarget(size.width, size.height, {
		format: RGBAFormat,
		type: UnsignedByteType,
		depthBuffer: false,
		stencilBuffer: false,
	})

	target.texture.minFilter = NearestFilter
	target.texture.magFilter = NearestFilter
	target.texture.wrapS = ClampToEdgeWrapping
	target.texture.wrapT = ClampToEdgeWrapping

	return target
}

function render_quad(renderer: WebGLRenderer, options: QuadRender): Uint8Array {
	const material = new ShaderMaterial({
		uniforms: options.uniforms,
		vertexShader: FULLSCREEN_VERTEX_SHADER,
		fragmentShader: options.fragment_shader,
	})
	const geometry = new PlaneGeometry(QUAD_SIZE, QUAD_SIZE)
	const scene = new Scene()

	scene.add(new Mesh(geometry, material))
	renderer.setRenderTarget(options.target)
	renderer.render(scene, new OrthographicCamera(-1, 1, 1, -1, 0, 1))

	const { width, height } = options.target
	const pixels = new Uint8Array(width * height * RGBA_CHANNELS)

	renderer.readRenderTargetPixels(options.target, 0, 0, width, height, pixels)
	geometry.dispose()
	material.dispose()

	return pixels
}

// The two formulations differ only in which sampler carries the source image; everything else
// about the blend is identical, so the shared half lives here.
function blend_uniforms(run: BlendRun): Record<string, IUniform> {
	return {
		u_lo_resolution: { value: new Vector2(run.lo.width, run.lo.height) },
		u_dot_blend: { value: run.blend },
	}
}

// Pre-#420: one 5-tap blend per full-resolution output pixel.
function render_legacy(renderer: WebGLRenderer, run: BlendRun): Uint8Array {
	const target = create_target(run.hi)
	const pixels = render_quad(renderer, {
		fragment_shader: LEGACY_UPSCALE_FRAGMENT_SHADER,
		uniforms: { u_lo_tex: { value: run.source }, ...blend_uniforms(run) },
		target,
	})

	target.dispose()

	return pixels
}

// Post-#420: one 5-tap blend per low-resolution dot, then a single-tap upscale.
function render_current(renderer: WebGLRenderer, run: BlendRun): Uint8Array {
	const blended = create_target(run.lo)
	const target = create_target(run.hi)

	render_quad(renderer, {
		fragment_shader: DOT_BLEND_FRAGMENT_SHADER,
		uniforms: { tDiffuse: { value: run.source }, ...blend_uniforms(run) },
		target: blended,
	})
	const pixels = render_quad(renderer, {
		fragment_shader: SINGLE_TAP_UPSCALE_FRAGMENT_SHADER,
		uniforms: { u_lo_tex: { value: blended.texture } },
		target,
	})

	blended.dispose()
	target.dispose()

	return pixels
}

function compare_pixels(left: Uint8Array, right: Uint8Array): PixelDifference {
	let count = 0
	let max = 0

	for (const [index, value] of left.entries()) {
		const delta = Math.abs(value - (right[index] ?? 0))

		if (delta > 0) count += 1
		max = Math.max(max, delta)
	}

	return { count, max }
}

// Output indices whose pixel centre maps exactly onto a low-res texel boundary: centre
// (index + 0.5) / hi × lo is an integer.
function boundary_indices(hi: number, lo: number): Set<number> {
	const indices = new Set<number>()

	for (let index = 0; index < hi; index++) {
		if (((index * CENTER_DOUBLING + 1) * lo) % (hi * CENTER_DOUBLING) === 0) indices.add(index)
	}

	return indices
}

function count_distinct(pixels: Uint8Array): number {
	return new Set(pixels).size
}

describe('CRT dot blend — low-res vs full-res placement (#420)', () => {
	// Built on first use rather than in the describe body: a GPU-less runner without a WebGL
	// context would otherwise fail collection — taking the whole file down as an error instead
	// of a test failure — and would pay for a context even when these tests are filtered out.
	let renderer: WebGLRenderer | null = null
	const even_texture = create_lo_texture(EVEN_LO)
	const odd_texture = create_lo_texture(ODD_LO)

	function get_renderer(): WebGLRenderer {
		renderer ??= new WebGLRenderer({ antialias: false })

		return renderer
	}

	afterAll(() => {
		even_texture.dispose()
		odd_texture.dispose()
		renderer?.dispose()
	})

	it('renders a non-trivial image, so the equality assertions below mean something', () => {
		const pixels = render_legacy(get_renderer(), {
			source: even_texture,
			lo: EVEN_LO,
			hi: INTEGER_SCALE,
			blend: DOT_BLEND,
		})

		expect(count_distinct(pixels)).toBeGreaterThan(MIN_DISTINCT_BYTES)
	})

	it('the blend is observable at DOT_BLEND — a no-op blend would not prove equivalence', () => {
		const run = { source: even_texture, lo: EVEN_LO, hi: INTEGER_SCALE, blend: DOT_BLEND }
		const webgl = get_renderer()
		const blended = render_legacy(webgl, run)
		const without_blend = render_legacy(webgl, { ...run, blend: NO_BLEND })

		expect(compare_pixels(blended, without_blend).count).toBeGreaterThan(0)
	})

	it('produces byte-identical output at an integer upscale factor', () => {
		const run = { source: even_texture, lo: EVEN_LO, hi: INTEGER_SCALE, blend: DOT_BLEND }

		const webgl = get_renderer()

		expect(compare_pixels(render_legacy(webgl, run), render_current(webgl, run))).toEqual({
			count: 0,
			max: 0,
		})
	})

	it('produces byte-identical output at a fractional upscale factor', () => {
		// Real viewports never divide evenly into the 256px-short-edge low-res buffer, so this is
		// the case that actually ships. The odd low-res grid keeps every output pixel centre
		// strictly inside a texel.
		const run = { source: odd_texture, lo: ODD_LO, hi: FRACTIONAL_SCALE, blend: DOT_BLEND }

		const webgl = get_renderer()

		expect(compare_pixels(render_legacy(webgl, run), render_current(webgl, run))).toEqual({
			count: 0,
			max: 0,
		})
	})

	it('produces byte-identical output at a full box blur, where any drift would be largest', () => {
		const run = { source: odd_texture, lo: ODD_LO, hi: FRACTIONAL_SCALE, blend: FULL_BLEND }

		const webgl = get_renderer()

		expect(compare_pixels(render_legacy(webgl, run), render_current(webgl, run))).toEqual({
			count: 0,
			max: 0,
		})
	})

	it('differs from the legacy shader ONLY on pixels centred exactly on a texel boundary', () => {
		// The one case the equivalence argument does not cover. On such a pixel the legacy shader
		// resolved its centre tap and its four neighbour taps from coordinates that are all exactly
		// on a seam, so they could land on opposite sides of it and blend a neighbourhood that does
		// not exist — a hairline seam whose position depends on the viewport size. Blending at the
		// low-res stage samples texel centres instead, so the seam is gone. Any difference outside
		// these rows/columns would mean the move is not the equivalence it claims to be.
		const run = { source: even_texture, lo: EVEN_LO, hi: FRACTIONAL_SCALE, blend: FULL_BLEND }
		const webgl = get_renderer()
		const legacy = render_legacy(webgl, run)
		const current = render_current(webgl, run)
		const boundary_columns = boundary_indices(run.hi.width, run.lo.width)
		const boundary_rows = boundary_indices(run.hi.height, run.lo.height)
		const offenders: Array<string> = []

		for (const [index, value] of legacy.entries()) {
			if (value === current[index]) continue

			const pixel = Math.floor(index / RGBA_CHANNELS)
			const x = pixel % run.hi.width
			const y = Math.floor(pixel / run.hi.width)

			const is_on_boundary = boundary_columns.has(x) || boundary_rows.has(y)

			if (!is_on_boundary) offenders.push(`${String(x)},${String(y)}`)
		}

		// The fixture has to actually contain a boundary, or this proves nothing.
		expect(boundary_columns.size + boundary_rows.size).toBeGreaterThan(0)
		expect(offenders).toEqual([])
	})
})
