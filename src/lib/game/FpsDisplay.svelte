<script lang="ts">
	import { useTask } from '@threlte/core';
	import { fps } from '$lib/game/fps.svelte';

	const FPS_UPDATE_INTERVAL_MS = 1000;
	const MS_PER_SECOND = 1000;

	let frame_count = 0;
	let last_time = performance.now();

	function tick(): void {
		if (!fps.is_fps_enabled) {
			frame_count = 0;
			last_time = performance.now();
			return;
		}
		frame_count++;
		const now = performance.now();
		const elapsed = now - last_time;
		if (elapsed >= FPS_UPDATE_INTERVAL_MS) {
			fps.set_fps_text(String(Math.round((frame_count * MS_PER_SECOND) / elapsed)));
			frame_count = 0;
			last_time = now;
		}
	}

	useTask(tick);
</script>
