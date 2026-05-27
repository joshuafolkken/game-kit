export interface ListenerSpec {
	target: EventTarget
	type: string
	handler: EventListener
	options?: AddEventListenerOptions
}

export function create_listener_manager(specs: ReadonlyArray<ListenerSpec>) {
	let cleanup_function: (() => void) | null = null

	return {
		get is_active(): boolean {
			return cleanup_function !== null
		},
		setup(on_cleanup?: () => void): () => void {
			if (cleanup_function) return cleanup_function
			for (const spec of specs) spec.target.addEventListener(spec.type, spec.handler, spec.options)

			cleanup_function = function cleanup(): void {
				for (const spec of specs) {
					spec.target.removeEventListener(spec.type, spec.handler, spec.options)
				}

				cleanup_function = null
				on_cleanup?.()
			}

			return cleanup_function
		},
	}
}

export type ListenerManager = ReturnType<typeof create_listener_manager>
