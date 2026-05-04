import { describe, it, expect } from 'vitest';
import {
	resolve_switch_colors,
	CYBER_SWITCH_COLORS,
	FULLSCREEN_SWITCH_COLORS,
	FPS_SWITCH_COLORS,
	type SwitchColors
} from './switch-colors.js';

const TEST_COLORS: SwitchColors = {
	active: '#aaa',
	inactive: '#bbb',
	active_housing: '#ccc',
	inactive_housing: '#ddd',
	active_housing_emissive: 0.4,
	inactive_housing_emissive: 0.1,
	active_ring_emissive: 4,
	inactive_ring_emissive: 0.5,
	active_orb_emissive: 5,
	inactive_orb_emissive: 0.2
};

describe('resolve_switch_colors', () => {
	it('returns active values when is_active is true', () => {
		const result = resolve_switch_colors(TEST_COLORS, true);
		expect(result.current_color).toBe('#aaa');
		expect(result.housing_color).toBe('#ccc');
		expect(result.housing_emissive).toBe(0.4);
		expect(result.ring_emissive).toBe(4);
		expect(result.orb_emissive).toBe(5);
	});

	it('returns inactive values when is_active is false', () => {
		const result = resolve_switch_colors(TEST_COLORS, false);
		expect(result.current_color).toBe('#bbb');
		expect(result.housing_color).toBe('#ddd');
		expect(result.housing_emissive).toBe(0.1);
		expect(result.ring_emissive).toBe(0.5);
		expect(result.orb_emissive).toBe(0.2);
	});
});

describe('CYBER_SWITCH_COLORS', () => {
	it('has cyber active color', () => {
		expect(CYBER_SWITCH_COLORS.active).toBe('#ff00ff');
	});

	it('has normal inactive color', () => {
		expect(CYBER_SWITCH_COLORS.inactive).toBe('#00aaff');
	});

	it('resolves correctly when active', () => {
		const result = resolve_switch_colors(CYBER_SWITCH_COLORS, true);
		expect(result.current_color).toBe('#ff00ff');
		expect(result.housing_color).toBe('#120022');
		expect(result.housing_emissive).toBe(0.4);
		expect(result.ring_emissive).toBe(4);
		expect(result.orb_emissive).toBe(5);
	});

	it('resolves correctly when inactive', () => {
		const result = resolve_switch_colors(CYBER_SWITCH_COLORS, false);
		expect(result.current_color).toBe('#00aaff');
		expect(result.housing_color).toBe('#001122');
		expect(result.housing_emissive).toBe(0.15);
		expect(result.ring_emissive).toBe(0.8);
		expect(result.orb_emissive).toBe(0.6);
	});
});

describe('FULLSCREEN_SWITCH_COLORS', () => {
	it('has fullscreen active color', () => {
		expect(FULLSCREEN_SWITCH_COLORS.active).toBe('#00ff88');
	});

	it('has fullscreen inactive color', () => {
		expect(FULLSCREEN_SWITCH_COLORS.inactive).toBe('#006644');
	});

	it('resolves correctly when active', () => {
		const result = resolve_switch_colors(FULLSCREEN_SWITCH_COLORS, true);
		expect(result.current_color).toBe('#00ff88');
		expect(result.housing_emissive).toBe(0.4);
		expect(result.ring_emissive).toBe(4);
		expect(result.orb_emissive).toBe(5);
	});

	it('resolves correctly when inactive', () => {
		const result = resolve_switch_colors(FULLSCREEN_SWITCH_COLORS, false);
		expect(result.current_color).toBe('#006644');
		expect(result.housing_emissive).toBe(0.05);
		expect(result.ring_emissive).toBe(0.3);
		expect(result.orb_emissive).toBe(0.2);
	});
});

describe('FPS_SWITCH_COLORS', () => {
	it('has fps active color', () => {
		expect(FPS_SWITCH_COLORS.active).toBe('#ffdd00');
	});

	it('has fps inactive color', () => {
		expect(FPS_SWITCH_COLORS.inactive).toBe('#665500');
	});

	it('resolves correctly when active', () => {
		const result = resolve_switch_colors(FPS_SWITCH_COLORS, true);
		expect(result.current_color).toBe('#ffdd00');
		expect(result.housing_emissive).toBe(0.4);
		expect(result.ring_emissive).toBe(4);
		expect(result.orb_emissive).toBe(5);
	});

	it('resolves correctly when inactive', () => {
		const result = resolve_switch_colors(FPS_SWITCH_COLORS, false);
		expect(result.current_color).toBe('#665500');
		expect(result.housing_emissive).toBe(0.05);
		expect(result.ring_emissive).toBe(0.3);
		expect(result.orb_emissive).toBe(0.2);
	});
});
