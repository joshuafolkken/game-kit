interface AudioApi {
	init_audio: () => void
	get_audio_context: () => AudioContext | null
}

// The AudioContext singleton is encapsulated in the factory closure (not a module-level
// binding) so its lazy assignment lives inside the returned functions — the same pattern as
// create_game_state in State.svelte.ts. An AudioContext cannot be constructed at module load
// under the browser autoplay policy, so init is deferred to the first user gesture.
function create_audio(): AudioApi {
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

	return { init_audio, get_audio_context }
}

const audio = create_audio()

export { create_audio, audio }
