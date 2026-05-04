export const MIN_DISPLAY_MS = 3000
export const OVERLAY_ELEMENT_ID = 'static-loading-overlay'
export const OVERLAY_HIDDEN_CLASS = 'is-hidden'
export const OBSERVER_GLOBAL_KEY = '__loading_observer'

const READY_PROGRESS = '100%'
const INITIAL_PROGRESS = '0%'
const READY_PROGRESS_VALUE = 100

interface LoadingObserver {
	disconnect(): void
}

type LoadingState<T extends string> = {
	is_visible: boolean
	current_step: T
	status_text: string
	progress: string
	progress_value: number
}
type LoadingRefs = { hide_timer_id: ReturnType<typeof setTimeout> | null }

function disconnect_observer(): void {
	const scope = globalThis as Record<string, unknown>
	const observer = scope[OBSERVER_GLOBAL_KEY] as LoadingObserver | undefined
	if (observer && typeof observer.disconnect === 'function') {
		observer.disconnect()
		scope[OBSERVER_GLOBAL_KEY] = undefined
	}
}

function set_step_impl<T extends string>(
	s: LoadingState<T>,
	messages: Partial<Record<T, string>>,
	step: T,
): void {
	s.current_step = step
	s.status_text = messages[step] ?? ''
}

function mark_ready_impl<T extends string>(s: LoadingState<T>, refs: LoadingRefs): void {
	if (refs.hide_timer_id !== null) return
	disconnect_observer()
	s.progress = READY_PROGRESS
	s.progress_value = READY_PROGRESS_VALUE
	refs.hide_timer_id = setTimeout(function on_min_display_elapsed(): void {
		s.is_visible = false
		refs.hide_timer_id = null
	}, MIN_DISPLAY_MS)
}

function reset_impl<T extends string>(
	s: LoadingState<T>,
	refs: LoadingRefs,
	messages: Partial<Record<T, string>>,
	initial_step: T,
): void {
	if (refs.hide_timer_id !== null) {
		clearTimeout(refs.hide_timer_id)
		refs.hide_timer_id = null
	}
	disconnect_observer()
	s.is_visible = true
	s.progress = INITIAL_PROGRESS
	s.progress_value = 0
	set_step_impl(s, messages, initial_step)
}

export type DefaultLoadingStep = 'downloading' | 'initializing' | 'loading_assets' | 'ready'

export function create_loading<T extends string>(initial_step: T) {
	let step_messages: Partial<Record<T, string>> = {}
	const s = $state<LoadingState<T>>({
		is_visible: true,
		current_step: initial_step,
		status_text: '',
		progress: INITIAL_PROGRESS,
		progress_value: 0,
	})
	const refs: LoadingRefs = { hide_timer_id: null }
	return {
		get is_visible() {
			return s.is_visible
		},
		get current_step() {
			return s.current_step
		},
		get status_text() {
			return s.status_text
		},
		get progress() {
			return s.progress
		},
		get progress_value() {
			return s.progress_value
		},
		configure: (messages: Record<T, string>): void => {
			step_messages = messages
		},
		set_step: (step: T): void => set_step_impl(s, step_messages, step),
		mark_ready: (): void => mark_ready_impl(s, refs),
		reset: (): void => reset_impl(s, refs, step_messages, initial_step),
	}
}

export type LoadingInstance = ReturnType<typeof create_loading>

export const loading = create_loading<DefaultLoadingStep>('downloading')
