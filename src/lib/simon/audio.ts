import { audio as game_audio } from '$lib/game/audio'
import type { ButtonColor } from './types'

const FREQ: Record<ButtonColor, number> = { green: 415, red: 310, yellow: 252, blue: 209 }
const CYBER_FREQ: Record<ButtonColor, number> = { green: 880, red: 698, yellow: 587, blue: 523 }
const ERROR_FREQ = 180
const MS_PER_SECOND = 1000
const GAIN_VALUE = 0.5
const GAIN_FLOOR = 0.001
const NORMAL_WAVE: OscillatorType = 'sine'
const CYBER_WAVE: OscillatorType = 'square'

let active_osc: OscillatorNode | null = null

type OscGraph = { osc: OscillatorNode; gain: GainNode; ctx: AudioContext }

function create_osc_graph(freq: number, is_alt: boolean): OscGraph | null {
	game_audio.init_audio()
	const ctx = game_audio.get_audio_context()
	if (!ctx) return null
	const osc = ctx.createOscillator()
	const gain = ctx.createGain()
	osc.connect(gain)
	gain.connect(ctx.destination)
	osc.frequency.setValueAtTime(freq, ctx.currentTime)
	osc.type = is_alt ? CYBER_WAVE : NORMAL_WAVE
	gain.gain.setValueAtTime(GAIN_VALUE, ctx.currentTime)
	return { osc, gain, ctx }
}

function stop_tone(): void {
	if (!active_osc) return
	try {
		active_osc.stop()
	} catch {
		// already stopped
	}
	active_osc = null
}

function start_tone_raw(freq: number, is_alt: boolean): void {
	stop_tone()
	const nodes = create_osc_graph(freq, is_alt)
	if (!nodes) return
	nodes.osc.start(nodes.ctx.currentTime)
	active_osc = nodes.osc
}

function play_raw_tone(freq: number, duration_ms: number, is_alt: boolean): void {
	const nodes = create_osc_graph(freq, is_alt)
	if (!nodes) return
	const { osc, gain, ctx } = nodes
	const duration_s = duration_ms / MS_PER_SECOND
	if (is_alt) gain.gain.exponentialRampToValueAtTime(GAIN_FLOOR, ctx.currentTime + duration_s)
	osc.start(ctx.currentTime)
	osc.stop(ctx.currentTime + duration_s)
}

function start_tone(color: ButtonColor, is_alt: boolean): void {
	start_tone_raw(is_alt ? CYBER_FREQ[color] : FREQ[color], is_alt)
}

function play_tone(color: ButtonColor, duration_ms: number, is_alt: boolean): void {
	play_raw_tone(is_alt ? CYBER_FREQ[color] : FREQ[color], duration_ms, is_alt)
}

function play_error_tone(duration_ms: number, is_alt: boolean): void {
	play_raw_tone(ERROR_FREQ, duration_ms, is_alt)
}

export const simon_audio = {
	play_tone,
	play_error_tone,
	start_tone,
	stop_tone,
	ERROR_FREQ,
}
