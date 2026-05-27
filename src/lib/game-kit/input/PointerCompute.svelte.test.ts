import { PerspectiveCamera, Raycaster, Vector2 } from 'three'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { make_pointer_compute } from './pointer-compute.js'

function make_context() {
	const v = new Vector2()
	const raycaster = new Raycaster()

	vi.spyOn(raycaster, 'setFromCamera')

	return {
		pointer: {
			current: v,
			update(function_: (p: Vector2) => Vector2) {
				function_(v)
			},
		},
		raycaster,
	}
}

function make_camera() {
	return { current: new PerspectiveCamera() }
}

function make_target(client_w: number, client_h: number, rect_left = 0, rect_top = 0): HTMLElement {
	const element = document.createElement('div')

	Object.defineProperty(element, 'clientWidth', { get: () => client_w })
	Object.defineProperty(element, 'clientHeight', { get: () => client_h })
	element.getBoundingClientRect = (): DOMRect => ({
		left: rect_left,
		top: rect_top,
		right: rect_left + client_w,
		bottom: rect_top + client_h,
		width: client_w,
		height: client_h,
		x: rect_left,
		y: rect_top,
		toJSON: () => ({}),
	})

	return element
}

function make_event(client_x: number, client_y: number, target: EventTarget | null): MouseEvent {
	return { clientX: client_x, clientY: client_y, target } as unknown as MouseEvent
}

const CENTER = 0
const WIDTH = 800
const HEIGHT = 600
const CENTERED_X = 400
const CENTERED_Y = 300
const SKIP_X = 100
const SKIP_Y = 100

describe('make_pointer_compute', () => {
	afterEach(() => vi.restoreAllMocks())

	it('normalizes clientX/Y by clientWidth/clientHeight when rect is at origin', () => {
		const camera = make_camera()
		const compute = make_pointer_compute(camera)
		const context = make_context()

		// (400/800)*2-1=0, -(300/600)*2+1=0
		compute(make_event(CENTERED_X, CENTERED_Y, make_target(WIDTH, HEIGHT)), context)

		expect(context.pointer.current.x).toBeCloseTo(CENTER)
		expect(context.pointer.current.y).toBeCloseTo(CENTER)
		// eslint-disable-next-line @typescript-eslint/unbound-method -- vitest spy assertion; the .toHaveBeenCalled matcher handles `this` correctly
		expect(context.raycaster.setFromCamera).toHaveBeenCalledWith(
			context.pointer.current,
			camera.current,
		)
	})

	it('subtracts rect.left/top from clientX/Y before normalizing', () => {
		const camera = make_camera()
		const compute = make_pointer_compute(camera)
		const context = make_context()

		// clientX=300, clientY=200 with rect.left=100, rect.top=50: offset=(200, 150) → NDC = (-0.5, 0.5)
		compute(make_event(300, 200, make_target(WIDTH, HEIGHT, 100, 50)), context)

		expect(context.pointer.current.x).toBeCloseTo(-0.5)
		expect(context.pointer.current.y).toBeCloseTo(0.5)
	})

	it('skips pointer update and raycasting when target has zero dimensions', () => {
		const camera = make_camera()
		const compute = make_pointer_compute(camera)
		const context = make_context()

		context.pointer.current.set(0.5, 0.5)

		compute(make_event(SKIP_X, SKIP_Y, make_target(0, 0)), context)

		expect(context.pointer.current.x).toBe(0.5)
		expect(context.pointer.current.y).toBe(0.5)
		// eslint-disable-next-line @typescript-eslint/unbound-method -- vitest spy assertion; the .toHaveBeenCalled matcher handles `this` correctly
		expect(context.raycaster.setFromCamera).not.toHaveBeenCalled()
	})

	it('skips pointer update and raycasting when target is null', () => {
		const camera = make_camera()
		const compute = make_pointer_compute(camera)
		const context = make_context()

		context.pointer.current.set(0.5, 0.5)

		compute(make_event(SKIP_X, SKIP_Y, null), context)

		expect(context.pointer.current.x).toBe(0.5)
		expect(context.pointer.current.y).toBe(0.5)
		// eslint-disable-next-line @typescript-eslint/unbound-method -- vitest spy assertion; the .toHaveBeenCalled matcher handles `this` correctly
		expect(context.raycaster.setFromCamera).not.toHaveBeenCalled()
	})
})
