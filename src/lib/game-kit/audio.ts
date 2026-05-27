let context: AudioContext | null = null

function init_audio(): void {
	if (!context && typeof AudioContext !== 'undefined') {
		context = new AudioContext()
	}
}

function get_audio_context(): AudioContext | null {
	if (context?.state === 'suspended') void context.resume().catch(() => {})

	return context
}

export const audio = { init_audio, get_audio_context }
