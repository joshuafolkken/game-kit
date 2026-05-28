import { beforeEach, describe, expect, it } from 'vitest'
import { create_session, session } from './Session.svelte'

describe('session', () => {
	beforeEach(() => {
		session.reset_session()
	})

	it('starts as not-started', () => {
		expect(session.is_session_started).toBe(false)
	})

	it('flips to started on start_session', () => {
		session.start_session()
		expect(session.is_session_started).toBe(true)
	})

	it('start_session is idempotent', () => {
		session.start_session()
		session.start_session()
		expect(session.is_session_started).toBe(true)
	})

	it('reset_session returns to not-started', () => {
		session.start_session()
		session.reset_session()
		expect(session.is_session_started).toBe(false)
	})
})

describe('create_session isolation', () => {
	it('two instances do not share is_session_started state', () => {
		const instance_a = create_session()
		const instance_b = create_session()

		instance_a.start_session()
		expect(instance_a.is_session_started).toBe(true)
		expect(instance_b.is_session_started).toBe(false)
	})
})
