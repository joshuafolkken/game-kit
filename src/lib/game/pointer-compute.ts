import type { DomEvent } from '@threlte/extras';
import type { Camera, Vector2 } from 'three';

const NDC_SCALE = 2;

type CameraRef = { current: Camera };
type PointerRef = {
	current: Vector2;
	update: (fn: (p: Vector2) => Vector2) => void;
};
type RaycasterRef = { setFromCamera: (pointer: Vector2, camera: Camera) => void };
type ComputeCtx = { pointer: PointerRef; raycaster: RaycasterRef };

function is_valid_target(target: EventTarget | null): target is HTMLElement {
	return target instanceof HTMLElement && target.clientWidth > 0 && target.clientHeight > 0;
}

function compute_target_offset(event: DomEvent, target: HTMLElement): { x: number; y: number } {
	const rect = target.getBoundingClientRect();
	return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

export function make_pointer_compute(
	camera: CameraRef
): (event: DomEvent, ctx: ComputeCtx) => void {
	return function compute_pointer(event: DomEvent, ctx: ComputeCtx): void {
		if (!is_valid_target(event.target)) return;
		const { clientWidth: w, clientHeight: h } = event.target;
		const { x, y } = compute_target_offset(event, event.target);
		ctx.pointer.update((p) => {
			p.set((x / w) * NDC_SCALE - 1, -(y / h) * NDC_SCALE + 1);
			return p;
		});
		ctx.raycaster.setFromCamera(ctx.pointer.current, camera.current);
	};
}
