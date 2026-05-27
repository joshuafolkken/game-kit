import { create_fullscreen, fullscreen } from '$lib/game-kit/fullscreen.svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('fullscreen', () => {
	// eslint-disable-next-line init-declarations -- assigned by beforeEach
	let cleanup: () => void
	// eslint-disable-next-line init-declarations -- assigned by beforeEach
	let element: HTMLElement

	beforeEach(() => {
		cleanup = fullscreen.setup_listeners()
		element = document.createElement('div')
		document.body.append(element)
	})

	afterEach(() => {
		cleanup()
		element.remove()
		vi.restoreAllMocks()
	})

	it('starts not in fullscreen', () => {
		expect(fullscreen.is_active).toBe(false)
		expect(fullscreen.is_pseudo_fullscreen).toBe(false)
		expect(fullscreen.is_native_fullscreen).toBe(false)
	})

	it('uses native requestFullscreen when available', async () => {
		const spy = vi.spyOn(element, 'requestFullscreen').mockResolvedValue()

		await fullscreen.request(element)
		expect(spy).toHaveBeenCalledTimes(1)
		expect(fullscreen.is_pseudo_fullscreen).toBe(false)
	})

	it('falls back to pseudo fullscreen when native API is unavailable', async () => {
		Object.defineProperty(element, 'requestFullscreen', { value: undefined, configurable: true })
		Object.defineProperty(element, 'webkitRequestFullscreen', {
			value: undefined,
			configurable: true,
		})
		await fullscreen.request(element)
		expect(fullscreen.is_pseudo_fullscreen).toBe(true)
		expect(fullscreen.is_active).toBe(true)
	})

	it('falls back to pseudo fullscreen when native API rejects', async () => {
		vi.spyOn(element, 'requestFullscreen').mockRejectedValue(new Error('no user gesture'))
		await fullscreen.request(element)
		expect(fullscreen.is_pseudo_fullscreen).toBe(true)
	})

	it('skips re-requesting when already in pseudo fullscreen', async () => {
		Object.defineProperty(element, 'requestFullscreen', { value: undefined, configurable: true })
		Object.defineProperty(element, 'webkitRequestFullscreen', {
			value: undefined,
			configurable: true,
		})
		await fullscreen.request(element)
		expect(fullscreen.is_pseudo_fullscreen).toBe(true)

		const spy = vi.fn().mockResolvedValue(undefined)

		Object.defineProperty(element, 'requestFullscreen', { value: spy, configurable: true })
		await fullscreen.request(element)
		expect(spy).not.toHaveBeenCalled()
	})

	it('exit clears pseudo fullscreen', async () => {
		Object.defineProperty(element, 'requestFullscreen', { value: undefined, configurable: true })
		Object.defineProperty(element, 'webkitRequestFullscreen', {
			value: undefined,
			configurable: true,
		})
		await fullscreen.request(element)
		expect(fullscreen.is_pseudo_fullscreen).toBe(true)
		await fullscreen.exit()
		expect(fullscreen.is_pseudo_fullscreen).toBe(false)
		expect(fullscreen.is_active).toBe(false)
	})

	it('initializes is_native_fullscreen from current document state on setup', () => {
		cleanup()
		const fake_element = document.createElement('section')
		const original_descriptor = Object.getOwnPropertyDescriptor(
			Document.prototype,
			'fullscreenElement',
		)

		Object.defineProperty(document, 'fullscreenElement', {
			get: () => fake_element,
			configurable: true,
		})

		try {
			cleanup = fullscreen.setup_listeners()
			expect(fullscreen.is_native_fullscreen).toBe(true)
		} finally {
			if (original_descriptor) {
				Object.defineProperty(document, 'fullscreenElement', original_descriptor)
			} else {
				Reflect.deleteProperty(document, 'fullscreenElement')
			}
		}
	})

	it('falls back to webkitRequestFullscreen when standard API is missing', async () => {
		Object.defineProperty(element, 'requestFullscreen', { value: undefined, configurable: true })
		const webkit_spy = vi.fn().mockResolvedValue(undefined)

		Object.defineProperty(element, 'webkitRequestFullscreen', {
			value: webkit_spy,
			configurable: true,
		})
		await fullscreen.request(element)
		expect(webkit_spy).toHaveBeenCalledTimes(1)
		expect(fullscreen.is_pseudo_fullscreen).toBe(false)
	})
})

describe('create_fullscreen isolation', () => {
	it('two instances do not share is_pseudo_fullscreen state', async () => {
		const a = create_fullscreen()
		const b = create_fullscreen()
		const element = document.createElement('div')

		Object.defineProperty(element, 'requestFullscreen', { value: undefined, configurable: true })
		Object.defineProperty(element, 'webkitRequestFullscreen', {
			value: undefined,
			configurable: true,
		})
		await a.request(element)
		expect(a.is_pseudo_fullscreen).toBe(true)
		expect(b.is_pseudo_fullscreen).toBe(false)
	})
})
