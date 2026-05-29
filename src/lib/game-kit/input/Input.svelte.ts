import { override_event_offset } from '$lib/game-kit/input/override-event-offset'
import {
	create_listener_manager,
	type ListenerManager,
	type ListenerSpec,
} from '$lib/game-kit/listener-manager'

const HALF_DIVISOR = 2
const PITCH_LIMIT_MARGIN = 0.01
const MOUSE_SENSITIVITY = 0.004
const WHEEL_SENSITIVITY = 0.004
const MAX_PITCH = Math.PI / HALF_DIVISOR - PITCH_LIMIT_MARGIN
const RIGHT_MOUSE_BUTTON = 2

interface Keys {
	w: boolean
	a: boolean
	s: boolean
	d: boolean
}

interface Vec2 {
	x: number
	y: number
}

interface InputState {
	is_dragging_look: boolean
	drag_start_x: number
	drag_start_y: number
	yaw: number
	pitch: number
	keys: Keys
	is_sprinting: boolean
	is_jump_requested: boolean
}

interface InputReferences {
	canvas_el: HTMLCanvasElement | null
}

const KEY_MAP: Record<string, keyof Keys> = {
	w: 'w',
	W: 'w',
	ArrowUp: 'w',
	a: 'a',
	A: 'a',
	ArrowLeft: 'a',
	s: 's',
	S: 's',
	ArrowDown: 's',
	d: 'd',
	D: 'd',
	ArrowRight: 'd',
}

const PASSIVE_FALSE: AddEventListenerOptions = { passive: false }
const CAPTURE: AddEventListenerOptions = { capture: true }

function clamp_pitch(value: number): number {
	return Math.max(-MAX_PITCH, Math.min(MAX_PITCH, value))
}

function reset_transient_input(state: InputState): void {
	state.keys = { w: false, a: false, s: false, d: false }
	state.is_sprinting = false
	state.is_jump_requested = false
	state.is_dragging_look = false
}

function dispatch_synthetic_pointer(
	type: 'pointerdown' | 'pointerup',
	x: number,
	y: number,
	canvas_element: HTMLCanvasElement | null,
): void {
	if (!canvas_element) return
	const synth = new PointerEvent(type, {
		button: 0,
		clientX: x,
		clientY: y,
		bubbles: true,
		cancelable: true,
	})

	canvas_element.dispatchEvent(synth)
}

function on_mouse_down_impl(state: InputState, e: MouseEvent): void {
	if (e.button !== RIGHT_MOUSE_BUTTON) return
	state.drag_start_x = e.clientX
	state.drag_start_y = e.clientY
	state.is_dragging_look = true
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- requestPointerLock is typed as always present but absent on older browsers
	if (e.target instanceof HTMLElement) void e.target.requestPointerLock?.()
}

function on_mouse_up_impl(state: InputState, e: MouseEvent): void {
	if (e.button !== RIGHT_MOUSE_BUTTON) return
	state.is_dragging_look = false
	if (document.pointerLockElement) document.exitPointerLock()
}

function on_mouse_move_impl(state: InputState, e: MouseEvent): void {
	if (!state.is_dragging_look) return
	state.yaw -= e.movementX * MOUSE_SENSITIVITY
	state.pitch = clamp_pitch(state.pitch - e.movementY * MOUSE_SENSITIVITY)
}

function on_pointer_lock_change_impl(state: InputState): void {
	if (!document.pointerLockElement) state.is_dragging_look = false
}

function on_wheel_impl(state: InputState, e: WheelEvent): void {
	e.preventDefault()
	state.yaw += e.deltaX * WHEEL_SENSITIVITY
	state.pitch = clamp_pitch(state.pitch + e.deltaY * WHEEL_SENSITIVITY)
}

function override_offset_during_drag_impl(state: InputState, event: Event): void {
	if (!state.is_dragging_look) return
	if (!(event.target instanceof HTMLElement)) return
	const rect = event.target.getBoundingClientRect()

	override_event_offset(event, state.drag_start_x - rect.left, state.drag_start_y - rect.top)
}

function on_left_mouse_for_synth_impl(
	state: InputState,
	e: MouseEvent,
	references: InputReferences,
): void {
	if (!state.is_dragging_look || e.button !== 0) return

	switch (e.type) {
		case 'mousedown': {
			dispatch_synthetic_pointer(
				'pointerdown',
				state.drag_start_x,
				state.drag_start_y,
				references.canvas_el,
			)
			break
		}

		case 'mouseup': {
			dispatch_synthetic_pointer(
				'pointerup',
				state.drag_start_x,
				state.drag_start_y,
				references.canvas_el,
			)
			break
		}

		default: {
			// No-op for unhandled event types (the function is wired to mousedown/mouseup only).
			break
		}
	}
}

function on_key_impl(state: InputState, e: KeyboardEvent, is_down: boolean): void {
	if (e.key === 'Shift') {
		state.is_sprinting = is_down

		return
	}

	if (is_down && e.key === ' ') {
		state.is_jump_requested = true

		return
	}

	const key = KEY_MAP[e.key]
	if (!key) return
	state.keys[key] = is_down
	if (e.key.startsWith('Arrow')) e.preventDefault()
}

function make_drag_override_specs(state: InputState): Array<ListenerSpec> {
	const handler = (e: Event): void => {
		override_offset_during_drag_impl(state, e)
	}

	return [
		{ target: document, type: 'pointerdown', handler, options: CAPTURE },
		{ target: document, type: 'pointerup', handler, options: CAPTURE },
		{ target: document, type: 'pointermove', handler, options: CAPTURE },
		{ target: document, type: 'click', handler, options: CAPTURE },
	]
}

function make_listener_specs(
	state: InputState,
	references: InputReferences,
): ReadonlyArray<ListenerSpec> {
	return [
		{
			target: document,
			type: 'mousedown',
			handler: (e) => {
				on_mouse_down_impl(state, e as MouseEvent)
			},
		},
		{
			target: document,
			type: 'mousemove',
			handler: (e) => {
				on_mouse_move_impl(state, e as MouseEvent)
			},
		},
		{
			target: document,
			type: 'mouseup',
			handler: (e) => {
				on_mouse_up_impl(state, e as MouseEvent)
			},
		},
		{
			target: document,
			type: 'mousedown',
			handler: (e) => {
				on_left_mouse_for_synth_impl(state, e as MouseEvent, references)
			},
			options: CAPTURE,
		},
		{
			target: document,
			type: 'mouseup',
			handler: (e) => {
				on_left_mouse_for_synth_impl(state, e as MouseEvent, references)
			},
			options: CAPTURE,
		},
		{
			target: document,
			type: 'wheel',
			handler: (e) => {
				on_wheel_impl(state, e as WheelEvent)
			},
			options: PASSIVE_FALSE,
		},
		{
			target: document,
			type: 'contextmenu',
			handler: (e) => {
				e.preventDefault()
			},
		},
		{
			target: document,
			type: 'pointerlockchange',
			handler: () => {
				on_pointer_lock_change_impl(state)
			},
		},
		...make_drag_override_specs(state),
		{
			target: document,
			type: 'keydown',
			handler: (e) => {
				on_key_impl(state, e as KeyboardEvent, true)
			},
		},
		{
			target: document,
			type: 'keyup',
			handler: (e) => {
				on_key_impl(state, e as KeyboardEvent, false)
			},
		},
		{
			target: globalThis,
			type: 'blur',
			handler: () => {
				reset_transient_input(state)
			},
		},
	]
}

interface InputApi {
	readonly is_dragging_look: boolean
	readonly drag_start_x: number
	readonly drag_start_y: number
	readonly yaw: number
	readonly pitch: number
	readonly keys: Keys
	readonly is_sprinting: boolean
	readonly is_jump_requested: boolean
	readonly joystick_move: Vec2
	readonly joystick_look: Vec2
	setup_listeners: (canvas_element: HTMLCanvasElement | null) => () => void
	set_joystick_move: (x: number, y: number) => void
	set_joystick_look: (x: number, y: number) => void
	set_sprinting: (value: boolean) => void
	trigger_jump: () => void
	clear_jump_request: () => void
	apply_look_delta: (delta_yaw: number, delta_pitch: number) => void
}

function make_input_api(
	state: InputState,
	jm: Vec2,
	jl: Vec2,
	references: InputReferences,
): InputApi {
	let manager: ListenerManager | null = null

	function on_cleanup(): void {
		state.yaw = 0
		state.pitch = 0
		reset_transient_input(state)
		jm.x = 0
		jm.y = 0
		jl.x = 0
		jl.y = 0
	}

	return {
		get is_dragging_look() {
			return state.is_dragging_look
		},
		get drag_start_x() {
			return state.drag_start_x
		},
		get drag_start_y() {
			return state.drag_start_y
		},
		get yaw() {
			return state.yaw
		},
		get pitch() {
			return state.pitch
		},
		get keys() {
			return state.keys
		},
		get is_sprinting() {
			return state.is_sprinting
		},
		get is_jump_requested() {
			return state.is_jump_requested
		},
		get joystick_move() {
			return jm
		},
		get joystick_look() {
			return jl
		},
		setup_listeners: (canvas_element: HTMLCanvasElement | null): (() => void) => {
			const specs = make_listener_specs(state, references)
			// eslint-disable-next-line no-multi-assign -- idiomatic lazy-init `??=` pattern
			const listener_mgr = (manager ??= create_listener_manager(specs))
			if (!listener_mgr.is_active || canvas_element !== null) references.canvas_el = canvas_element

			return listener_mgr.setup(on_cleanup)
		},
		set_joystick_move: (x: number, y: number): void => {
			jm.x = x
			jm.y = y
		},
		set_joystick_look: (x: number, y: number): void => {
			jl.x = x
			jl.y = y
		},
		set_sprinting: (value: boolean): void => {
			state.is_sprinting = value
		},
		trigger_jump: (): void => {
			state.is_jump_requested = true
		},
		clear_jump_request: (): void => {
			state.is_jump_requested = false
		},
		apply_look_delta: (delta_yaw: number, delta_pitch: number): void => {
			state.yaw -= delta_yaw
			state.pitch = clamp_pitch(state.pitch - delta_pitch)
		},
	}
}

function create_input(): InputApi {
	const state = $state<InputState>({
		is_dragging_look: false,
		drag_start_x: 0,
		drag_start_y: 0,
		yaw: 0,
		pitch: 0,
		keys: { w: false, a: false, s: false, d: false },
		is_sprinting: false,
		is_jump_requested: false,
	})
	const joystick_move = $state<Vec2>({ x: 0, y: 0 })
	const joystick_look = $state<Vec2>({ x: 0, y: 0 })
	const references: InputReferences = { canvas_el: null }

	return make_input_api(state, joystick_move, joystick_look, references)
}

export type InputInstance = ReturnType<typeof create_input>

const input = create_input()

export { create_input, input }
