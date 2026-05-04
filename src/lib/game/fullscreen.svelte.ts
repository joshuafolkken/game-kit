import { create_listener_manager, type ListenerManager } from '$lib/game/listener-manager';

declare global {
	interface Element {
		webkitRequestFullscreen?: () => Promise<void> | void;
	}
	interface Document {
		webkitFullscreenElement?: Element | null;
		webkitExitFullscreen?: () => Promise<void> | void;
	}
}

type FullscreenState = { is_pseudo_fullscreen: boolean; is_native_fullscreen: boolean };

function get_native_fullscreen_element(): Element | null {
	return document.fullscreenElement ?? document.webkitFullscreenElement ?? null;
}

async function call_native_request(el: HTMLElement): Promise<boolean> {
	const fn = el.requestFullscreen ?? el.webkitRequestFullscreen;
	if (typeof fn !== 'function') return false;
	try {
		await fn.call(el);
		return true;
	} catch {
		return false;
	}
}

async function call_native_exit(): Promise<void> {
	const fn = document.exitFullscreen ?? document.webkitExitFullscreen;
	if (typeof fn !== 'function') return;
	try {
		await fn.call(document);
	} catch {
		/* ignore */
	}
}

function update_native_flag(s: FullscreenState): void {
	s.is_native_fullscreen = get_native_fullscreen_element() !== null;
	if (s.is_native_fullscreen) s.is_pseudo_fullscreen = false;
}

async function request_fullscreen(s: FullscreenState, el: HTMLElement): Promise<void> {
	if (s.is_native_fullscreen || s.is_pseudo_fullscreen) return;
	const did_succeed = await call_native_request(el);
	if (!did_succeed) s.is_pseudo_fullscreen = true;
}

async function exit_fullscreen(s: FullscreenState): Promise<void> {
	if (s.is_pseudo_fullscreen) {
		s.is_pseudo_fullscreen = false;
		return;
	}
	if (s.is_native_fullscreen) await call_native_exit();
}

export function create_fullscreen() {
	const s = $state<FullscreenState>({ is_pseudo_fullscreen: false, is_native_fullscreen: false });
	const handler = (): void => update_native_flag(s);
	let manager: ListenerManager | null = null;
	function setup_listeners(): () => void {
		const m = (manager ??= create_listener_manager([
			{ target: document, type: 'fullscreenchange', handler },
			{ target: document, type: 'webkitfullscreenchange', handler }
		]));
		update_native_flag(s);
		return m.setup((): void => {
			s.is_native_fullscreen = false;
			s.is_pseudo_fullscreen = false;
		});
	}
	return {
		get is_pseudo_fullscreen() {
			return s.is_pseudo_fullscreen;
		},
		get is_native_fullscreen() {
			return s.is_native_fullscreen;
		},
		get is_active() {
			return s.is_native_fullscreen || s.is_pseudo_fullscreen;
		},
		request: (el: HTMLElement): Promise<void> => request_fullscreen(s, el),
		exit: (): Promise<void> => exit_fullscreen(s),
		setup_listeners
	};
}

export type FullscreenInstance = ReturnType<typeof create_fullscreen>;

export const fullscreen = create_fullscreen();
