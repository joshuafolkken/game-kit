function override_event_offset(event: Event, offset_x: number, offset_y: number): void {
	try {
		Object.defineProperties(event, {
			offsetX: { get: () => offset_x, configurable: true },
			offsetY: { get: () => offset_y, configurable: true },
		})
	} catch {
		/* ignore browsers that disallow override */
	}
}

export { override_event_offset }
