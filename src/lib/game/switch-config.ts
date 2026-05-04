export type SwitchIconType = 'cyber' | 'fullscreen' | 'fps';
export const SWITCH_ICON_TYPES: readonly SwitchIconType[] = ['cyber', 'fullscreen', 'fps'];

export const SWITCH_Y = 1.2;
export const FPS_SWITCH_Y = 2.2;
// 2x the score display wall distance: back wall=-5, score display=-4.65, distance=0.35, 2x=0.70
export const SWITCH_Z = -4.3;
export const LEFT_SWITCH_X = 1.6;
export const FULLSCREEN_SWITCH_X = 2.6;

export const PANEL_SIZE = 0.58;
export const PANEL_HALF = PANEL_SIZE / 2;
export const PANEL_DEPTH = 0.02;
export const PANEL_OPACITY_ACTIVE = 0.18;
export const PANEL_OPACITY_INACTIVE = 0.05;

export const BORDER_THICKNESS = 0.018;
export const BORDER_THICKNESS_HALF = BORDER_THICKNESS / 2;
export const BORDER_DEPTH = 0.025;
export const BORDER_POS = PANEL_HALF - BORDER_THICKNESS_HALF;

export const CYBER_OUTER_RING_R = 0.22;
export const CYBER_OUTER_RING_TUBE = 0.016;
export const CYBER_INNER_RING_R = 0.14;
export const CYBER_INNER_RING_TUBE = 0.011;
export const CYBER_RING_RADIAL = 4;
export const CYBER_RING_TUBULAR = 4;
export const CYBER_INNER_RING_ROTATION = Math.PI / 6;
export const CYBER_ORB_R = 0.045;
export const CYBER_ORB_SEGMENTS = 6;
export const CYBER_ICON_Z = 0.015;

export const CORNER_ARM = 0.1;
export const CORNER_ARM_HALF = CORNER_ARM / 2;
export const CORNER_THICKNESS = 0.015;
export const CORNER_DEPTH = 0.018;
export const CORNER_POS = 0.18;
export const CORNER_ARM_CENTER = CORNER_POS - CORNER_ARM_HALF;
export const FULLSCREEN_ICON_Z = 0.015;

export const FPS_ICON_Z = 0.015;
export const FPS_BAR_WIDTH = 0.06;
export const FPS_BAR_DEPTH = 0.015;
export const FPS_BAR_BASE_Y = -0.08;
export const FPS_BAR_1_H = 0.12;
export const FPS_BAR_2_H = 0.2;
export const FPS_BAR_3_H = 0.28;
export const FPS_BAR_X_STEP = 0.1;
export const PANEL_TEXT_Y = (FPS_BAR_BASE_Y - PANEL_HALF) / 2;
export const PANEL_TEXT_Z = 0.05;
export const PANEL_TEXT_FONT_SIZE = 0.09;

export const HIT_AREA_W = PANEL_SIZE + 0.12;
export const HIT_AREA_H = PANEL_SIZE + 0.12;
export const HIT_AREA_DEPTH = 0.01;
export const HIT_AREA_Z = 0.06;

export const LABEL_FONT_SIZE = 0.1;
export const LABEL_GAP = 0.12;
export const LABEL_Y_OFFSET = PANEL_HALF + LABEL_GAP;
export const LABEL_Z = 0.05;

export const ACTIVE_LIGHT_Z = 0.5;
export const ACTIVE_LIGHT_DISTANCE = 2.5;
export const ACTIVE_LIGHT_INTENSITY = 2.5;

export interface SwitchGeometry {
	switch_y?: number;
	switch_z?: number;
	panel_size?: number;
	panel_depth?: number;
	panel_opacity_active?: number;
	panel_opacity_inactive?: number;
	border_thickness?: number;
	border_depth?: number;
	cyber_outer_ring_r?: number;
	cyber_outer_ring_tube?: number;
	cyber_inner_ring_r?: number;
	cyber_inner_ring_tube?: number;
	cyber_ring_radial?: number;
	cyber_ring_tubular?: number;
	cyber_inner_ring_rotation?: number;
	cyber_orb_r?: number;
	cyber_orb_segments?: number;
	cyber_icon_z?: number;
	corner_arm?: number;
	corner_thickness?: number;
	corner_depth?: number;
	corner_pos?: number;
	fullscreen_icon_z?: number;
	fps_icon_z?: number;
	fps_bar_width?: number;
	fps_bar_depth?: number;
	panel_text_y?: number;
	panel_text_z?: number;
	panel_text_font_size?: number;
	hit_area_depth?: number;
	hit_area_z?: number;
	label_font_size?: number;
	label_y_offset?: number;
	label_z?: number;
	active_light_z?: number;
	active_light_distance?: number;
	active_light_intensity?: number;
}

export const DEFAULT_SWITCH_GEOMETRY: Required<SwitchGeometry> = {
	switch_y: SWITCH_Y,
	switch_z: SWITCH_Z,
	panel_size: PANEL_SIZE,
	panel_depth: PANEL_DEPTH,
	panel_opacity_active: PANEL_OPACITY_ACTIVE,
	panel_opacity_inactive: PANEL_OPACITY_INACTIVE,
	border_thickness: BORDER_THICKNESS,
	border_depth: BORDER_DEPTH,
	cyber_outer_ring_r: CYBER_OUTER_RING_R,
	cyber_outer_ring_tube: CYBER_OUTER_RING_TUBE,
	cyber_inner_ring_r: CYBER_INNER_RING_R,
	cyber_inner_ring_tube: CYBER_INNER_RING_TUBE,
	cyber_ring_radial: CYBER_RING_RADIAL,
	cyber_ring_tubular: CYBER_RING_TUBULAR,
	cyber_inner_ring_rotation: CYBER_INNER_RING_ROTATION,
	cyber_orb_r: CYBER_ORB_R,
	cyber_orb_segments: CYBER_ORB_SEGMENTS,
	cyber_icon_z: CYBER_ICON_Z,
	corner_arm: CORNER_ARM,
	corner_thickness: CORNER_THICKNESS,
	corner_depth: CORNER_DEPTH,
	corner_pos: CORNER_POS,
	fullscreen_icon_z: FULLSCREEN_ICON_Z,
	fps_icon_z: FPS_ICON_Z,
	fps_bar_width: FPS_BAR_WIDTH,
	fps_bar_depth: FPS_BAR_DEPTH,
	panel_text_y: PANEL_TEXT_Y,
	panel_text_z: PANEL_TEXT_Z,
	panel_text_font_size: PANEL_TEXT_FONT_SIZE,
	hit_area_depth: HIT_AREA_DEPTH,
	hit_area_z: HIT_AREA_Z,
	label_font_size: LABEL_FONT_SIZE,
	label_y_offset: LABEL_Y_OFFSET,
	label_z: LABEL_Z,
	active_light_z: ACTIVE_LIGHT_Z,
	active_light_distance: ACTIVE_LIGHT_DISTANCE,
	active_light_intensity: ACTIVE_LIGHT_INTENSITY
};
