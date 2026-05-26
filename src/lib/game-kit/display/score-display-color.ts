import {
	CYBER_NEW_HIGH_COLOR,
	HI_BASE_COLOR,
	RETRO_NEW_HIGH_COLOR,
} from '$lib/game-kit/display/score-display-config'

function get_hi_value_color(is_alt: boolean, is_new_high_score: boolean): string {
	if (!is_new_high_score) return HI_BASE_COLOR

	return is_alt ? CYBER_NEW_HIGH_COLOR : RETRO_NEW_HIGH_COLOR
}

export { get_hi_value_color }
