import { beforeEach, describe, expect, it, vi } from 'vitest'
import { route_command } from './gk.ts'

vi.mock('./gk-init.ts', () => ({ gk_init: { run: vi.fn(), generate_package_json: vi.fn() } }))
vi.mock('./gk-sync.ts', () => ({ gk_sync: { run: vi.fn() } }))

describe('route_command', () => {
	beforeEach(() => {
		vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit called')
		})
		vi.spyOn(console, 'error').mockImplementation(() => {})
	})

	it('routes init to gk_init.run', async () => {
		const { gk_init } = await import('./gk-init.ts')
		route_command('init')
		expect(gk_init.run).toHaveBeenCalledOnce()
	})

	it('routes sync to gk_sync.run', async () => {
		const { gk_sync } = await import('./gk-sync.ts')
		route_command('sync')
		expect(gk_sync.run).toHaveBeenCalledOnce()
	})

	it('exits with code 1 for unknown command', () => {
		expect(() => route_command('unknown')).toThrow('process.exit called')
		expect(process.exit).toHaveBeenCalledWith(1)
	})

	it('exits with code 1 when no command given', () => {
		expect(() => route_command(undefined)).toThrow('process.exit called')
		expect(process.exit).toHaveBeenCalledWith(1)
	})
})
