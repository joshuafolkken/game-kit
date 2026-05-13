import { describe, expect, it } from 'vitest'
import { CREDITS_LINE_COUNT, CREDITS_TEXT } from './credits'

describe('credits', () => {
	describe('CREDITS_TEXT', () => {
		it('is a non-empty string', () => {
			expect(typeof CREDITS_TEXT).toBe('string')
			expect(CREDITS_TEXT.length).toBeGreaterThan(0)
		})

		it('includes core framework credits', () => {
			expect(CREDITS_TEXT).toContain('Svelte')
			expect(CREDITS_TEXT).toContain('Three.js')
			expect(CREDITS_TEXT).toContain('Threlte')
			expect(CREDITS_TEXT).toContain('TypeScript')
		})

		it('includes @joshuafolkken/kit credit', () => {
			expect(CREDITS_TEXT).toContain('@joshuafolkken/kit')
		})

		it('includes deployment platform credit', () => {
			expect(CREDITS_TEXT).toContain('Cloudflare')
		})

		it('includes font credits', () => {
			expect(CREDITS_TEXT).toContain('Press Start 2P')
			expect(CREDITS_TEXT).toContain('Orbitron')
		})

		it('includes font author credits', () => {
			expect(CREDITS_TEXT).toContain('Boisclair')
			expect(CREDITS_TEXT).toContain('McInerney')
		})

		it('includes font license', () => {
			expect(CREDITS_TEXT).toContain('SIL Open Font License')
		})

		it('includes game concept attribution', () => {
			expect(CREDITS_TEXT).toContain('Ralph H. Baer')
			expect(CREDITS_TEXT).toContain('Howard J. Morrison')
			expect(CREDITS_TEXT).toContain('Milton Bradley')
		})

		it('includes open source library credits', () => {
			expect(CREDITS_TEXT).toContain('mrdoob/three.js')
			expect(CREDITS_TEXT).toContain('microsoft/playwright')
		})

		it('includes testing and tooling section', () => {
			expect(CREDITS_TEXT).toContain('Vitest')
			expect(CREDITS_TEXT).toContain('Playwright')
			expect(CREDITS_TEXT).toContain('ESLint')
		})

		it('credits Claude Sonnet 4.6 as engineering staff', () => {
			expect(CREDITS_TEXT).toContain('Claude Sonnet 4.6')
		})

		it('ends with thank you message', () => {
			expect(CREDITS_TEXT).toContain('THANK YOU FOR PLAYING')
		})

		it('includes DRAGON-STUDIO sound effect credit', () => {
			expect(CREDITS_TEXT).toContain('Sound Effect by')
			expect(CREDITS_TEXT).toContain('DRAGON-STUDIO')
			expect(CREDITS_TEXT).toContain('from Pixabay')
		})

		it('includes sponsors section', () => {
			expect(CREDITS_TEXT).toContain('SPONSORS')
			expect(CREDITS_TEXT).toContain('Incognito')
		})

		it('section headers remain in ALL CAPS', () => {
			expect(CREDITS_TEXT).toContain('SPONSORS')
			expect(CREDITS_TEXT).toContain('GAME CONCEPT')
			expect(CREDITS_TEXT).toContain('BUILT WITH')
			expect(CREDITS_TEXT).toContain('FONTS')
			expect(CREDITS_TEXT).toContain('TESTING & TOOLING')
			expect(CREDITS_TEXT).toContain('OPEN SOURCE LIBRARIES')
		})

		it('includes the signature line', () => {
			expect(CREDITS_TEXT).toContain('A JOSHUA FOLKKEN GAME')
		})

		it('includes the STAFF section header', () => {
			expect(CREDITS_TEXT).toContain('STAFF')
		})

		it('includes Joshua Folkken creative roles', () => {
			expect(CREDITS_TEXT).toContain('CREATIVE DIRECTOR')
			expect(CREDITS_TEXT).toContain('GAME DIRECTOR')
			expect(CREDITS_TEXT).toContain('GAME DESIGNER')
			expect(CREDITS_TEXT).toContain('PRODUCER')
			expect(CREDITS_TEXT).toContain('WORLD ARCHITECT')
			expect(CREDITS_TEXT).toContain('ART DIRECTOR')
			expect(CREDITS_TEXT).toContain('SOUND DIRECTOR')
			expect(CREDITS_TEXT).toContain('EXPERIENCE DESIGNER')
		})

		it('includes Claude Sonnet engineering roles', () => {
			expect(CREDITS_TEXT).toContain('TECHNOLOGY DIRECTOR')
			expect(CREDITS_TEXT).toContain('LEAD PROGRAMMER')
			expect(CREDITS_TEXT).toContain('SYSTEMS ARCHITECT')
			expect(CREDITS_TEXT).toContain('ENGINE PROGRAMMER')
			expect(CREDITS_TEXT).toContain('UI PROGRAMMER')
			expect(CREDITS_TEXT).toContain('AUDIO PROGRAMMER')
			expect(CREDITS_TEXT).toContain('TEST ENGINEER')
			expect(CREDITS_TEXT).toContain('QA ENGINEER')
			expect(CREDITS_TEXT).toContain('REFACTORING LEAD')
			expect(CREDITS_TEXT).toContain('CODE REVIEWER')
			expect(CREDITS_TEXT).toContain('BUILD ENGINEER')
		})

		it('includes Joshua Folkken as a credited person', () => {
			expect(CREDITS_TEXT).toContain('Joshua Folkken')
		})

		it('includes the directed-by and engineered-by end card', () => {
			expect(CREDITS_TEXT).toContain('DIRECTED BY')
			expect(CREDITS_TEXT).toContain('ENGINEERED BY')
		})
	})

	describe('CREDITS_LINE_COUNT', () => {
		it('is a positive integer', () => {
			expect(Number.isInteger(CREDITS_LINE_COUNT)).toBe(true)
			expect(CREDITS_LINE_COUNT).toBeGreaterThan(0)
		})

		it('matches the number of newlines in CREDITS_TEXT plus one', () => {
			const line_count_from_text = CREDITS_TEXT.split('\n').length
			expect(CREDITS_LINE_COUNT).toBe(line_count_from_text)
		})
	})
})
