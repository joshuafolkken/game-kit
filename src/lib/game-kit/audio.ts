let context: AudioContext | null = null

function init_audio(): void {
	if (!context && typeof AudioContext !== 'undefined') {
		context = new AudioContext()
	}
}

function get_audio_context(): AudioContext | null {
	if (context?.state === 'suspended') {
		// eslint-disable-next-line promise/prefer-await-to-then -- fire-and-forget; awaiting would force every audio call site async
		void context.resume().catch(() => {
			/* no-op */
		})
	}

	return context
}

export const audio = { init_audio, get_audio_context }
