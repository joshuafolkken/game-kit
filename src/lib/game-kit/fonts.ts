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

export const fonts = {
	get_font,
	get_font_family,
	get_font_size_multiplier,
}
