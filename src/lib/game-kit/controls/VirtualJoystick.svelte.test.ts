import { input } from '$lib/game-kit/input/Input.svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-svelte'
import VirtualJoystick from './VirtualJoystick.svelte'

const LABEL_JUMP = 'JUMP'
const SEL_JUMP_BTN = '[data-testid="jump-btn"]'
const SEL_JOYSTICK_ZONE = '.joystick-zone'
const SEL_JOYSTICK_OVERLAY = '.joystick-overlay'

function render_joystick(): ReturnType<typeof render<typeof VirtualJoystick>> {
	return render(VirtualJoystick, { props: { label_jump: LABEL_JUMP } })
}

function make_touch(id: number, x: number, y: number, target: Element): Touch {
	return new Touch({ identifier: id, target, clientX: x, clientY: y })
}

function fire(type: string, target: EventTarget, changed: Array<Touch>, all: Array<Touch>): void {
	target.dispatchEvent(
		new TouchEvent(type, {
			changedTouches: changed,
			touches: all,
			bubbles: true,
			cancelable: true,
		}),
	)
}

function setup_threlte_dom(): { dom: HTMLDivElement; canvas: HTMLCanvasElement } {
	const dom = document.createElement('div')
	const canvas = document.createElement('canvas')

	dom.append(canvas)
	document.body.append(dom)

	return { dom, canvas }
}

describe('VirtualJoystick', () => {
	it('renders jump button inside overlay but not inside any joystick zone', () => {
		const { container } = render_joystick()

		expect(container.querySelector('.joystick-overlay [data-testid="jump-btn"]')).toBeTruthy()
		expect(container.querySelector('.joystick-zone [data-testid="jump-btn"]')).toBeNull()
	})

	it('jump button has aria-label and svg icon instead of visible text', () => {
		const { container } = render_joystick()
		const button = container.querySelector<HTMLElement>(SEL_JUMP_BTN)

		expect(button?.getAttribute('aria-label')).toBe(LABEL_JUMP)
		expect(button?.querySelector('svg')).toBeTruthy()
		expect(button?.textContent.trim()).toBe('')
	})

	it('joystick-zone does not capture pointer events on non-touch devices', () => {
		const { container } = render_joystick()
		const zone = container.querySelector<HTMLElement>(SEL_JOYSTICK_ZONE)

		expect(zone).toBeTruthy()
		if (!zone) return
		expect(getComputedStyle(zone).pointerEvents).toBe('none')
	})

	it('overlay has touch-action none to allow simultaneous two-finger input', () => {
		const { container } = render_joystick()
		const overlay = container.querySelector<HTMLElement>(SEL_JOYSTICK_OVERLAY)

		expect(overlay).toBeTruthy()
		if (!overlay) return
		expect(getComputedStyle(overlay).touchAction).toBe('none')
	})

	it('hides jump button when show_jump=false', () => {
		const { container } = render(VirtualJoystick, {
			props: { label_jump: LABEL_JUMP, show_jump: false },
		})

		expect(container.querySelector(SEL_JUMP_BTN)).toBeNull()
	})

	it('still renders joystick zones even when show_jump=false (move/look usable in overlay)', () => {
		const { container } = render(VirtualJoystick, {
			props: { label_jump: LABEL_JUMP, show_jump: false },
		})

		expect(container.querySelectorAll(SEL_JOYSTICK_ZONE)).toHaveLength(2)
	})

	it('jump button is positioned near the bottom-right corner', () => {
		const { container } = render_joystick()
		const overlay = container.querySelector<HTMLElement>(SEL_JOYSTICK_OVERLAY)

		expect(overlay).toBeTruthy()
		if (!overlay) return
		const styles = getComputedStyle(overlay)

		expect(styles.getPropertyValue('--jump-btn-bottom').trim()).toBe('12%')
		expect(styles.getPropertyValue('--jump-btn-left').trim()).toBe('82%')
	})

	it('jump button matches pause button styling (size, background, border, color)', () => {
		const { container } = render_joystick()
		const button = container.querySelector<HTMLElement>(SEL_JUMP_BTN)

		expect(button).toBeTruthy()
		if (!button) return
		const style = getComputedStyle(button)

		expect(style.width).toBe('44px')
		expect(style.height).toBe('44px')
		expect(style.backgroundColor).toBe('rgba(255, 255, 255, 0.15)')
		expect(style.borderColor).toBe('rgba(255, 255, 255, 0.4)')
		expect(style.color).toBe('rgba(255, 255, 255, 0.85)')
	})
})

describe('VirtualJoystick touch handlers', () => {
	beforeEach(() => {
		// eslint-disable-next-line unicorn/prefer-add-event-listener -- direct property assignment is the standard pattern for stubbing a touch-detection sentinel
		;(globalThis as typeof globalThis & { ontouchstart: null }).ontouchstart = null
	})

	afterEach(() => {
		vi.restoreAllMocks()
		delete (globalThis as typeof globalThis & { ontouchstart?: null }).ontouchstart
	})

	it('dragging move zone calls set_joystick_move with normalized vector at max distance', () => {
		const spy = vi.spyOn(input, 'set_joystick_move')
		const { container } = render_joystick()
		const move_zone = container.querySelector(SEL_JOYSTICK_ZONE)

		expect(move_zone).toBeTruthy()
		if (!move_zone) return

		const t_start = make_touch(1, 100, 200, move_zone)

		fire('touchstart', move_zone, [t_start], [t_start])

		const MOVE_MAX_DIST = 40
		const t_move = make_touch(1, 100 + MOVE_MAX_DIST, 200, move_zone)

		fire('touchmove', document, [t_move], [t_move])

		expect(spy).toHaveBeenCalledWith(1, 0)
	})

	it('movement within dead zone gives zero joystick output', () => {
		const spy = vi.spyOn(input, 'set_joystick_move')
		const { container } = render_joystick()
		const move_zone = container.querySelector(SEL_JOYSTICK_ZONE)

		expect(move_zone).toBeTruthy()
		if (!move_zone) return

		const t_start = make_touch(1, 100, 200, move_zone)

		fire('touchstart', move_zone, [t_start], [t_start])

		const MOVE_DEAD_ZONE = 6
		const t_move = make_touch(1, 100 + MOVE_DEAD_ZONE - 1, 200, move_zone)

		fire('touchmove', document, [t_move], [t_move])

		expect(spy).toHaveBeenCalledWith(0, 0)
	})

	it('movement at dead zone boundary gives zero joystick output', () => {
		const spy = vi.spyOn(input, 'set_joystick_move')
		const { container } = render_joystick()
		const move_zone = container.querySelector(SEL_JOYSTICK_ZONE)

		expect(move_zone).toBeTruthy()
		if (!move_zone) return

		const t_start = make_touch(1, 100, 200, move_zone)

		fire('touchstart', move_zone, [t_start], [t_start])

		const MOVE_DEAD_ZONE = 6
		const t_move = make_touch(1, 100 + MOVE_DEAD_ZONE, 200, move_zone)

		fire('touchmove', document, [t_move], [t_move])

		expect(spy).toHaveBeenCalledWith(0, 0)
	})

	it('movement beyond dead zone gives scaled output', () => {
		const spy = vi.spyOn(input, 'set_joystick_move')
		const { container } = render_joystick()
		const move_zone = container.querySelector(SEL_JOYSTICK_ZONE)

		expect(move_zone).toBeTruthy()
		if (!move_zone) return

		const t_start = make_touch(1, 100, 200, move_zone)

		fire('touchstart', move_zone, [t_start], [t_start])

		const MOVE_MAX_DIST = 40
		const MOVE_DEAD_ZONE = 6
		const mid = MOVE_DEAD_ZONE + (MOVE_MAX_DIST - MOVE_DEAD_ZONE) / 2
		const t_move = make_touch(1, 100 + mid, 200, move_zone)

		fire('touchmove', document, [t_move], [t_move])

		const [dx] = spy.mock.calls.at(-1) ?? [0, 0]

		expect(dx).toBeCloseTo(0.5)
	})

	it('first touchmove after look start applies reduced delta to soften browser-slop snap', () => {
		const spy = vi.spyOn(input, 'apply_look_delta')
		const { container } = render_joystick()
		const look_zone = container.querySelectorAll(SEL_JOYSTICK_ZONE).item(1)

		expect(look_zone).toBeTruthy()

		const t_start = make_touch(2, 300, 200, look_zone)

		fire('touchstart', look_zone, [t_start], [t_start])

		const t_first = make_touch(2, 310, 190, look_zone)

		fire('touchmove', document, [t_first], [t_first])

		expect(spy).toHaveBeenCalledOnce()
		const [delta_yaw, delta_pitch] = spy.mock.calls[0] ?? [0, 0]
		const TOUCH_LOOK_SENSITIVITY = 0.009
		const FIRST_MOVE_SENSITIVITY_FRACTION = 0.2

		expect(delta_yaw).toBeCloseTo(10 * TOUCH_LOOK_SENSITIVITY * FIRST_MOVE_SENSITIVITY_FRACTION)
		expect(delta_pitch).toBeCloseTo(-10 * TOUCH_LOOK_SENSITIVITY * FIRST_MOVE_SENSITIVITY_FRACTION)
	})

	it('second touchmove after look start applies full-sensitivity delta', () => {
		const spy = vi.spyOn(input, 'apply_look_delta')
		const { container } = render_joystick()
		const look_zone = container.querySelectorAll(SEL_JOYSTICK_ZONE).item(1)

		expect(look_zone).toBeTruthy()

		const t_start = make_touch(2, 300, 200, look_zone)

		fire('touchstart', look_zone, [t_start], [t_start])

		const t_first = make_touch(2, 310, 195, look_zone)

		fire('touchmove', document, [t_first], [t_first])

		const t_second = make_touch(2, 320, 185, look_zone)

		fire('touchmove', document, [t_second], [t_second])

		expect(spy).toHaveBeenCalledTimes(2)
		const [delta_yaw, delta_pitch] = spy.mock.calls[1] ?? [0, 0]
		const TOUCH_LOOK_SENSITIVITY = 0.009

		expect(delta_yaw).toBeCloseTo(10 * TOUCH_LOOK_SENSITIVITY)
		expect(delta_pitch).toBeCloseTo(-10 * TOUCH_LOOK_SENSITIVITY)
	})

	it('two simultaneous touches on both zones both get handled independently', () => {
		const move_spy = vi.spyOn(input, 'set_joystick_move')
		const look_spy = vi.spyOn(input, 'apply_look_delta')
		const { container } = render_joystick()
		const zones = container.querySelectorAll(SEL_JOYSTICK_ZONE)
		const move_zone = zones.item(0)
		const look_zone = zones.item(1)

		expect(move_zone).toBeTruthy()
		expect(look_zone).toBeTruthy()

		const t1 = make_touch(1, 100, 200, move_zone)

		fire('touchstart', move_zone, [t1], [t1])
		const t2 = make_touch(2, 300, 200, look_zone)

		fire('touchstart', look_zone, [t2], [t2])

		const t1m = make_touch(1, 120, 200, move_zone)
		const t2m = make_touch(2, 310, 190, look_zone)

		fire('touchmove', document, [t1m, t2m], [t1m, t2m])

		expect(move_spy).toHaveBeenCalled()
		expect(look_spy).toHaveBeenCalled()
	})

	it('move zone touchend resets joystick to zero', () => {
		const spy = vi.spyOn(input, 'set_joystick_move')
		const { container } = render_joystick()
		const move_zone = container.querySelector(SEL_JOYSTICK_ZONE)

		expect(move_zone).toBeTruthy()
		if (!move_zone) return

		const t = make_touch(1, 100, 200, move_zone)

		fire('touchstart', move_zone, [t], [t])
		fire('touchend', document, [t], [])

		expect(spy).toHaveBeenLastCalledWith(0, 0)
	})

	it('touching move zone dispatches pointerdown to threlte dom (canvas parent)', () => {
		const { dom } = setup_threlte_dom()
		const spy = vi.fn()

		dom.addEventListener('pointerdown', spy)

		const { container } = render_joystick()
		const move_zone = container.querySelector(SEL_JOYSTICK_ZONE)

		expect(move_zone).toBeTruthy()
		if (!move_zone) return

		const t = make_touch(1, 100, 200, move_zone)

		fire('touchstart', move_zone, [t], [t])

		expect(spy).toHaveBeenCalledOnce()
		const pointer_event = spy.mock.calls[0]?.[0] as PointerEvent

		expect(pointer_event.pointerId).toBe(1)
		expect(pointer_event.offsetX).toBe(100)
		expect(pointer_event.offsetY).toBe(200)
		dom.remove()
	})

	it('drag on move zone (touchmove > threshold) does NOT dispatch click on touchend', () => {
		const { dom } = setup_threlte_dom()
		const click_spy = vi.fn()

		dom.addEventListener('click', click_spy)

		const { container } = render_joystick()
		const move_zone = container.querySelector(SEL_JOYSTICK_ZONE)

		expect(move_zone).toBeTruthy()
		if (!move_zone) return

		const t_start = make_touch(1, 100, 200, move_zone)

		fire('touchstart', move_zone, [t_start], [t_start])
		const t_drag = make_touch(1, 130, 230, move_zone)

		fire('touchmove', document, [t_drag], [t_drag])
		const t_end = make_touch(1, 130, 230, move_zone)

		fire('touchend', document, [t_end], [])

		expect(click_spy).not.toHaveBeenCalled()
		dom.remove()
	})

	it('drag on look zone (touchmove > threshold) does NOT dispatch click on touchend', () => {
		const { dom } = setup_threlte_dom()
		const click_spy = vi.fn()

		dom.addEventListener('click', click_spy)

		const { container } = render_joystick()
		const look_zone = container.querySelectorAll(SEL_JOYSTICK_ZONE).item(1)

		expect(look_zone).toBeTruthy()

		const t_start = make_touch(2, 300, 200, look_zone)

		fire('touchstart', look_zone, [t_start], [t_start])
		const t_drag = make_touch(2, 330, 230, look_zone)

		fire('touchmove', document, [t_drag], [t_drag])
		const t_end = make_touch(2, 330, 230, look_zone)

		fire('touchend', document, [t_end], [])

		expect(click_spy).not.toHaveBeenCalled()
		dom.remove()
	})

	it('releasing move zone dispatches click to threlte dom at start position', () => {
		const { dom } = setup_threlte_dom()
		const spy = vi.fn()

		dom.addEventListener('click', spy)

		const { container } = render_joystick()
		const move_zone = container.querySelector(SEL_JOYSTICK_ZONE)

		expect(move_zone).toBeTruthy()
		if (!move_zone) return

		const t = make_touch(1, 150, 250, move_zone)

		fire('touchstart', move_zone, [t], [t])
		const t_end = make_touch(1, 200, 300, move_zone)

		fire('touchend', document, [t_end], [])

		expect(spy).toHaveBeenCalledOnce()
		const click_event = spy.mock.calls[0]?.[0] as MouseEvent

		expect(click_event.clientX).toBe(150)
		expect(click_event.clientY).toBe(250)
		expect(click_event.offsetX).toBe(150)
		expect(click_event.offsetY).toBe(250)
		dom.remove()
	})

	it('releasing move zone dispatches pointerleave to threlte dom', () => {
		const { dom } = setup_threlte_dom()
		const spy = vi.fn()

		dom.addEventListener('pointerleave', spy)

		const { container } = render_joystick()
		const move_zone = container.querySelector(SEL_JOYSTICK_ZONE)

		expect(move_zone).toBeTruthy()
		if (!move_zone) return

		const t = make_touch(1, 100, 200, move_zone)

		fire('touchstart', move_zone, [t], [t])
		fire('touchend', document, [t], [])

		expect(spy).toHaveBeenCalledOnce()
		dom.remove()
	})

	it('touching look zone dispatches pointerdown to threlte dom', () => {
		const { dom } = setup_threlte_dom()
		const spy = vi.fn()

		dom.addEventListener('pointerdown', spy)

		const { container } = render_joystick()
		const look_zone = container.querySelectorAll(SEL_JOYSTICK_ZONE).item(1)

		expect(look_zone).toBeTruthy()

		const t = make_touch(2, 300, 200, look_zone)

		fire('touchstart', look_zone, [t], [t])

		expect(spy).toHaveBeenCalledOnce()
		const pointer_event = spy.mock.calls[0]?.[0] as PointerEvent

		expect(pointer_event.pointerId).toBe(2)
		expect(pointer_event.offsetX).toBe(300)
		expect(pointer_event.offsetY).toBe(200)
		dom.remove()
	})

	it('touchcancel does not dispatch click to threlte dom', () => {
		const { dom } = setup_threlte_dom()
		const click_spy = vi.fn()

		dom.addEventListener('click', click_spy)

		const { container } = render_joystick()
		const move_zone = container.querySelector(SEL_JOYSTICK_ZONE)

		expect(move_zone).toBeTruthy()
		if (!move_zone) return

		const t = make_touch(1, 100, 200, move_zone)

		fire('touchstart', move_zone, [t], [t])
		fire('touchcancel', document, [t], [])

		expect(click_spy).not.toHaveBeenCalled()
		dom.remove()
	})

	it('touchcancel dispatches pointerup to threlte dom', () => {
		const { dom } = setup_threlte_dom()
		const spy = vi.fn()

		dom.addEventListener('pointerup', spy)

		const { container } = render_joystick()
		const move_zone = container.querySelector(SEL_JOYSTICK_ZONE)

		expect(move_zone).toBeTruthy()
		if (!move_zone) return

		const t = make_touch(1, 100, 200, move_zone)

		fire('touchstart', move_zone, [t], [t])
		fire('touchcancel', document, [t], [])

		expect(spy).toHaveBeenCalledOnce()
		dom.remove()
	})

	it('touchcancel dispatches pointerleave to threlte dom', () => {
		const { dom } = setup_threlte_dom()
		const spy = vi.fn()

		dom.addEventListener('pointerleave', spy)

		const { container } = render_joystick()
		const move_zone = container.querySelector(SEL_JOYSTICK_ZONE)

		expect(move_zone).toBeTruthy()
		if (!move_zone) return

		const t = make_touch(1, 100, 200, move_zone)

		fire('touchstart', move_zone, [t], [t])
		fire('touchcancel', document, [t], [])

		expect(spy).toHaveBeenCalledOnce()
		dom.remove()
	})

	it('tapping jump button does not dispatch to threlte dom', () => {
		const { dom } = setup_threlte_dom()
		const spy = vi.fn()

		dom.addEventListener('pointerdown', spy)

		const { container } = render_joystick()
		const jump_button = container.querySelector<HTMLButtonElement>(SEL_JUMP_BTN)

		expect(jump_button).toBeTruthy()
		if (!jump_button) return

		const t = make_touch(2, 300, 200, jump_button)

		fire('touchstart', jump_button, [t], [t])

		expect(spy).not.toHaveBeenCalled()
		dom.remove()
	})

	it('touchstart on jump button calls trigger_jump', () => {
		const spy = vi.spyOn(input, 'trigger_jump')
		const { container } = render_joystick()
		const jump_button = container.querySelector<HTMLButtonElement>(SEL_JUMP_BTN)

		expect(jump_button).toBeTruthy()
		if (!jump_button) return

		const t = make_touch(3, 300, 400, jump_button)

		fire('touchstart', jump_button, [t], [t])

		expect(spy).toHaveBeenCalledOnce()
	})

	it('touchstart on jump button calls trigger_jump even while look zone is dragging', () => {
		const spy = vi.spyOn(input, 'trigger_jump')
		const { container } = render_joystick()
		const look_zone = container.querySelectorAll(SEL_JOYSTICK_ZONE).item(1)
		const jump_button = container.querySelector<HTMLButtonElement>(SEL_JUMP_BTN)

		expect(look_zone).toBeTruthy()
		expect(jump_button).toBeTruthy()
		if (!jump_button) return

		const look_touch = make_touch(1, 300, 200, look_zone)

		fire('touchstart', look_zone, [look_touch], [look_touch])

		const jump_touch = make_touch(2, 300, 400, jump_button)

		fire('touchstart', jump_button, [jump_touch], [look_touch, jump_touch])

		expect(spy).toHaveBeenCalledOnce()
	})
})
