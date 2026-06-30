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

describe('set_enabled — pick the initial CRT mode without toggling (game-kit#375)', () => {
	beforeEach(() => {
		if (!crt.is_crt_enabled) crt.toggle()
	})

	it('disables CRT when set to false from the enabled default', () => {
		crt.set_enabled(false)
		expect(crt.is_crt_enabled).toBe(false)
		crt.set_enabled(true)
	})

	it('re-enables CRT when set to true', () => {
		crt.set_enabled(false)
		crt.set_enabled(true)
		expect(crt.is_crt_enabled).toBe(true)
	})

	it('is idempotent — setting the same value twice keeps the state', () => {
		crt.set_enabled(false)
		crt.set_enabled(false)
		expect(crt.is_crt_enabled).toBe(false)
		crt.set_enabled(true)
	})
})

describe('create_crt isolation', () => {
	it('two instances do not share is_crt_enabled state', () => {
		const instance_a = create_crt()
		const instance_b = create_crt()

		instance_a.toggle()
		expect(instance_a.is_crt_enabled).toBe(false)
		expect(instance_b.is_crt_enabled).toBe(true)
	})

	it('set_enabled on one instance does not affect the other', () => {
		const instance_a = create_crt()
		const instance_b = create_crt()

		instance_a.set_enabled(false)
		expect(instance_a.is_crt_enabled).toBe(false)
		expect(instance_b.is_crt_enabled).toBe(true)
	})
})
