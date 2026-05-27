let context: AudioContext | null = null

function init_audio(): void {
	if (!context && typeof AudioContext !== 'undefined') {
		context = new AudioContext()
	}
}

function get_audio_context(): AudioContext | null {
	// eslint-disable-next-line promise/prefer-await-to-then -- fire-and-forget; making this async would require awaiting at every audio call site
	if (context?.state === 'suspended') void context.resume().catch(() => {})

	return context
}

export const audio = { init_audio, get_audio_context }
