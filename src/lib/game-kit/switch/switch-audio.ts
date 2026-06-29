interface SwitchAudioApi {
	init: (url: string) => void
	play_switch_click: () => void
}

// Click-sound state is encapsulated in the factory closure (not module-level bindings) so the
// lazy `new Audio(url)` assignment lives inside the returned functions — the same pattern as
// create_game_state in State.svelte.ts. The Audio element is created lazily on first play
// because it cannot be constructed before the click URL is known.
function create_switch_audio(): SwitchAudioApi {
	let click_url = ''
	let click_sound: HTMLAudioElement | null = null

	function init(url: string): void {
		click_url = url
		click_sound = null
	}

	function play_switch_click(): void {
		if (!click_url) return
		if (typeof Audio === 'undefined') return
		click_sound ??= new Audio(click_url)
		click_sound.currentTime = 0
		void click_sound.play()
	}

	return { init, play_switch_click }
}

const switch_audio = create_switch_audio()

export { create_switch_audio, switch_audio }
