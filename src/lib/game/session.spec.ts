import { describe, it, expect, beforeEach } from 'vitest';
import { session, create_session } from './session.svelte';

describe('session', () => {
	beforeEach(() => {
		session.reset_session();
	});

	it('starts as not-started', () => {
		expect(session.is_session_started).toBe(false);
	});

	it('flips to started on start_session', () => {
		session.start_session();
		expect(session.is_session_started).toBe(true);
	});

	it('start_session is idempotent', () => {
		session.start_session();
		session.start_session();
		expect(session.is_session_started).toBe(true);
	});

	it('reset_session returns to not-started', () => {
		session.start_session();
		session.reset_session();
		expect(session.is_session_started).toBe(false);
	});
});

describe('create_session isolation', () => {
	it('two instances do not share is_session_started state', () => {
		const a = create_session();
		const b = create_session();
		a.start_session();
		expect(a.is_session_started).toBe(true);
		expect(b.is_session_started).toBe(false);
	});
});
