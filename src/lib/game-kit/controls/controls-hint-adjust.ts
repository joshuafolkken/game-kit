// Per-font adjustment math for the controls-hint text (start hint + WASD/ESC/Z letters).
// A custom hint_font can differ from the default PressStart2P face in two ways that these
// helpers correct, keeping the hint line and the keyboard letters visually consistent:
//   - scale_font_size: compensates for a different cap-per-em ratio (a face whose caps fill
//     less of the em renders smaller at the same fontSize).
//   - offset_position_y: re-centers a face whose visible ink sits off-center under
//     anchorY="middle". The offset is expressed in em units (a fraction of fontSize) so a
//     single value re-centers both the hint and the differently-sized letters identically.

function scale_font_size(base_size: number, scale: number): number {
	return base_size * scale
}

function offset_position_y(base_y: number, y_offset_em: number, font_size: number): number {
	return base_y + y_offset_em * font_size
}

const controls_hint_adjust = {
	scale_font_size,
	offset_position_y,
}

export { controls_hint_adjust }
