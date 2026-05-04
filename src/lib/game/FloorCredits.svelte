<script lang="ts">
	import { Text } from '@threlte/extras';
	import { useTask } from '@threlte/core';
	import { fonts } from '$lib/game/fonts';
	import {
		CREDITS_FONT_SIZE,
		CREDITS_LINE_HEIGHT,
		CREDITS_NORMAL_COLOR,
		CREDITS_CYBER_COLOR,
		CREDITS_POSITION_Y,
		CREDITS_SCROLL_SPEED,
		CREDITS_GLOW_BLUR,
		CREDITS_GLOW_OPACITY,
		FLOOR_TEXT_ROTATION_X,
		credits_scroll
	} from './credits-config';

	interface Props {
		is_alt: boolean;
		credits: string;
		scroll_start_z: number;
		scroll_end_z: number;
	}

	let { is_alt, credits, scroll_start_z, scroll_end_z }: Props = $props();

	let current_font = $derived(fonts.get_font(is_alt));
	let color = $derived(is_alt ? CREDITS_CYBER_COLOR : CREDITS_NORMAL_COLOR);
	let scroll_z = $state(scroll_start_z);

	function tick(delta: number): void {
		scroll_z = credits_scroll.advance_scroll(
			scroll_z,
			delta,
			scroll_start_z,
			scroll_end_z,
			CREDITS_SCROLL_SPEED
		);
	}

	useTask(tick);
</script>

<Text
	text={credits}
	font={current_font}
	fontSize={CREDITS_FONT_SIZE}
	lineHeight={CREDITS_LINE_HEIGHT}
	textAlign="center"
	{color}
	anchorX="center"
	anchorY="middle"
	outlineColor={color}
	outlineBlur={CREDITS_GLOW_BLUR}
	outlineOpacity={CREDITS_GLOW_OPACITY}
	position={[0, CREDITS_POSITION_Y, scroll_z]}
	rotation={[FLOOR_TEXT_ROTATION_X, 0, 0]}
/>
