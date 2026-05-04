import { override_event_offset } from '$lib/game/override-event-offset'

type DispatchCtx = { dom: HTMLElement; offset_x: number; offset_y: number }

function get_dispatch_ctx(x: number, y: number): DispatchCtx | null {
	const dom = document.querySelector('canvas')?.parentElement
	if (!dom) return null
	const { left, top } = dom.getBoundingClientRect()
	return { dom, offset_x: x - left, offset_y: y - top }
}

function build_event_opts(
	pointer_id: number,
	is_primary: boolean,
	x: number,
	y: number,
): PointerEventInit {
	return {
		button: 0,
		buttons: 0,
		isPrimary: is_primary,
		pointerId: pointer_id,
		clientX: x,
		clientY: y,
		bubbles: true,
		cancelable: true,
	}
}

function dispatch_pointer_down(
	pointer_id: number,
	is_primary: boolean,
	x: number,
	y: number,
): void {
	const ctx = get_dispatch_ctx(x, y)
	if (!ctx) return
	const opts = build_event_opts(pointer_id, is_primary, x, y)
	opts.buttons = 1
	const move_ev = new PointerEvent('pointermove', opts)
	const down_ev = new PointerEvent('pointerdown', opts)
	override_event_offset(move_ev, ctx.offset_x, ctx.offset_y)
	override_event_offset(down_ev, ctx.offset_x, ctx.offset_y)
	ctx.dom.dispatchEvent(move_ev)
	ctx.dom.dispatchEvent(down_ev)
}

function dispatch_pointer_up(
	pointer_id: number,
	is_primary: boolean,
	x: number,
	y: number,
	is_tap: boolean = true,
): void {
	const ctx = get_dispatch_ctx(x, y)
	if (!ctx) return
	const opts = build_event_opts(pointer_id, is_primary, x, y)
	const up_ev = new PointerEvent('pointerup', opts)
	const leave_ev = new PointerEvent('pointerleave', opts)
	override_event_offset(up_ev, ctx.offset_x, ctx.offset_y)
	override_event_offset(leave_ev, ctx.offset_x, ctx.offset_y)
	ctx.dom.dispatchEvent(up_ev)
	if (is_tap) {
		const click_ev = new MouseEvent('click', opts)
		override_event_offset(click_ev, ctx.offset_x, ctx.offset_y)
		ctx.dom.dispatchEvent(click_ev)
	}
	ctx.dom.dispatchEvent(leave_ev)
}

function dispatch_pointer_cancel(
	pointer_id: number,
	is_primary: boolean,
	x: number,
	y: number,
): void {
	const ctx = get_dispatch_ctx(x, y)
	if (!ctx) return
	const opts = build_event_opts(pointer_id, is_primary, x, y)
	const up_ev = new PointerEvent('pointerup', opts)
	const leave_ev = new PointerEvent('pointerleave', opts)
	override_event_offset(up_ev, ctx.offset_x, ctx.offset_y)
	override_event_offset(leave_ev, ctx.offset_x, ctx.offset_y)
	ctx.dom.dispatchEvent(up_ev)
	ctx.dom.dispatchEvent(leave_ev)
}

const joystick_dispatch = { dispatch_pointer_down, dispatch_pointer_up, dispatch_pointer_cancel }
export { joystick_dispatch }
