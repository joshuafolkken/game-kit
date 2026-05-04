<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import { Text } from '@threlte/extras';
	import { fonts } from '$lib/game/fonts';
	import {
		SCORE_TEXT_Z,
		DISPLAY_Y,
		PANEL_W,
		PANEL_H,
		PANEL_Z_OFFSET,
		PANEL_OPACITY,
		CYBER_PANEL_COLOR,
		CYBER_PANEL_EMISSIVE,
		CYBER_PANEL_EMISSIVE_INTENSITY,
		RETRO_PANEL_COLOR,
		RETRO_PANEL_EMISSIVE,
		RETRO_PANEL_EMISSIVE_INTENSITY,
		CYBER_LABEL_COLOR,
		CYBER_VALUE_COLOR,
		RETRO_LABEL_COLOR,
		RETRO_VALUE_COLOR,
		NEW_HIGH_SCORE_COLOR,
		LABEL_FONT_SIZE,
		VALUE_FONT_SIZE,
		ROUND_VALUE_FONT_SIZE,
		HI_LABEL_Y,
		HI_VALUE_Y,
		SCORE_LABEL_Y,
		SCORE_VALUE_Y,
		ROUND_X,
		ANIM_DURATION_MS
	} from '$lib/game/score-display-config';
	import type { ScoreData } from '$lib/game/score-display-types';

	interface Props {
		score_data: ScoreData;
		is_alt: boolean;
		position_z: number;
		label_high_score: string;
		label_round: string;
		label_current: string;
	}

	let { score_data, is_alt, position_z, label_high_score, label_round, label_current }: Props =
		$props();

	let displayed_score = $state(0);
	let score_from = 0;
	let score_to = 0;
	let score_anim_ms = 0;

	let displayed_hi = $state(0);
	let hi_from = 0;
	let hi_to = 0;
	let hi_anim_ms = 0;

	function apply_anim(from: number, to: number, start_ms: number, now: number): number {
		if (from === to) return to;
		const t = Math.min(1, (now - start_ms) / ANIM_DURATION_MS);
		return Math.round(from + (to - from) * t);
	}

	function tick(): void {
		const now = Date.now();

		if (score_data.current_score !== score_to) {
			if (score_data.current_score < displayed_score) {
				displayed_score = score_data.current_score;
				score_from = score_data.current_score;
			} else {
				score_from = displayed_score;
				score_anim_ms = now;
			}
			score_to = score_data.current_score;
		}

		if (score_data.high_score !== hi_to) {
			hi_from = displayed_hi;
			hi_to = score_data.high_score;
			hi_anim_ms = now;
		}

		displayed_score = apply_anim(score_from, score_to, score_anim_ms, now);
		displayed_hi = apply_anim(hi_from, hi_to, hi_anim_ms, now);
	}

	useTask(tick);

	let current_font = $derived(fonts.get_font(is_alt));
	let font_size_multiplier = $derived(fonts.get_font_size_multiplier(is_alt));
	let panel_color = $derived(is_alt ? CYBER_PANEL_COLOR : RETRO_PANEL_COLOR);
	let panel_emissive = $derived(is_alt ? CYBER_PANEL_EMISSIVE : RETRO_PANEL_EMISSIVE);
	let panel_emissive_intensity = $derived(
		is_alt ? CYBER_PANEL_EMISSIVE_INTENSITY : RETRO_PANEL_EMISSIVE_INTENSITY
	);
	let label_color = $derived(is_alt ? CYBER_LABEL_COLOR : RETRO_LABEL_COLOR);
	let value_color = $derived(is_alt ? CYBER_VALUE_COLOR : RETRO_VALUE_COLOR);
	let label_font_size = $derived(LABEL_FONT_SIZE * font_size_multiplier);
	let value_font_size = $derived(VALUE_FONT_SIZE * font_size_multiplier);
	let round_font_size = $derived(ROUND_VALUE_FONT_SIZE * font_size_multiplier);

	let hi_value_color = $derived(score_data.is_new_high_score ? NEW_HIGH_SCORE_COLOR : value_color);
	let hi_score_text = $derived(score_data.format_score(displayed_hi));
	let current_score_text = $derived(score_data.format_score(displayed_score));
	let hi_round_text = $derived(String(score_data.high_score_round));
	let round_text = $derived(String(score_data.last_cleared_round));
</script>

<T.Group position={[0, DISPLAY_Y, position_z]}>
	<T.Mesh position.z={PANEL_Z_OFFSET}>
		<T.PlaneGeometry args={[PANEL_W, PANEL_H]} />
		<T.MeshStandardMaterial
			color={panel_color}
			emissive={panel_emissive}
			emissiveIntensity={panel_emissive_intensity}
			transparent
			opacity={PANEL_OPACITY}
		/>
	</T.Mesh>

	<Text
		text={label_high_score}
		font={current_font}
		fontSize={label_font_size}
		color={label_color}
		anchorX="center"
		anchorY="middle"
		position.y={HI_LABEL_Y}
		position.z={SCORE_TEXT_Z}
	/>
	<Text
		text={label_round}
		font={current_font}
		fontSize={label_font_size}
		color={label_color}
		anchorX="center"
		anchorY="middle"
		position.x={ROUND_X}
		position.y={HI_LABEL_Y}
		position.z={SCORE_TEXT_Z}
	/>
	<Text
		text={hi_score_text}
		font={current_font}
		fontSize={value_font_size}
		color={hi_value_color}
		anchorX="center"
		anchorY="middle"
		position.y={HI_VALUE_Y}
		position.z={SCORE_TEXT_Z}
	/>
	<Text
		text={hi_round_text}
		font={current_font}
		fontSize={round_font_size}
		color={hi_value_color}
		anchorX="center"
		anchorY="middle"
		position.x={ROUND_X}
		position.y={HI_VALUE_Y}
		position.z={SCORE_TEXT_Z}
	/>

	<Text
		text={label_current}
		font={current_font}
		fontSize={label_font_size}
		color={label_color}
		anchorX="center"
		anchorY="middle"
		position.y={SCORE_LABEL_Y}
		position.z={SCORE_TEXT_Z}
	/>
	<Text
		text={current_score_text}
		font={current_font}
		fontSize={value_font_size}
		color={value_color}
		anchorX="center"
		anchorY="middle"
		position.y={SCORE_VALUE_Y}
		position.z={SCORE_TEXT_Z}
	/>
	<Text
		text={round_text}
		font={current_font}
		fontSize={round_font_size}
		color={value_color}
		anchorX="center"
		anchorY="middle"
		position.x={ROUND_X}
		position.y={SCORE_VALUE_Y}
		position.z={SCORE_TEXT_Z}
	/>
</T.Group>
