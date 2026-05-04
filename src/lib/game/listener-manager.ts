export type ListenerSpec = {
	target: EventTarget;
	type: string;
	handler: EventListener;
	options?: AddEventListenerOptions;
};

export function create_listener_manager(specs: readonly ListenerSpec[]) {
	let cleanup_fn: (() => void) | null = null;
	return {
		get is_active(): boolean {
			return cleanup_fn !== null;
		},
		setup(on_cleanup?: () => void): () => void {
			if (cleanup_fn) return cleanup_fn;
			for (const spec of specs) spec.target.addEventListener(spec.type, spec.handler, spec.options);
			cleanup_fn = function cleanup(): void {
				for (const spec of specs)
					spec.target.removeEventListener(spec.type, spec.handler, spec.options);
				cleanup_fn = null;
				on_cleanup?.();
			};
			return cleanup_fn;
		}
	};
}

export type ListenerManager = ReturnType<typeof create_listener_manager>;
