import { create_listener_manager, type ListenerManager } from '$lib/game-kit/listener-manager'

declare global {
	interface Element {
		webkitRequestFullscreen?: () => Promise<void> | void
	}

	interface Document {
		webkitFullscreenElement?: Element | null
		webkitExitFullscreen?: () => Promise<void> | void
	}
}

interface FullscreenState {
	is_pseudo_fullscreen: boolean
	is_native_fullscreen: boolean
}

function get_native_fullscreen_element(): Element | null {
	return document.fullscreenElement ?? document.webkitFullscreenElement ?? null
}

async function call_native_request(element: HTMLElement): Promise<boolean> {
	const function_ =
		// eslint-disable-next-line @typescript-eslint/unbound-method, @typescript-eslint/no-unnecessary-condition -- .call(element) below binds `this`; webkit fallback is absent in lib.dom types but real on older Safari
		element.requestFullscreen ?? element.webkitRequestFullscreen
	if (typeof function_ !== 'function') return false

	try {
		await function_.call(element)

		return true
	} catch {
		return false
	}
}

async function call_native_exit(): Promise<void> {
	const function_ =
		// eslint-disable-next-line @typescript-eslint/unbound-method, @typescript-eslint/no-unnecessary-condition -- .call(document) below binds `this`; webkit fallback is absent in lib.dom types but real on older Safari
		document.exitFullscreen ?? document.webkitExitFullscreen
	if (typeof function_ !== 'function') return

	try {
		await function_.call(document)
	} catch {
		/* ignore */
	}
}

function update_native_flag(s: FullscreenState): void {
	s.is_native_fullscreen = get_native_fullscreen_element() !== null
	if (s.is_native_fullscreen) s.is_pseudo_fullscreen = false
}

async function request_fullscreen(s: FullscreenState, element: HTMLElement): Promise<void> {
	if (s.is_native_fullscreen || s.is_pseudo_fullscreen) return
	const did_succeed = await call_native_request(element)
	// eslint-disable-next-line require-atomic-updates -- `s.is_pseudo_fullscreen` is read once at entry, awaited, then assigned. There is no concurrent caller (single-user fullscreen state machine).
	if (!did_succeed) s.is_pseudo_fullscreen = true
}

async function exit_fullscreen(s: FullscreenState): Promise<void> {
	if (s.is_pseudo_fullscreen) {
		s.is_pseudo_fullscreen = false

		return
	}

	if (s.is_native_fullscreen) await call_native_exit()
}

interface FullscreenApi {
	readonly is_pseudo_fullscreen: boolean
	readonly is_native_fullscreen: boolean
	readonly is_active: boolean
	request: (element: HTMLElement) => Promise<void>
	exit: () => Promise<void>
	setup_listeners: () => () => void
}

export function create_fullscreen(): FullscreenApi {
	const s = $state<FullscreenState>({ is_pseudo_fullscreen: false, is_native_fullscreen: false })

	const handler = (): void => {
		update_native_flag(s)
	}

	let manager: ListenerManager | null = null

	function setup_listeners(): () => void {
		// eslint-disable-next-line no-multi-assign -- `(manager ??= ...)` is the idiomatic lazy-init pattern
		const m = (manager ??= create_listener_manager([
			{ target: document, type: 'fullscreenchange', handler },
			{ target: document, type: 'webkitfullscreenchange', handler },
		]))

		update_native_flag(s)

		return m.setup((): void => {
			s.is_native_fullscreen = false
			s.is_pseudo_fullscreen = false
		})
	}

	return {
		get is_pseudo_fullscreen() {
			return s.is_pseudo_fullscreen
		},
		get is_native_fullscreen() {
			return s.is_native_fullscreen
		},
		get is_active() {
			return s.is_native_fullscreen || s.is_pseudo_fullscreen
		},
		// eslint-disable-next-line @typescript-eslint/promise-function-async -- thin pass-through; async wrapper would add a needless microtask
		request: (element: HTMLElement): Promise<void> => request_fullscreen(s, element),
		// eslint-disable-next-line @typescript-eslint/promise-function-async -- thin pass-through; async wrapper would add a needless microtask
		exit: (): Promise<void> => exit_fullscreen(s),
		setup_listeners,
	}
}

export type FullscreenInstance = ReturnType<typeof create_fullscreen>

export const fullscreen = create_fullscreen()
