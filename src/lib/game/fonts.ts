const FONT_RETRO = '/fonts/PressStart2P.ttf';
const FONT_ALT = '/fonts/Orbitron.ttf';
const FONT_FAMILY_RETRO = 'PressStart2P';
const FONT_FAMILY_ALT = 'Orbitron';
const RETRO_FONT_SIZE_MULTIPLIER = 0.8;
const ALT_FONT_SIZE_MULTIPLIER = 1;

function get_font(is_alt: boolean): string {
	return is_alt ? FONT_ALT : FONT_RETRO;
}

function get_font_family(is_alt: boolean): string {
	return is_alt ? FONT_FAMILY_ALT : FONT_FAMILY_RETRO;
}

function get_font_size_multiplier(is_alt: boolean): number {
	return is_alt ? ALT_FONT_SIZE_MULTIPLIER : RETRO_FONT_SIZE_MULTIPLIER;
}

export const fonts = {
	get_font,
	get_font_family,
	get_font_size_multiplier
};
