import type { DomEvent } from '@threlte/extras'
import type { Camera, Vector2 } from 'three'

const NDC_SCALE = 2

interface CameraReference {
	current: Camera
}

interface PointerReference {
	current: Vector2
	update: (function_: (p: Vector2) => Vector2) => void
}

interface RaycasterReference {
	setFromCamera: (pointer: Vector2, camera: Camera) => void
}

interface ComputeContext {
	pointer: PointerReference
	raycaster: RaycasterReference
}

function is_valid_target(target: EventTarget | null): target is HTMLElement {
	return target instanceof HTMLElement && target.clientWidth > 0 && target.clientHeight > 0
}

function compute_target_offset(event: DomEvent, target: HTMLElement): { x: number; y: number } {
	const rect = target.getBoundingClientRect()

	return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

export function make_pointer_compute(
	camera: CameraReference,
): (event: DomEvent, context: ComputeContext) => void {
	return function compute_pointer(event: DomEvent, context: ComputeContext): void {
		if (!is_valid_target(event.target)) return
		const { clientWidth: w, clientHeight: h } = event.target
		const { x, y } = compute_target_offset(event, event.target)

		context.pointer.update((p) => {
			p.set((x / w) * NDC_SCALE - 1, -(y / h) * NDC_SCALE + 1)

			return p
		})
		context.raycaster.setFromCamera(context.pointer.current, camera.current)
	}
}
