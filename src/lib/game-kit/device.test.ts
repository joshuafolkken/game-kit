import { create_device } from '$lib/game-kit/Device.svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

const TOUCH_PRIMARY_QUERY = '(hover: none) and (pointer: coarse)'

type ChangeListener = (e: { matches: boolean }) => void

type MockMql = MediaQueryList & { _fire: (is_matching: boolean) => void }

function make_mock_mql(is_initial: boolean): MockMql {
	const listeners: Array<ChangeListener> = []

	return {
		matches: is_initial,
		addEventListener(_: string, function_: EventListenerOrEventListenerObject): void {
			listeners.push(function_ as unknown as ChangeListener)
		},
		removeEventListener(): void {
			/* no-op */
		},
		_fire(is_matching: boolean): void {
			for (const listener of listeners) listener({ matches: is_matching })
		},
	} as unknown as MediaQueryList & { _fire: (is_matching: boolean) => void }
}

describe('device', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('is_touch_primary is true when media query matches', () => {
		vi.stubGlobal('matchMedia', () => make_mock_mql(true))
		const device = create_device()

		expect(device.is_touch_primary).toBe(true)
	})

	it('is_touch_primary is false when media query does not match', () => {
		vi.stubGlobal('matchMedia', () => make_mock_mql(false))
		const device = create_device()

		expect(device.is_touch_primary).toBe(false)
	})

	it('uses the touch primary media query', () => {
		let received = ''

		vi.stubGlobal('matchMedia', (media_query: string) => {
			received = media_query

			return make_mock_mql(false)
		})
		create_device()
		expect(received).toBe(TOUCH_PRIMARY_QUERY)
	})

	it('updates is_touch_primary when media query changes to true', () => {
		const mql = make_mock_mql(false)

		vi.stubGlobal('matchMedia', () => mql)
		const device = create_device()

		expect(device.is_touch_primary).toBe(false)
		mql._fire(true)
		expect(device.is_touch_primary).toBe(true)
	})

	it('updates is_touch_primary when media query changes to false', () => {
		const mql = make_mock_mql(true)

		vi.stubGlobal('matchMedia', () => mql)
		const device = create_device()

		expect(device.is_touch_primary).toBe(true)
		mql._fire(false)
		expect(device.is_touch_primary).toBe(false)
	})

	it('defaults to false when matchMedia is unavailable', () => {
		vi.stubGlobal('matchMedia', undefined)
		const device = create_device()

		expect(device.is_touch_primary).toBe(false)
	})
})
