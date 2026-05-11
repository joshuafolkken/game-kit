let ctx: AudioContext | null = null

function init_audio(): void {
	if (!ctx && typeof AudioContext !== 'undefined') {
		ctx = new AudioContext()
	}
}

function get_audio_context(): AudioContext | null {
	if (ctx?.state === 'suspended') void ctx.resume().catch(() => {})
	return ctx
}

export const audio = { init_audio, get_audio_context }
