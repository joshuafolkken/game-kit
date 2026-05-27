const LEFT_MOUSE_BUTTON = 0

// eslint-disable-next-line unicorn/prevent-abbreviations -- idiomatic event-handler parameter name
function is_left_click(e: { nativeEvent: { button: number } }): boolean {
	return e.nativeEvent.button === LEFT_MOUSE_BUTTON
}

export const pointer_button = { is_left_click }
