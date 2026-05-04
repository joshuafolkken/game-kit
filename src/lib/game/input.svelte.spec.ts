import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { input, create_input } from '$lib/game/input.svelte';

const RIGHT_BUTTON = 2;
const LEFT_BUTTON = 0;

function dispatch_mouse(type: string, init: MouseEventInit): void {
	document.dispatchEvent(new MouseEvent(type, init));
}

function dispatch_mouse_with_target(type: string, init: MouseEventInit, target: HTMLElement): void {
	const evt = new MouseEvent(type, init);
	Object.defineProperty(evt, 'target', { value: target });
	document.dispatchEvent(evt);
}

function dispatch_wheel(init: WheelEventInit): WheelEvent {
	const evt = new WheelEvent('wheel', { ...init, cancelable: true });
	document.dispatchEvent(evt);
	return evt;
}

function start_right_drag(): void {
	dispatch_mouse('mousedown', { button: RIGHT_BUTTON });
}

function end_right_drag(): void {
	dispatch_mouse('mouseup', { button: RIGHT_BUTTON });
}

function make_zero_rect_target(): HTMLElement {
	const target = document.createElement('div');
	document.body.appendChild(target);
	target.getBoundingClientRect = (): DOMRect =>
		({
			left: 0,
			top: 0,
			right: 800,
			bottom: 600,
			width: 800,
			height: 600,
			x: 0,
			y: 0,
			toJSON: () => ({})
		}) as DOMRect;
	return target;
}

function make_pointer_event_with_offsets(
	target: HTMLElement,
	offset_x: number,
	offset_y: number
): PointerEvent {
	const evt = new PointerEvent('pointerdown', { button: 0, bubbles: true });
	Object.defineProperty(evt, 'target', { value: target });
	Object.defineProperty(evt, 'offsetX', { value: offset_x, configurable: true });
	Object.defineProperty(evt, 'offsetY', { value: offset_y, configurable: true });
	return evt;
}

describe('input', () => {
	let cleanup: () => void;
	let canvas_el: HTMLCanvasElement;

	beforeEach(() => {
		canvas_el = document.createElement('canvas');
		document.body.appendChild(canvas_el);
		cleanup = input.setup_listeners(canvas_el);
	});

	afterEach(() => {
		cleanup();
		canvas_el.remove();
		vi.restoreAllMocks();
	});

	it('starts with look-drag inactive', () => {
		expect(input.is_dragging_look).toBe(false);
	});

	it('right mouse down then mousemove updates yaw and pitch', () => {
		start_right_drag();
		dispatch_mouse('mousemove', { movementX: 100, movementY: 50 });
		expect(input.yaw).not.toBe(0);
		expect(input.pitch).not.toBe(0);
	});

	it('right-drag with positive movementX decreases yaw (FPS-style for mouse)', () => {
		start_right_drag();
		dispatch_mouse('mousemove', { movementX: 100, movementY: 0 });
		expect(input.yaw).toBeLessThan(0);
	});

	it('right-drag with positive movementY decreases pitch (FPS-style for mouse)', () => {
		start_right_drag();
		dispatch_mouse('mousemove', { movementX: 0, movementY: 100 });
		expect(input.pitch).toBeLessThan(0);
	});

	it('right-drag yaw scales by sensitivity (-0.004 per pixel of movementX)', () => {
		start_right_drag();
		dispatch_mouse('mousemove', { movementX: 100, movementY: 0 });
		expect(input.yaw).toBeCloseTo(-0.4);
	});

	it('left mouse down then mousemove does not update yaw or pitch', () => {
		dispatch_mouse('mousedown', { button: LEFT_BUTTON });
		dispatch_mouse('mousemove', { movementX: 100, movementY: 50 });
		expect(input.yaw).toBe(0);
		expect(input.pitch).toBe(0);
	});

	it('mousemove without any drag does not update yaw or pitch', () => {
		dispatch_mouse('mousemove', { movementX: 100, movementY: 50 });
		expect(input.yaw).toBe(0);
		expect(input.pitch).toBe(0);
	});

	it('right mouse up stops the drag', () => {
		start_right_drag();
		end_right_drag();
		dispatch_mouse('mousemove', { movementX: 100, movementY: 50 });
		expect(input.yaw).toBe(0);
		expect(input.pitch).toBe(0);
	});

	it('window blur clears is_dragging_look so drag does not stay latched', () => {
		start_right_drag();
		expect(input.is_dragging_look).toBe(true);
		globalThis.dispatchEvent(new Event('blur'));
		expect(input.is_dragging_look).toBe(false);
		dispatch_mouse('mousemove', { movementX: 100, movementY: 50 });
		expect(input.yaw).toBe(0);
		expect(input.pitch).toBe(0);
	});

	it('right mouse down captures drag start clientX/clientY', () => {
		dispatch_mouse('mousedown', { button: RIGHT_BUTTON, clientX: 100, clientY: 200 });
		expect(input.drag_start_x).toBe(100);
		expect(input.drag_start_y).toBe(200);
	});

	it('during drag, capture-phase pointerdown overrides offsetX/Y to drag-start coords', () => {
		const target = make_zero_rect_target();
		dispatch_mouse('mousedown', { button: RIGHT_BUTTON, clientX: 200, clientY: 150 });
		expect(input.is_dragging_look).toBe(true);

		const evt = make_pointer_event_with_offsets(target, 999, 999);
		target.dispatchEvent(evt);

		expect(evt.offsetX).toBe(200);
		expect(evt.offsetY).toBe(150);
		document.body.removeChild(target);
	});

	it('without drag, capture-phase listener leaves offsetX/Y untouched', () => {
		const target = make_zero_rect_target();
		const evt = make_pointer_event_with_offsets(target, 999, 999);
		target.dispatchEvent(evt);

		expect(evt.offsetX).toBe(999);
		expect(evt.offsetY).toBe(999);
		document.body.removeChild(target);
	});

	it('synthesizes pointerdown on canvas when left mousedown fires during drag', () => {
		const received: string[] = [];
		canvas_el.addEventListener('pointerdown', (e) =>
			received.push(`${e.type}:${(e as PointerEvent).button}`)
		);
		dispatch_mouse('mousedown', { button: RIGHT_BUTTON, clientX: 200, clientY: 150 });
		dispatch_mouse('mousedown', { button: LEFT_BUTTON });

		expect(received).toContain('pointerdown:0');
	});

	it('synthesizes pointerup on canvas when left mouseup fires during drag', () => {
		const received: string[] = [];
		canvas_el.addEventListener('pointerup', (e) =>
			received.push(`${e.type}:${(e as PointerEvent).button}`)
		);
		dispatch_mouse('mousedown', { button: RIGHT_BUTTON, clientX: 200, clientY: 150 });
		dispatch_mouse('mouseup', { button: LEFT_BUTTON });

		expect(received).toContain('pointerup:0');
	});

	it('does not synthesize pointer events when not dragging', () => {
		const received: string[] = [];
		canvas_el.addEventListener('pointerdown', (e) =>
			received.push(`${e.type}:${(e as PointerEvent).button}`)
		);
		dispatch_mouse('mousedown', { button: LEFT_BUTTON });

		expect(received).toHaveLength(0);
	});

	it('does not synthesize pointer events for right mousedown during drag', () => {
		const received: string[] = [];
		canvas_el.addEventListener('pointerdown', (e) =>
			received.push(`${e.type}:${(e as PointerEvent).button}`)
		);
		dispatch_mouse('mousedown', { button: RIGHT_BUTTON, clientX: 200, clientY: 150 });
		const start_count = received.length;
		dispatch_mouse('mousedown', { button: RIGHT_BUTTON });
		expect(received.length).toBe(start_count);
	});

	it('right mouse down requests pointer lock on event target', () => {
		const target = document.createElement('div');
		document.body.appendChild(target);
		const spy = vi.spyOn(target, 'requestPointerLock').mockResolvedValue();
		dispatch_mouse_with_target('mousedown', { button: RIGHT_BUTTON }, target);
		expect(spy).toHaveBeenCalledTimes(1);
		document.body.removeChild(target);
	});

	it('right mouse up exits pointer lock when locked', () => {
		vi.spyOn(Document.prototype, 'pointerLockElement', 'get').mockReturnValue(document.body);
		const spy = vi.spyOn(Document.prototype, 'exitPointerLock').mockImplementation(() => {});
		dispatch_mouse('mouseup', { button: RIGHT_BUTTON });
		expect(spy).toHaveBeenCalledTimes(1);
	});

	it('right mouse up does not call exitPointerLock when not locked', () => {
		vi.spyOn(Document.prototype, 'pointerLockElement', 'get').mockReturnValue(null);
		const spy = vi.spyOn(Document.prototype, 'exitPointerLock').mockImplementation(() => {});
		dispatch_mouse('mouseup', { button: RIGHT_BUTTON });
		expect(spy).not.toHaveBeenCalled();
	});

	it('pointerlockchange to null clears is_dragging_look', () => {
		start_right_drag();
		expect(input.is_dragging_look).toBe(true);
		vi.spyOn(Document.prototype, 'pointerLockElement', 'get').mockReturnValue(null);
		document.dispatchEvent(new Event('pointerlockchange'));
		expect(input.is_dragging_look).toBe(false);
	});

	it('left mouse up does not end an active right drag', () => {
		start_right_drag();
		dispatch_mouse('mouseup', { button: LEFT_BUTTON });
		dispatch_mouse('mousemove', { movementX: 100, movementY: 0 });
		expect(input.yaw).not.toBe(0);
	});

	it('wheel event updates yaw and pitch from deltaX/deltaY', () => {
		dispatch_wheel({ deltaX: 50, deltaY: 30 });
		expect(input.yaw).not.toBe(0);
		expect(input.pitch).not.toBe(0);
	});

	it('wheel with positive deltaX increases yaw (drag-the-world feel)', () => {
		dispatch_wheel({ deltaX: 50, deltaY: 0 });
		expect(input.yaw).toBeGreaterThan(0);
	});

	it('wheel with positive deltaY increases pitch (drag-the-world feel)', () => {
		dispatch_wheel({ deltaX: 0, deltaY: 50 });
		expect(input.pitch).toBeGreaterThan(0);
	});

	it('wheel yaw scales by sensitivity (0.004 per unit of deltaX)', () => {
		dispatch_wheel({ deltaX: 100, deltaY: 0 });
		expect(input.yaw).toBeCloseTo(0.4);
	});

	it('wheel event preventDefault is called', () => {
		const evt = dispatch_wheel({ deltaX: 10, deltaY: 0 });
		expect(evt.defaultPrevented).toBe(true);
	});

	it('contextmenu preventDefault is called', () => {
		const evt = new MouseEvent('contextmenu', { cancelable: true });
		document.dispatchEvent(evt);
		expect(evt.defaultPrevented).toBe(true);
	});

	it('clamps pitch at max during right drag', () => {
		start_right_drag();
		dispatch_mouse('mousemove', { movementX: 0, movementY: -100000 });
		expect(input.pitch).toBeGreaterThan(0);
		expect(input.pitch).toBeLessThan(Math.PI / 2);
	});

	it('clamps pitch at min during right drag', () => {
		start_right_drag();
		dispatch_mouse('mousemove', { movementX: 0, movementY: 100000 });
		expect(input.pitch).toBeLessThan(0);
		expect(input.pitch).toBeGreaterThan(-Math.PI / 2);
	});

	it('clamps pitch at max during wheel', () => {
		dispatch_wheel({ deltaX: 0, deltaY: 100000 });
		expect(input.pitch).toBeGreaterThan(0);
		expect(input.pitch).toBeLessThan(Math.PI / 2);
	});

	it('maps w key to forward', () => {
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
		expect(input.keys.w).toBe(true);
		document.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' }));
		expect(input.keys.w).toBe(false);
	});

	it('maps ArrowUp to forward', () => {
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
		expect(input.keys.w).toBe(true);
	});

	it('maps a key to left', () => {
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
		expect(input.keys.a).toBe(true);
	});

	it('maps d key to right', () => {
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
		expect(input.keys.d).toBe(true);
	});

	it('ignores unmapped keys', () => {
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'q' }));
		expect(input.keys.w).toBe(false);
		expect(input.keys.a).toBe(false);
		expect(input.keys.s).toBe(false);
		expect(input.keys.d).toBe(false);
	});

	it('sets joystick move values', () => {
		input.set_joystick_move(0.5, -0.3);
		expect(input.joystick_move.x).toBe(0.5);
		expect(input.joystick_move.y).toBe(-0.3);
	});

	it('sets joystick look values', () => {
		input.set_joystick_look(0.8, 0.2);
		expect(input.joystick_look.x).toBe(0.8);
		expect(input.joystick_look.y).toBe(0.2);
	});

	it('apply_look_delta updates yaw and pitch', () => {
		input.apply_look_delta(0.1, 0.05);
		expect(input.yaw).toBeCloseTo(-0.1);
		expect(input.pitch).toBeCloseTo(-0.05);
	});

	it('apply_look_delta clamps pitch at max', () => {
		input.apply_look_delta(0, -100);
		expect(input.pitch).toBeGreaterThan(0);
		expect(input.pitch).toBeLessThan(Math.PI / 2);
	});

	it('apply_look_delta clamps pitch at min', () => {
		input.apply_look_delta(0, 100);
		expect(input.pitch).toBeLessThan(0);
		expect(input.pitch).toBeGreaterThan(-Math.PI / 2);
	});

	it('prevents default on arrow keys to stop page scroll', () => {
		const evt = new KeyboardEvent('keydown', { key: 'ArrowUp', cancelable: true });
		document.dispatchEvent(evt);
		expect(evt.defaultPrevented).toBe(true);
		expect(input.keys.w).toBe(true);
	});

	it('does not prevent default on letter keys', () => {
		const evt = new KeyboardEvent('keydown', { key: 'w', cancelable: true });
		document.dispatchEvent(evt);
		expect(evt.defaultPrevented).toBe(false);
	});

	it('resets keys on window blur to prevent stuck movement', () => {
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
		expect(input.keys.w).toBe(true);
		globalThis.dispatchEvent(new Event('blur'));
		expect(input.keys.w).toBe(false);
	});

	it('setup_listeners is idempotent when called twice', () => {
		const second_cleanup = input.setup_listeners(canvas_el);
		expect(second_cleanup).toBe(cleanup);
	});

	it('cleanup resets all state including drag and joysticks', () => {
		start_right_drag();
		input.set_joystick_move(1, 1);
		input.set_joystick_look(1, 1);
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
		cleanup();
		expect(input.is_dragging_look).toBe(false);
		expect(input.keys.w).toBe(false);
		expect(input.joystick_move.x).toBe(0);
		expect(input.joystick_look.x).toBe(0);
		cleanup = input.setup_listeners(canvas_el);
	});

	it('Shift keydown sets is_sprinting true', () => {
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
		expect(input.is_sprinting).toBe(true);
	});

	it('Shift keyup sets is_sprinting false', () => {
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
		document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift' }));
		expect(input.is_sprinting).toBe(false);
	});

	it('set_sprinting toggles is_sprinting', () => {
		input.set_sprinting(true);
		expect(input.is_sprinting).toBe(true);
		input.set_sprinting(false);
		expect(input.is_sprinting).toBe(false);
	});

	it('Space keydown sets is_jump_requested true', () => {
		document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
		expect(input.is_jump_requested).toBe(true);
	});

	it('clear_jump_request clears is_jump_requested', () => {
		document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
		input.clear_jump_request();
		expect(input.is_jump_requested).toBe(false);
	});

	it('blur clears is_sprinting and is_jump_requested via reset_transient_input', () => {
		input.set_sprinting(true);
		document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
		globalThis.dispatchEvent(new Event('blur'));
		expect(input.is_sprinting).toBe(false);
		expect(input.is_jump_requested).toBe(false);
	});
});

describe('create_input isolation', () => {
	it('two instances do not share yaw state', () => {
		const a = create_input();
		const b = create_input();
		a.apply_look_delta(-0.5, 0);
		expect(a.yaw).toBe(0.5);
		expect(b.yaw).toBe(0);
	});

	it('cleaning up one instance does not detach the other instance listeners', () => {
		const a = create_input();
		const b = create_input();
		const cleanup_a = a.setup_listeners(null);
		const cleanup_b = b.setup_listeners(null);
		cleanup_a();
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
		expect(a.keys.w).toBe(false);
		expect(b.keys.w).toBe(true);
		cleanup_b();
	});
});
