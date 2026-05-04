import { afterEach, describe, expect, it, vi } from 'vitest'
import { joystick_dispatch } from './joystick-dispatch'

vi.mock('$lib/game/override-event-offset', () => ({ override_event_offset: vi.fn() }))

const POINTER_ID = 3
const IS_PRIMARY = true
const CLIENT_X = 150
const CLIENT_Y = 250
const RECT_LEFT = 100
const RECT_TOP = 200

class FakeEvent {
	type: string
	constructor(type: string) {
		this.type = type
	}
}

function make_fake_dom(): { dom: HTMLElement; dispatched: string[] } {
	const dispatched: string[] = []
	const dom = {
		getBoundingClientRect: () => ({ left: RECT_LEFT, top: RECT_TOP }),
		dispatchEvent: (e: FakeEvent) => {
			dispatched.push(e.type)
			return true
		},
	} as unknown as HTMLElement
	return { dom, dispatched }
}

function stub_document(parent: HTMLElement | null): void {
	const canvas = parent ? { parentElement: parent } : null
	vi.stubGlobal('document', { querySelector: () => canvas })
}

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('dispatch_pointer_down', () => {
	it('does nothing when no canvas found', () => {
		stub_document(null)
		const { dispatched } = make_fake_dom()
		joystick_dispatch.dispatch_pointer_down(POINTER_ID, IS_PRIMARY, CLIENT_X, CLIENT_Y)
		expect(dispatched).toHaveLength(0)
	})

	it('dispatches pointermove then pointerdown', () => {
		vi.stubGlobal('PointerEvent', FakeEvent)
		const { dom, dispatched } = make_fake_dom()
		stub_document(dom)
		joystick_dispatch.dispatch_pointer_down(POINTER_ID, IS_PRIMARY, CLIENT_X, CLIENT_Y)
		expect(dispatched).toEqual(['pointermove', 'pointerdown'])
	})
})

describe('dispatch_pointer_up', () => {
	it('does nothing when no canvas found', () => {
		stub_document(null)
		const { dispatched } = make_fake_dom()
		joystick_dispatch.dispatch_pointer_up(POINTER_ID, IS_PRIMARY, CLIENT_X, CLIENT_Y)
		expect(dispatched).toHaveLength(0)
	})

	it('dispatches pointerup, click, then pointerleave', () => {
		vi.stubGlobal('PointerEvent', FakeEvent)
		vi.stubGlobal('MouseEvent', FakeEvent)
		const { dom, dispatched } = make_fake_dom()
		stub_document(dom)
		joystick_dispatch.dispatch_pointer_up(POINTER_ID, IS_PRIMARY, CLIENT_X, CLIENT_Y)
		expect(dispatched).toEqual(['pointerup', 'click', 'pointerleave'])
	})

	it('does not dispatch click when is_tap=false (drag scenario)', () => {
		vi.stubGlobal('PointerEvent', FakeEvent)
		vi.stubGlobal('MouseEvent', FakeEvent)
		const { dom, dispatched } = make_fake_dom()
		stub_document(dom)
		joystick_dispatch.dispatch_pointer_up(POINTER_ID, IS_PRIMARY, CLIENT_X, CLIENT_Y, false)
		expect(dispatched).toEqual(['pointerup', 'pointerleave'])
	})
})

describe('dispatch_pointer_cancel', () => {
	it('does nothing when no canvas found', () => {
		stub_document(null)
		const { dispatched } = make_fake_dom()
		joystick_dispatch.dispatch_pointer_cancel(POINTER_ID, IS_PRIMARY, CLIENT_X, CLIENT_Y)
		expect(dispatched).toHaveLength(0)
	})

	it('dispatches pointerup then pointerleave', () => {
		vi.stubGlobal('PointerEvent', FakeEvent)
		const { dom, dispatched } = make_fake_dom()
		stub_document(dom)
		joystick_dispatch.dispatch_pointer_cancel(POINTER_ID, IS_PRIMARY, CLIENT_X, CLIENT_Y)
		expect(dispatched).toEqual(['pointerup', 'pointerleave'])
	})
})
