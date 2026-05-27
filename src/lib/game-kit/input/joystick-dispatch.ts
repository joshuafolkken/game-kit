import { override_event_offset } from '$lib/game-kit/input/override-event-offset'

interface DispatchContext {
	dom: HTMLElement
	offset_x: number
	offset_y: number
}

function get_dispatch_context(x: number, y: number): DispatchContext | null {
	const dom = document.querySelector('canvas')?.parentElement
	if (!dom) return null
	const { left, top } = dom.getBoundingClientRect()

	return { dom, offset_x: x - left, offset_y: y - top }
}

function build_event_options(
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
	const context = get_dispatch_context(x, y)
	if (!context) return
	const options = build_event_options(pointer_id, is_primary, x, y)

	options.buttons = 1
	const move_event = new PointerEvent('pointermove', options)
	const down_event = new PointerEvent('pointerdown', options)

	override_event_offset(move_event, context.offset_x, context.offset_y)
	override_event_offset(down_event, context.offset_x, context.offset_y)
	context.dom.dispatchEvent(move_event)
	context.dom.dispatchEvent(down_event)
}

// eslint-disable-next-line max-params -- coordinate-rich pointer dispatch; object-arg shape adds noise at call sites
function dispatch_pointer_up(
	pointer_id: number,
	is_primary: boolean,
	x: number,
	y: number,
	is_tap = true,
): void {
	const context = get_dispatch_context(x, y)
	if (!context) return
	const options = build_event_options(pointer_id, is_primary, x, y)
	const up_event = new PointerEvent('pointerup', options)
	const leave_event = new PointerEvent('pointerleave', options)

	override_event_offset(up_event, context.offset_x, context.offset_y)
	override_event_offset(leave_event, context.offset_x, context.offset_y)
	context.dom.dispatchEvent(up_event)

	if (is_tap) {
		const click_event = new MouseEvent('click', options)

		override_event_offset(click_event, context.offset_x, context.offset_y)
		context.dom.dispatchEvent(click_event)
	}

	context.dom.dispatchEvent(leave_event)
}

function dispatch_pointer_cancel(
	pointer_id: number,
	is_primary: boolean,
	x: number,
	y: number,
): void {
	const context = get_dispatch_context(x, y)
	if (!context) return
	const options = build_event_options(pointer_id, is_primary, x, y)
	const up_event = new PointerEvent('pointerup', options)
	const leave_event = new PointerEvent('pointerleave', options)

	override_event_offset(up_event, context.offset_x, context.offset_y)
	override_event_offset(leave_event, context.offset_x, context.offset_y)
	context.dom.dispatchEvent(up_event)
	context.dom.dispatchEvent(leave_event)
}

const joystick_dispatch = { dispatch_pointer_down, dispatch_pointer_up, dispatch_pointer_cancel }
export { joystick_dispatch }
