import { describe, expect, it } from 'vitest'
import { should_use_antialias } from './antialias'

describe('should_use_antialias — enabled on non-touch (desktop) devices', () => {
	it('returns true on desktop (non-touch) so PC players get smooth edges when RETRO is off', () => {
		// Reason: AA is fixed at WebGL context creation. We keep it on for desktop regardless of
		// RETRO state because the CRT post-process (dither + barrel) overwrites the framebuffer
		// with low-res pixels when RETRO is on, so the always-on AA has no visible effect there.
		// Crucially, this avoids a Canvas remount when toggling RETRO, which would reset the
		// player position.
		expect(should_use_antialias(false)).toBe(true)
	})

	it('returns false on touch-primary devices to save mobile GPU cost', () => {
		expect(should_use_antialias(true)).toBe(false)
	})
})
