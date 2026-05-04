import { override_event_offset } from '$lib/game/override-event-offset';
import {
	create_listener_manager,
	type ListenerManager,
	type ListenerSpec
} from '$lib/game/listener-manager';

const MOUSE_SENSITIVITY = 0.004;
const WHEEL_SENSITIVITY = 0.004;
const MAX_PITCH = Math.PI / 2 - 0.01;
const RIGHT_MOUSE_BUTTON = 2;

type Keys = { w: boolean; a: boolean; s: boolean; d: boolean };
type Vec2 = { x: number; y: number };

type InputState = {
	is_dragging_look: boolean;
	drag_start_x: number;
	drag_start_y: number;
	yaw: number;
	pitch: number;
	keys: Keys;
	is_sprinting: boolean;
	is_jump_requested: boolean;
};
type InputRefs = { canvas_el: HTMLCanvasElement | null };

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
	ArrowRight: 'd'
};

const PASSIVE_FALSE: AddEventListenerOptions = { passive: false };
const CAPTURE: AddEventListenerOptions = { capture: true };

function clamp_pitch(value: number): number {
	return Math.max(-MAX_PITCH, Math.min(MAX_PITCH, value));
}

function reset_transient_input(s: InputState): void {
	s.keys = { w: false, a: false, s: false, d: false };
	s.is_sprinting = false;
	s.is_jump_requested = false;
	s.is_dragging_look = false;
}

function dispatch_synthetic_pointer(
	type: 'pointerdown' | 'pointerup',
	x: number,
	y: number,
	canvas_el: HTMLCanvasElement | null
): void {
	if (!canvas_el) return;
	const synth = new PointerEvent(type, {
		button: 0,
		clientX: x,
		clientY: y,
		bubbles: true,
		cancelable: true
	});
	canvas_el.dispatchEvent(synth);
}

function on_mouse_down_impl(s: InputState, e: MouseEvent): void {
	if (e.button !== RIGHT_MOUSE_BUTTON) return;
	s.drag_start_x = e.clientX;
	s.drag_start_y = e.clientY;
	s.is_dragging_look = true;
	if (e.target instanceof HTMLElement) void e.target.requestPointerLock?.();
}

function on_mouse_up_impl(s: InputState, e: MouseEvent): void {
	if (e.button !== RIGHT_MOUSE_BUTTON) return;
	s.is_dragging_look = false;
	if (document.pointerLockElement) document.exitPointerLock();
}

function on_mouse_move_impl(s: InputState, e: MouseEvent): void {
	if (!s.is_dragging_look) return;
	s.yaw -= e.movementX * MOUSE_SENSITIVITY;
	s.pitch = clamp_pitch(s.pitch - e.movementY * MOUSE_SENSITIVITY);
}

function on_pointer_lock_change_impl(s: InputState): void {
	if (!document.pointerLockElement) s.is_dragging_look = false;
}

function on_wheel_impl(s: InputState, e: WheelEvent): void {
	e.preventDefault();
	s.yaw += e.deltaX * WHEEL_SENSITIVITY;
	s.pitch = clamp_pitch(s.pitch + e.deltaY * WHEEL_SENSITIVITY);
}

function override_offset_during_drag_impl(s: InputState, event: Event): void {
	if (!s.is_dragging_look) return;
	if (!(event.target instanceof HTMLElement)) return;
	const rect = event.target.getBoundingClientRect();
	override_event_offset(event, s.drag_start_x - rect.left, s.drag_start_y - rect.top);
}

function on_left_mouse_for_synth_impl(s: InputState, e: MouseEvent, refs: InputRefs): void {
	if (!s.is_dragging_look || e.button !== 0) return;
	if (e.type === 'mousedown')
		dispatch_synthetic_pointer('pointerdown', s.drag_start_x, s.drag_start_y, refs.canvas_el);
	else if (e.type === 'mouseup')
		dispatch_synthetic_pointer('pointerup', s.drag_start_x, s.drag_start_y, refs.canvas_el);
}

function on_key_impl(s: InputState, e: KeyboardEvent, is_down: boolean): void {
	if (e.key === 'Shift') {
		s.is_sprinting = is_down;
		return;
	}
	if (is_down && e.key === ' ') {
		s.is_jump_requested = true;
		return;
	}
	const key = KEY_MAP[e.key];
	if (!key) return;
	s.keys[key] = is_down;
	if (e.key.startsWith('Arrow')) e.preventDefault();
}

function make_drag_override_specs(s: InputState): ListenerSpec[] {
	const handler = (e: Event): void => override_offset_during_drag_impl(s, e);
	return [
		{ target: document, type: 'pointerdown', handler: handler as EventListener, options: CAPTURE },
		{ target: document, type: 'pointerup', handler: handler as EventListener, options: CAPTURE },
		{ target: document, type: 'pointermove', handler: handler as EventListener, options: CAPTURE },
		{ target: document, type: 'click', handler: handler as EventListener, options: CAPTURE }
	];
}

function make_listener_specs(s: InputState, refs: InputRefs): readonly ListenerSpec[] {
	return [
		{ target: document, type: 'mousedown', handler: (e) => on_mouse_down_impl(s, e as MouseEvent) },
		{ target: document, type: 'mousemove', handler: (e) => on_mouse_move_impl(s, e as MouseEvent) },
		{ target: document, type: 'mouseup', handler: (e) => on_mouse_up_impl(s, e as MouseEvent) },
		{
			target: document,
			type: 'mousedown',
			handler: (e) => on_left_mouse_for_synth_impl(s, e as MouseEvent, refs),
			options: CAPTURE
		},
		{
			target: document,
			type: 'mouseup',
			handler: (e) => on_left_mouse_for_synth_impl(s, e as MouseEvent, refs),
			options: CAPTURE
		},
		{
			target: document,
			type: 'wheel',
			handler: (e) => on_wheel_impl(s, e as WheelEvent),
			options: PASSIVE_FALSE
		},
		{
			target: document,
			type: 'contextmenu',
			handler: (e) => {
				e.preventDefault();
			}
		},
		{ target: document, type: 'pointerlockchange', handler: () => on_pointer_lock_change_impl(s) },
		...make_drag_override_specs(s),
		{ target: document, type: 'keydown', handler: (e) => on_key_impl(s, e as KeyboardEvent, true) },
		{ target: document, type: 'keyup', handler: (e) => on_key_impl(s, e as KeyboardEvent, false) },
		{ target: globalThis, type: 'blur', handler: () => reset_transient_input(s) }
	];
}

function make_input_api(s: InputState, jm: Vec2, jl: Vec2, refs: InputRefs) {
	let manager: ListenerManager | null = null;
	function on_cleanup(): void {
		s.yaw = 0;
		s.pitch = 0;
		reset_transient_input(s);
		jm.x = 0;
		jm.y = 0;
		jl.x = 0;
		jl.y = 0;
	}
	return {
		get is_dragging_look() {
			return s.is_dragging_look;
		},
		get drag_start_x() {
			return s.drag_start_x;
		},
		get drag_start_y() {
			return s.drag_start_y;
		},
		get yaw() {
			return s.yaw;
		},
		get pitch() {
			return s.pitch;
		},
		get keys() {
			return s.keys;
		},
		get is_sprinting() {
			return s.is_sprinting;
		},
		get is_jump_requested() {
			return s.is_jump_requested;
		},
		get joystick_move() {
			return jm;
		},
		get joystick_look() {
			return jl;
		},
		setup_listeners: (canvas_el: HTMLCanvasElement | null): (() => void) => {
			const m = (manager ??= create_listener_manager(make_listener_specs(s, refs)));
			if (!m.is_active || canvas_el !== null) refs.canvas_el = canvas_el;
			return m.setup(on_cleanup);
		},
		set_joystick_move: (x: number, y: number): void => {
			jm.x = x;
			jm.y = y;
		},
		set_joystick_look: (x: number, y: number): void => {
			jl.x = x;
			jl.y = y;
		},
		set_sprinting: (value: boolean): void => {
			s.is_sprinting = value;
		},
		trigger_jump: (): void => {
			s.is_jump_requested = true;
		},
		clear_jump_request: (): void => {
			s.is_jump_requested = false;
		},
		apply_look_delta: (delta_yaw: number, delta_pitch: number): void => {
			s.yaw -= delta_yaw;
			s.pitch = clamp_pitch(s.pitch - delta_pitch);
		}
	};
}

export function create_input() {
	const s = $state<InputState>({
		is_dragging_look: false,
		drag_start_x: 0,
		drag_start_y: 0,
		yaw: 0,
		pitch: 0,
		keys: { w: false, a: false, s: false, d: false },
		is_sprinting: false,
		is_jump_requested: false
	});
	const joystick_move = $state<Vec2>({ x: 0, y: 0 });
	const joystick_look = $state<Vec2>({ x: 0, y: 0 });
	const refs: InputRefs = { canvas_el: null };
	return make_input_api(s, joystick_move, joystick_look, refs);
}

export type InputInstance = ReturnType<typeof create_input>;

export const input = create_input();
