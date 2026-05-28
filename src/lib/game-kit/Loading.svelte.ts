export const MIN_DISPLAY_MS = 3000
export const OVERLAY_ELEMENT_ID = 'static-loading-overlay'
export const OVERLAY_HIDDEN_CLASS = 'is-hidden'
export const OBSERVER_GLOBAL_KEY = '__loading_observer'

const READY_PROGRESS = '100%'
const INITIAL_PROGRESS = '0%'
const READY_PROGRESS_VALUE = 100

interface LoadingObserver {
	disconnect: () => void
}

interface LoadingState<T extends string> {
	is_visible: boolean
	current_step: T
	status_text: string
	progress: string
	progress_value: number
}

interface LoadingReferences {
	hide_timer_id: ReturnType<typeof setTimeout> | null
}

function disconnect_observer(): void {
	const scope = globalThis as Record<string, unknown>
	const observer = scope[OBSERVER_GLOBAL_KEY] as LoadingObserver | undefined

	if (observer && typeof observer.disconnect === 'function') {
		observer.disconnect()
		scope[OBSERVER_GLOBAL_KEY] = undefined
	}
}

function set_step_impl<T extends string>(
	state: LoadingState<T>,
	messages: Partial<Record<T, string>>,
	step: T,
): void {
	state.current_step = step
	state.status_text = messages[step] ?? ''
}

function mark_ready_impl<T extends string>(
	state: LoadingState<T>,
	references: LoadingReferences,
): void {
	if (references.hide_timer_id !== null) return
	disconnect_observer()
	state.progress = READY_PROGRESS
	state.progress_value = READY_PROGRESS_VALUE
	references.hide_timer_id = setTimeout(function on_min_display_elapsed(): void {
		state.is_visible = false
		references.hide_timer_id = null
	}, MIN_DISPLAY_MS)
}

function reset_impl<T extends string>(
	state: LoadingState<T>,
	references: LoadingReferences,
	messages: Partial<Record<T, string>>,
	initial_step: T,
): void {
	if (references.hide_timer_id !== null) {
		clearTimeout(references.hide_timer_id)
		references.hide_timer_id = null
	}

	disconnect_observer()
	state.is_visible = true
	state.progress = INITIAL_PROGRESS
	state.progress_value = 0
	set_step_impl(state, messages, initial_step)
}

export type DefaultLoadingStep = 'downloading' | 'initializing' | 'loading_assets' | 'ready'

interface LoadingApi<T extends string> {
	readonly is_visible: boolean
	readonly current_step: T
	readonly status_text: string
	readonly progress: string
	readonly progress_value: number
	configure: (messages: Record<T, string>) => void
	set_step: (step: T) => void
	mark_ready: () => void
	reset: () => void
}

export function create_loading<T extends string>(initial_step: T): LoadingApi<T> {
	let step_messages: Partial<Record<T, string>> = {}
	const state = $state<LoadingState<T>>({
		is_visible: true,
		current_step: initial_step,
		status_text: '',
		progress: INITIAL_PROGRESS,
		progress_value: 0,
	})
	const references: LoadingReferences = { hide_timer_id: null }

	return {
		get is_visible() {
			return state.is_visible
		},
		get current_step() {
			return state.current_step
		},
		get status_text() {
			return state.status_text
		},
		get progress() {
			return state.progress
		},
		get progress_value() {
			return state.progress_value
		},
		configure: (messages: Record<T, string>): void => {
			step_messages = messages
		},
		set_step: (step: T): void => {
			set_step_impl(state, step_messages, step)
		},
		mark_ready: (): void => {
			mark_ready_impl(state, references)
		},
		reset: (): void => {
			reset_impl(state, references, step_messages, initial_step)
		},
	}
}

export type LoadingInstance = ReturnType<typeof create_loading>

export const loading = create_loading<DefaultLoadingStep>('downloading')
