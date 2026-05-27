import { crt } from './Crt.svelte'

const FONT_RETRO = '/fonts/PressStart2P.ttf'
const FONT_ALT = '/fonts/Orbitron.ttf'
const FONT_FAMILY_RETRO = 'PressStart2P'
const FONT_FAMILY_ALT = 'Orbitron'
const RETRO_FONT_SIZE_MULTIPLIER = 0.8
const ALT_FONT_SIZE_MULTIPLIER = 1

function get_font(should_use_alt_font: boolean): string {
	return should_use_alt_font ? FONT_ALT : FONT_RETRO
}

function get_font_family(should_use_alt_font: boolean): string {
	return should_use_alt_font ? FONT_FAMILY_ALT : FONT_FAMILY_RETRO
}

function get_font_size_multiplier(should_use_alt_font: boolean): number {
	return should_use_alt_font ? ALT_FONT_SIZE_MULTIPLIER : RETRO_FONT_SIZE_MULTIPLIER
}

// CRT-aware variants: caller does not thread is_crt_enabled, avoiding wrong-axis bugs.
function get_active_font(): string {
	return get_font(!crt.is_crt_enabled)
}

function get_active_font_size_multiplier(): number {
	return get_font_size_multiplier(!crt.is_crt_enabled)
}

export const fonts = {
	get_font,
	get_font_family,
	get_font_size_multiplier,
	get_active_font,
	get_active_font_size_multiplier,
}
