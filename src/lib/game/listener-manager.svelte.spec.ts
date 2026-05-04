import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { create_listener_manager, type ListenerSpec } from './listener-manager'

describe('create_listener_manager', () => {
	let target: EventTarget
	let spy: ReturnType<typeof vi.fn>
	let spec: ListenerSpec

	beforeEach(() => {
		target = document.createElement('div')
		spy = vi.fn()
		spec = { target, type: 'click', handler: spy as EventListener }
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('is_active is false before setup', () => {
		const manager = create_listener_manager([spec])
		expect(manager.is_active).toBe(false)
	})

	it('is_active is true after setup', () => {
		const manager = create_listener_manager([spec])
		manager.setup()
		expect(manager.is_active).toBe(true)
	})

	it('is_active is false after cleanup', () => {
		const manager = create_listener_manager([spec])
		const cleanup = manager.setup()
		cleanup()
		expect(manager.is_active).toBe(false)
	})

	it('setup registers the listener on the target', () => {
		const manager = create_listener_manager([spec])
		const add_spy = vi.spyOn(target, 'addEventListener')
		manager.setup()
		expect(add_spy).toHaveBeenCalledWith('click', spy, undefined)
	})

	it('cleanup removes the listener from the target', () => {
		const manager = create_listener_manager([spec])
		const remove_spy = vi.spyOn(target, 'removeEventListener')
		const cleanup = manager.setup()
		cleanup()
		expect(remove_spy).toHaveBeenCalledWith('click', spy, undefined)
	})

	it('listener is active after setup — target receives events', () => {
		const manager = create_listener_manager([spec])
		manager.setup()
		;(target as HTMLElement).dispatchEvent(new Event('click'))
		expect(spy).toHaveBeenCalledTimes(1)
	})

	it('listener is inactive after cleanup — target no longer receives events', () => {
		const manager = create_listener_manager([spec])
		const cleanup = manager.setup()
		cleanup()
		;(target as HTMLElement).dispatchEvent(new Event('click'))
		expect(spy).not.toHaveBeenCalled()
	})

	it('double setup returns the same cleanup function', () => {
		const manager = create_listener_manager([spec])
		const a = manager.setup()
		const b = manager.setup()
		expect(a).toBe(b)
	})

	it('double setup does not register listener twice', () => {
		const manager = create_listener_manager([spec])
		const add_spy = vi.spyOn(target, 'addEventListener')
		manager.setup()
		manager.setup()
		expect(add_spy).toHaveBeenCalledTimes(1)
	})

	it('on_cleanup callback is called when cleanup runs', () => {
		const on_cleanup = vi.fn()
		const manager = create_listener_manager([spec])
		const cleanup = manager.setup(on_cleanup)
		cleanup()
		expect(on_cleanup).toHaveBeenCalledTimes(1)
	})

	it('on_cleanup is not called if setup was never called', () => {
		const on_cleanup = vi.fn()
		const manager = create_listener_manager([spec])
		manager.setup(on_cleanup)
		expect(on_cleanup).not.toHaveBeenCalled()
	})

	it('setup with options passes options to addEventListener', () => {
		const capture_spec: ListenerSpec = {
			target,
			type: 'click',
			handler: spy as EventListener,
			options: { capture: true },
		}
		const manager = create_listener_manager([capture_spec])
		const add_spy = vi.spyOn(target, 'addEventListener')
		manager.setup()
		expect(add_spy).toHaveBeenCalledWith('click', spy, { capture: true })
	})

	it('setup handles multiple specs', () => {
		const spy2 = vi.fn()
		const spec2: ListenerSpec = { target, type: 'mousedown', handler: spy2 as EventListener }
		const manager = create_listener_manager([spec, spec2])
		const add_spy = vi.spyOn(target, 'addEventListener')
		manager.setup()
		expect(add_spy).toHaveBeenCalledTimes(2)
	})

	it('cleanup removes all specs', () => {
		const spy2 = vi.fn()
		const spec2: ListenerSpec = { target, type: 'mousedown', handler: spy2 as EventListener }
		const manager = create_listener_manager([spec, spec2])
		const remove_spy = vi.spyOn(target, 'removeEventListener')
		const cleanup = manager.setup()
		cleanup()
		expect(remove_spy).toHaveBeenCalledTimes(2)
	})

	it('can be set up again after cleanup', () => {
		const manager = create_listener_manager([spec])
		const cleanup = manager.setup()
		cleanup()
		const cleanup2 = manager.setup()
		expect(manager.is_active).toBe(true)
		cleanup2()
	})
})
