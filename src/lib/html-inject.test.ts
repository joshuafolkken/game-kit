import { describe, expect, it } from 'vitest'
import { html_inject } from './html-inject'

const HTML_NO_PLACEHOLDER = '<p>no placeholder here</p>'
const VERSION_WITH_DOLLAR = '1.0.0-$beta'
const PLAIN_DISPLAY_NAME = 'Joshua Game'

describe('html_inject.inject_version', () => {
	it('replaces the placeholder with the given version', () => {
		expect(
			html_inject.inject_version('<p class="game-version">v__APP_VERSION__</p>', '1.2.3'),
		).toBe('<p class="game-version">v1.2.3</p>')
	})

	it('replaces all occurrences of the placeholder', () => {
		expect(html_inject.inject_version('__APP_VERSION__ and __APP_VERSION__', '9.9.9')).toBe(
			'9.9.9 and 9.9.9',
		)
	})

	it('inserts a $-containing version verbatim via the function replacer', () => {
		expect(html_inject.inject_version('__APP_VERSION__', VERSION_WITH_DOLLAR)).toBe(
			VERSION_WITH_DOLLAR,
		)
	})

	it('passes through html that has no placeholder', () => {
		expect(html_inject.inject_version(HTML_NO_PLACEHOLDER, '1.0.0')).toBe(HTML_NO_PLACEHOLDER)
	})
})

describe('html_inject.inject_game_name', () => {
	it('replaces __GAME_NAME__ with the all-caps game name', () => {
		expect(html_inject.inject_game_name('<p class="game-title">__GAME_NAME__</p>')).toBe(
			'<p class="game-title">JOSHUA GAME</p>',
		)
	})

	it('replaces __GAME_NAME_DISPLAY__ with the title-case game name', () => {
		expect(html_inject.inject_game_name('<title>__GAME_NAME_DISPLAY__</title>')).toBe(
			'<title>Joshua Game</title>',
		)
	})

	it('replaces __GAME_NAME_DISPLAY__ before __GAME_NAME__ to avoid partial match', () => {
		expect(html_inject.inject_game_name('__GAME_NAME_DISPLAY__ and __GAME_NAME__')).toBe(
			'Joshua Game and JOSHUA GAME',
		)
	})

	it('passes through html with no placeholders', () => {
		expect(html_inject.inject_game_name(HTML_NO_PLACEHOLDER)).toBe(HTML_NO_PLACEHOLDER)
	})
})

describe('html_inject.html_escape', () => {
	it('escapes HTML special characters', () => {
		expect(html_inject.html_escape(`<a href="x">A&'B</a>`)).toBe(
			'&lt;a href=&quot;x&quot;&gt;A&amp;&#039;B&lt;/a&gt;',
		)
	})

	it('passes through a string with no special characters', () => {
		expect(html_inject.html_escape(PLAIN_DISPLAY_NAME)).toBe(PLAIN_DISPLAY_NAME)
	})
})
