let click_url = '';
let click_sound: HTMLAudioElement | null = null;

function init(url: string): void {
	click_url = url;
	click_sound = null;
}

function play_switch_click(): void {
	if (!click_url) return;
	if (typeof Audio === 'undefined') return;
	if (!click_sound) click_sound = new Audio(click_url);
	click_sound.currentTime = 0;
	void click_sound.play();
}

export const switch_audio = { init, play_switch_click };
