<script lang="ts">
	import { onMount } from 'svelte';
	import { input } from '$lib/game/input.svelte';
	import { joystick_dispatch } from '$lib/game/joystick-dispatch';
	import JumpIcon from './JumpIcon.svelte';

	interface Props {
		label_jump: string;
		show_jump?: boolean;
	}

	let { label_jump, show_jump = true }: Props = $props();

	let move_zone: HTMLElement;
	let look_zone: HTMLElement;

	const MOVE_MAX_DIST = 40;
	const MOVE_DEAD_ZONE = 6;
	const TOUCH_LOOK_SENSITIVITY = 0.009;
	const FIRST_MOVE_SENSITIVITY_FRACTION = 0.2;
	const TAP_DRAG_THRESHOLD = 8;

	let move_touch_id: number | null = null;
	let move_start_x = 0;
	let move_start_y = 0;
	let move_did_drag = false;

	let look_touch_id: number | null = null;
	let look_last_x = 0;
	let look_last_y = 0;
	let look_start_x = 0;
	let look_start_y = 0;
	let look_is_first_move = false;
	let look_did_drag = false;

	function find_touch(list: TouchList, id: number): Touch | undefined {
		for (const t of list) {
			if (t.identifier === id) return t;
		}
		return undefined;
	}

	function clamp(v: number, min: number, max: number): number {
		return Math.max(min, Math.min(max, v));
	}

	function on_move_start(e: TouchEvent): void {
		if (move_touch_id !== null) return;
		const t = e.changedTouches[0];
		if (!t) return;
		move_touch_id = t.identifier;
		move_start_x = t.clientX;
		move_start_y = t.clientY;
		move_did_drag = false;
		joystick_dispatch.dispatch_pointer_down(
			t.identifier,
			look_touch_id === null,
			t.clientX,
			t.clientY
		);
	}

	function on_look_start(e: TouchEvent): void {
		if (look_touch_id !== null) return;
		if (e.target instanceof HTMLButtonElement) return;
		const t = e.changedTouches[0];
		if (!t) return;
		look_touch_id = t.identifier;
		look_last_x = t.clientX;
		look_last_y = t.clientY;
		look_start_x = t.clientX;
		look_start_y = t.clientY;
		look_is_first_move = true;
		look_did_drag = false;
		joystick_dispatch.dispatch_pointer_down(
			t.identifier,
			move_touch_id === null,
			t.clientX,
			t.clientY
		);
	}

	function apply_dead_zone(raw: number): number {
		const abs = Math.abs(raw);
		if (abs < MOVE_DEAD_ZONE) return 0;
		return Math.sign(raw) * clamp((abs - MOVE_DEAD_ZONE) / (MOVE_MAX_DIST - MOVE_DEAD_ZONE), 0, 1);
	}

	function apply_move_touch(t: Touch): void {
		if (Math.hypot(t.clientX - move_start_x, t.clientY - move_start_y) > TAP_DRAG_THRESHOLD) {
			move_did_drag = true;
		}
		input.set_joystick_move(
			apply_dead_zone(t.clientX - move_start_x),
			apply_dead_zone(move_start_y - t.clientY)
		);
	}

	function apply_look_touch(t: Touch): void {
		if (Math.hypot(t.clientX - look_start_x, t.clientY - look_start_y) > TAP_DRAG_THRESHOLD) {
			look_did_drag = true;
		}
		const sensitivity = look_is_first_move
			? TOUCH_LOOK_SENSITIVITY * FIRST_MOVE_SENSITIVITY_FRACTION
			: TOUCH_LOOK_SENSITIVITY;
		look_is_first_move = false;
		input.apply_look_delta(
			(t.clientX - look_last_x) * sensitivity,
			(t.clientY - look_last_y) * sensitivity
		);
		look_last_x = t.clientX;
		look_last_y = t.clientY;
	}

	function on_touch_move(e: TouchEvent): void {
		if (move_touch_id !== null) {
			const t = find_touch(e.changedTouches, move_touch_id);
			if (t) apply_move_touch(t);
		}
		if (look_touch_id !== null) {
			const t = find_touch(e.changedTouches, look_touch_id);
			if (t) apply_look_touch(t);
		}
	}

	function on_move_touch_end(ptr_id: number): void {
		move_touch_id = null;
		input.set_joystick_move(0, 0);
		joystick_dispatch.dispatch_pointer_up(
			ptr_id,
			look_touch_id === null,
			move_start_x,
			move_start_y,
			!move_did_drag
		);
	}

	function on_look_touch_end(ptr_id: number): void {
		look_touch_id = null;
		joystick_dispatch.dispatch_pointer_up(
			ptr_id,
			move_touch_id === null,
			look_start_x,
			look_start_y,
			!look_did_drag
		);
	}

	function cancel_touch_by_id(id: number): void {
		if (id === move_touch_id) {
			move_touch_id = null;
			input.set_joystick_move(0, 0);
			joystick_dispatch.dispatch_pointer_cancel(
				id,
				look_touch_id === null,
				move_start_x,
				move_start_y
			);
		}
		if (id === look_touch_id) {
			look_touch_id = null;
			joystick_dispatch.dispatch_pointer_cancel(
				id,
				move_touch_id === null,
				look_start_x,
				look_start_y
			);
		}
	}

	function on_touch_end(e: TouchEvent): void {
		for (const touch of e.changedTouches) {
			if (touch.identifier === move_touch_id) on_move_touch_end(touch.identifier);
			if (touch.identifier === look_touch_id) on_look_touch_end(touch.identifier);
		}
	}

	function on_touch_cancel(e: TouchEvent): void {
		for (const touch of e.changedTouches) cancel_touch_by_id(touch.identifier);
	}

	function on_jump_touch_start(e: TouchEvent): void {
		e.preventDefault();
		input.trigger_jump();
	}

	onMount(() => {
		if (!('ontouchstart' in window)) return;
		move_zone.addEventListener('touchstart', on_move_start, { passive: false });
		look_zone.addEventListener('touchstart', on_look_start, { passive: false });
		document.addEventListener('touchmove', on_touch_move, { passive: false });
		document.addEventListener('touchend', on_touch_end);
		document.addEventListener('touchcancel', on_touch_cancel);
		return () => {
			move_zone.removeEventListener('touchstart', on_move_start);
			look_zone.removeEventListener('touchstart', on_look_start);
			document.removeEventListener('touchmove', on_touch_move);
			document.removeEventListener('touchend', on_touch_end);
			document.removeEventListener('touchcancel', on_touch_cancel);
		};
	});
</script>

<div class="joystick-overlay">
	<div class="joystick-zone" aria-hidden="true" bind:this={move_zone}></div>
	<div class="joystick-zone" aria-hidden="true" bind:this={look_zone}></div>
	{#if show_jump}
		<button
			class="jump-btn"
			data-testid="jump-btn"
			aria-label={label_jump}
			onclick={() => input.trigger_jump()}
			ontouchstart={on_jump_touch_start}
		>
			<JumpIcon />
		</button>
	{/if}
</div>

<style>
	.joystick-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		pointer-events: none;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
		--jump-btn-size: 44px;
		--jump-btn-bottom: 12%;
		--jump-btn-left: 82%;
	}

	.joystick-zone {
		flex: 1;
		pointer-events: none;
		position: relative;
	}

	.jump-btn {
		position: absolute;
		bottom: var(--jump-btn-bottom);
		left: var(--jump-btn-left);
		transform: translateX(-50%);
		width: var(--jump-btn-size);
		height: var(--jump-btn-size);
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.15);
		border: 1.5px solid rgba(255, 255, 255, 0.4);
		color: rgba(255, 255, 255, 0.85);
		pointer-events: all;
		touch-action: none;
		user-select: none;
		display: none;
		align-items: center;
		justify-content: center;
	}

	@media (hover: none) and (pointer: coarse) {
		.joystick-zone {
			pointer-events: all;
			touch-action: none;
		}

		.jump-btn {
			display: flex;
			align-items: center;
			justify-content: center;
		}
	}
</style>
