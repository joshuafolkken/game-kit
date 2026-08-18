// Sizing the CRT pipeline derives entirely from the viewport, the device pixel ratio and the
// low-resolution scale — none of which change per frame. The render task used to re-apply it on
// every frame regardless (#423); this gate is what lets the task apply it only on the frame
// something actually moved, while staying inside the task rather than in an $effect (effects
// flush in a microtask, one frame behind the resize stage that sizes the renderer, which would
// leave the composer targets mis-scaled for a frame during a resize drag).

export interface CrtSizeSignature {
	width: number
	height: number
	dpr: number
	lo_dpr: number
	buffer_width: number
	buffer_height: number
}

// EffectComposer.setPixelRatio() walks every pass through an internal setSize(), so the two pixel
// ratios are reported separately: a plain viewport resize should not pay for them.
export interface CrtSizeChange {
	is_dpr_changed: boolean
	is_lo_dpr_changed: boolean
}

export interface CrtSizeGate {
	resolve_change: (next: CrtSizeSignature) => CrtSizeChange | undefined
}

export interface CrtLoSize {
	width: number
	height: number
}

const MIN_LO_DIMENSION = 1

// Stands in for "nothing applied yet" so the gate never carries an undefined branch: no real
// viewport, dpr or scale is negative, so the first call always reports a change on every field.
const UNSET_SIGNATURE: CrtSizeSignature = {
	width: -1,
	height: -1,
	dpr: -1,
	lo_dpr: -1,
	buffer_width: -1,
	buffer_height: -1,
}

// The drawing buffer is part of the signature, not just the CSS size: a renderer resize that never
// went through the viewport signal — Threlte's own resize stage, a dpr change applied by its
// effect, XR — would otherwise leave the scanline period and aspect derived from the previous
// buffer, and the gate would never re-open to correct them.
const SIGNATURE_KEYS = [
	'width',
	'height',
	'dpr',
	'lo_dpr',
	'buffer_width',
	'buffer_height',
] as const

function is_same_signature(applied: CrtSizeSignature, next: CrtSizeSignature): boolean {
	return SIGNATURE_KEYS.every((key) => applied[key] === next[key])
}

function create_size_gate(): CrtSizeGate {
	let applied: CrtSizeSignature = UNSET_SIGNATURE

	// `undefined` means nothing moved — the caller keeps the sizes it already applied.
	function resolve_change(next: CrtSizeSignature): CrtSizeChange | undefined {
		if (is_same_signature(applied, next)) return undefined

		const change = {
			is_dpr_changed: applied.dpr !== next.dpr,
			is_lo_dpr_changed: applied.lo_dpr !== next.lo_dpr,
		}

		applied = { ...next }

		return change
	}

	return { resolve_change }
}

// Clamp both dimensions to at least 1 so neither is 0 on the first frame or on a very small
// viewport: 0 would divide by zero in the portrait hi/lo ratio and put (0,0) into u_lo_resolution.
function compute_lo_size(width: number, height: number, lo_dpr: number): CrtLoSize {
	return {
		width: Math.max(MIN_LO_DIMENSION, Math.floor(width * lo_dpr)),
		height: Math.max(MIN_LO_DIMENSION, Math.floor(height * lo_dpr)),
	}
}

const crt_resize = { create_size_gate, compute_lo_size }

export { crt_resize }
