import { game_state } from '$lib/game-kit/State.svelte'
import { game_audio } from './audio'
import type { ButtonColor } from './types'

export const FLASH_BURST_ON_MS = 30
export const FLASH_BURST_OFF_MS = 20
export const FLASH_BURST_CYCLES = 4
export const FLASH_CASCADE_FWD_MS = 65
export const FLASH_CASCADE_REV_MS = 40
export const FLASH_FINALE_MS = 320

const FLASH_INTENSITY_BURST = 2.5
const FLASH_INTENSITY_FINALE = 4
const FLASH_INTENSITY_RESET = 1

export interface FlashState {
	flash_colors: Array<ButtonColor>
	flash_intensity: number
}

export interface FlashTimers {
	flash_gen: number
}

async function delay(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms))
}

function play_all_tones(colors: ReadonlyArray<ButtonColor>, duration_ms: number): void {
	const { is_alt } = game_state
	for (const color of colors) game_audio.play_tone(color, duration_ms, is_alt)
}

export function cancel_flash(s: FlashState, t: FlashTimers): void {
	t.flash_gen += 1
	s.flash_colors = []
	s.flash_intensity = FLASH_INTENSITY_RESET
}

async function flash_burst(
	s: FlashState,
	t: FlashTimers,
	colors: ReadonlyArray<ButtonColor>,
	gen: number,
): Promise<void> {
	for (let index = 0; index < FLASH_BURST_CYCLES; index++) {
		if (t.flash_gen !== gen) return
		s.flash_colors = [...colors]
		s.flash_intensity = FLASH_INTENSITY_BURST
		play_all_tones(colors, FLASH_BURST_ON_MS)
		await delay(FLASH_BURST_ON_MS)
		if (t.flash_gen !== gen) return
		s.flash_colors = []
		s.flash_intensity = FLASH_INTENSITY_RESET
		await delay(FLASH_BURST_OFF_MS)
	}
}

async function flash_cascade(
	s: FlashState,
	t: FlashTimers,
	colors: ReadonlyArray<ButtonColor>,
	gen: number,
): Promise<void> {
	for (const color of colors) {
		if (t.flash_gen !== gen) return
		s.flash_colors = [color]
		s.flash_intensity = FLASH_INTENSITY_BURST
		game_audio.play_tone(color, FLASH_CASCADE_FWD_MS, game_state.is_alt)
		await delay(FLASH_CASCADE_FWD_MS)
	}

	for (const color of [...colors].reverse()) {
		if (t.flash_gen !== gen) return
		s.flash_colors = [color]
		s.flash_intensity = FLASH_INTENSITY_BURST
		game_audio.play_tone(color, FLASH_CASCADE_REV_MS, game_state.is_alt)
		await delay(FLASH_CASCADE_REV_MS)
	}
}

async function flash_finale(
	s: FlashState,
	t: FlashTimers,
	colors: ReadonlyArray<ButtonColor>,
	gen: number,
): Promise<void> {
	if (t.flash_gen !== gen) return
	s.flash_colors = [...colors]
	s.flash_intensity = FLASH_INTENSITY_FINALE
	play_all_tones(colors, FLASH_FINALE_MS)
	await delay(FLASH_FINALE_MS)
	if (t.flash_gen !== gen) return
	s.flash_colors = []
	s.flash_intensity = FLASH_INTENSITY_RESET
}

export async function run_victory_flash(
	s: FlashState,
	t: FlashTimers,
	colors: ReadonlyArray<ButtonColor>,
	gen: number,
): Promise<void> {
	await flash_burst(s, t, colors, gen)
	await flash_cascade(s, t, colors, gen)
	await flash_finale(s, t, colors, gen)
}
