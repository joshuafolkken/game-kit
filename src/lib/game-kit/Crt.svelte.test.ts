import { beforeEach, describe, expect, it } from 'vitest'
import { create_crt, crt } from './Crt.svelte'

it('starts with CRT enabled', () => {
	expect(crt.is_crt_enabled).toBe(true)
})

describe('crt', () => {
	beforeEach(() => {
		if (!crt.is_crt_enabled) crt.toggle()
	})

	it('toggle disables CRT when enabled', () => {
		crt.toggle()
		expect(crt.is_crt_enabled).toBe(false)
	})

	it('toggle re-enables CRT when disabled', () => {
		crt.toggle()
		crt.toggle()
		expect(crt.is_crt_enabled).toBe(true)
	})

	it('toggle alternates state on each call', () => {
		crt.toggle()
		expect(crt.is_crt_enabled).toBe(false)
		crt.toggle()
		expect(crt.is_crt_enabled).toBe(true)
		crt.toggle()
		expect(crt.is_crt_enabled).toBe(false)
	})
})

describe('create_crt isolation', () => {
	it('two instances do not share is_crt_enabled state', () => {
		const a = create_crt()
		const b = create_crt()

		a.toggle()
		expect(a.is_crt_enabled).toBe(false)
		expect(b.is_crt_enabled).toBe(true)
	})
})
