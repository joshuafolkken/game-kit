export interface SwitchColors {
	active: string;
	inactive: string;
	active_housing: string;
	inactive_housing: string;
	active_housing_emissive: number;
	inactive_housing_emissive: number;
	active_ring_emissive: number;
	inactive_ring_emissive: number;
	active_orb_emissive: number;
	inactive_orb_emissive: number;
}

export interface ResolvedSwitchColors {
	current_color: string;
	housing_color: string;
	housing_emissive: number;
	ring_emissive: number;
	orb_emissive: number;
}

export function resolve_switch_colors(
	colors: SwitchColors,
	is_active: boolean
): ResolvedSwitchColors {
	return {
		current_color: is_active ? colors.active : colors.inactive,
		housing_color: is_active ? colors.active_housing : colors.inactive_housing,
		housing_emissive: is_active ? colors.active_housing_emissive : colors.inactive_housing_emissive,
		ring_emissive: is_active ? colors.active_ring_emissive : colors.inactive_ring_emissive,
		orb_emissive: is_active ? colors.active_orb_emissive : colors.inactive_orb_emissive
	};
}

export const CYBER_SWITCH_COLORS: SwitchColors = {
	active: '#ff00ff',
	inactive: '#00aaff',
	active_housing: '#120022',
	inactive_housing: '#001122',
	active_housing_emissive: 0.4,
	inactive_housing_emissive: 0.15,
	active_ring_emissive: 4,
	inactive_ring_emissive: 0.8,
	active_orb_emissive: 5,
	inactive_orb_emissive: 0.6
};

export const FPS_SWITCH_COLORS: SwitchColors = {
	active: '#ffdd00',
	inactive: '#665500',
	active_housing: '#1a1400',
	inactive_housing: '#0d0a00',
	active_housing_emissive: 0.4,
	inactive_housing_emissive: 0.05,
	active_ring_emissive: 4,
	inactive_ring_emissive: 0.3,
	active_orb_emissive: 5,
	inactive_orb_emissive: 0.2
};

export const FULLSCREEN_SWITCH_COLORS: SwitchColors = {
	active: '#00ff88',
	inactive: '#006644',
	active_housing: '#001a0e',
	inactive_housing: '#001a0e',
	active_housing_emissive: 0.4,
	inactive_housing_emissive: 0.05,
	active_ring_emissive: 4,
	inactive_ring_emissive: 0.3,
	active_orb_emissive: 5,
	inactive_orb_emissive: 0.2
};
