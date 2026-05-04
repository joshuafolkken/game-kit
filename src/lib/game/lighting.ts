const AMBIENT_INTENSITY = 1.5;
const ALT_AMBIENT_INTENSITY = 2.5;
const POINT_LIGHT_INTENSITY = 20;
const ALT_POINT_LIGHT_INTENSITY = 35;
const AMBIENT_COLOR_NORMAL = '#ffffff';
const AMBIENT_COLOR_ALT = '#6060ff';

function get_ambient_intensity(is_alt: boolean): number {
	return is_alt ? ALT_AMBIENT_INTENSITY : AMBIENT_INTENSITY;
}

function get_point_light_intensity(is_alt: boolean): number {
	return is_alt ? ALT_POINT_LIGHT_INTENSITY : POINT_LIGHT_INTENSITY;
}

function get_ambient_color(is_alt: boolean): string {
	return is_alt ? AMBIENT_COLOR_ALT : AMBIENT_COLOR_NORMAL;
}

export const lighting = {
	get_ambient_intensity,
	get_point_light_intensity,
	get_ambient_color
};
